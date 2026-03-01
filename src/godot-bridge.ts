import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';

const DEFAULT_PORT = 6505;
const DEFAULT_TIMEOUT_MS = 30_000;
const KEEPALIVE_INTERVAL_MS = 10_000;
const SECOND_CONNECTION_CLOSE_CODE = 4000;
const BRIDGE_PORT_ENV_KEYS = ['GODOT_BRIDGE_PORT', 'MCP_BRIDGE_PORT', 'GOPEAK_BRIDGE_PORT'] as const;

function resolveDefaultBridgePort(): number {
  for (const key of BRIDGE_PORT_ENV_KEYS) {
    const raw = process.env[key];
    if (!raw || raw.trim().length === 0) {
      continue;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
      return parsed;
    }

    console.error(`[GodotBridge] Ignoring invalid ${key}="${raw}". Expected an integer between 1 and 65535.`);
  }

  return DEFAULT_PORT;
}

export interface ToolInvokeMessage {
  type: 'tool_invoke';
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResultMessage {
  type: 'tool_result';
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface PingMessage {
  type: 'ping';
}

export interface PongMessage {
  type: 'pong';
}

export interface GodotReadyMessage {
  type: 'godot_ready';
  project_path: string;
}

type IncomingMessage = ToolResultMessage | PongMessage | GodotReadyMessage;
type OutgoingMessage = ToolInvokeMessage | PingMessage;

type BridgeEventMap = {
  tool_start: { tool: string; id: string; args: Record<string, unknown> };
  tool_end: { tool: string; id: string; success: boolean; duration: number };
  godot_connected: { projectPath?: string };
  godot_disconnected: Record<string, never>;
};

interface PendingRequest {
  toolName: string;
  timeout: NodeJS.Timeout;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  startedAt: number;
  resourceKey?: string;
}

interface GodotConnectionInfo {
  projectPath?: string;
  connectedAt: Date;
  lastPongAt?: Date;
}

interface BridgeStatus {
  port: number;
  connected: boolean;
  projectPath?: string;
  connectedAt?: Date;
  lastPongAt?: Date;
  pendingRequests: number;
  queuedResources: number;
}

export class GodotBridge extends EventEmitter {
  private httpServer: http.Server | null = null;
  private godotWss: WebSocketServer | null = null;
  private vizWss: WebSocketServer | null = null;
  private socket: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionInfo: GodotConnectionInfo | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private resourceQueues = new Map<string, Promise<void>>();
  private visualizerHtml = this.getDefaultVisualizerHtml();

  public constructor(
    private readonly port: number = DEFAULT_PORT,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    super();
  }

  public start(): Promise<void> {
    if (this.httpServer) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });
      const godotWss = new WebSocketServer({ noServer: true });
      const vizWss = new WebSocketServer({ noServer: true });
      let settled = false;

      server.on('upgrade', (request, socket, head) => {
        const pathname = this.getRequestPathname(request.url);
        const target = pathname === '/godot' ? godotWss : vizWss;

        target.handleUpgrade(request, socket, head, (ws) => {
          target.emit('connection', ws, request);
        });
      });

      godotWss.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      server.once('listening', () => {
        settled = true;
        this.httpServer = server;
        this.godotWss = godotWss;
        this.vizWss = vizWss;
        this.log('info', `Unified HTTP+WS bridge listening on port ${this.port}`);
        resolve();
      });

      server.once('error', (error) => {
        if (!settled) {
          settled = true;
          reject(error);
          return;
        }

        this.log('error', `HTTP server error: ${error.message}`);
      });

      godotWss.on('error', (error) => {
        this.log('error', `Godot WebSocket server error: ${error.message}`);
      });

      vizWss.on('error', (error) => {
        this.log('error', `Visualizer WebSocket server error: ${error.message}`);
      });

      server.listen(this.port);
    });
  }

  public async stop(): Promise<void> {
    this.stopKeepalive();
    this.rejectAllPending(new Error('GodotBridge stopped'));
    this.resourceQueues.clear();
    const closeTasks: Array<Promise<void>> = [];

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
      }
      this.socket = null;
    }

    if (this.godotWss) {
      const godotWss = this.godotWss;
      for (const client of godotWss.clients) {
        try {
          client.close();
        } catch {
        }
      }
      closeTasks.push(this.closeWebSocketServer(godotWss));
      this.godotWss = null;
    }

    if (this.vizWss) {
      const vizWss = this.vizWss;
      for (const client of vizWss.clients) {
        try {
          client.close();
        } catch {
        }
      }
      closeTasks.push(this.closeWebSocketServer(vizWss));
      this.vizWss = null;
    }

    if (this.httpServer) {
      const httpServer = this.httpServer;
      closeTasks.push(this.closeHttpServer(httpServer));
      this.httpServer = null;
    }

    await Promise.all(closeTasks);

    this.connectionInfo = null;
    this.visualizerHtml = this.getDefaultVisualizerHtml();
    this.log('info', 'WebSocket bridge stopped');
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public getStatus(): BridgeStatus {
    return {
      port: this.port,
      connected: this.isConnected(),
      projectPath: this.connectionInfo?.projectPath,
      connectedAt: this.connectionInfo?.connectedAt,
      lastPongAt: this.connectionInfo?.lastPongAt,
      pendingRequests: this.pendingRequests.size,
      queuedResources: this.resourceQueues.size,
    };
  }

  public invokeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const resourceKey = this.getResourceKey(args);
    if (!resourceKey) {
      return this.invokeToolDirect(toolName, args);
    }

    return this.enqueueResourceRequest(resourceKey, () => this.invokeToolDirect(toolName, args, resourceKey));
  }

  public getVisualizerWss(): WebSocketServer | null {
    return this.vizWss;
  }

  public broadcastToVisualizer(message: object): void {
    if (!this.vizWss) {
      return;
    }

    const payload = JSON.stringify(message);
    this.vizWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  public setVisualizerHtml(html: string): void {
    this.visualizerHtml = html;
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && (this.getRequestPathname(req.url) === '/' || this.getRequestPathname(req.url) === '/mcp')) {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body) as { method?: unknown; id?: unknown; params?: { protocolVersion?: unknown } };
          if (parsed.method === 'initialize') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: typeof parsed.id === 'number' || typeof parsed.id === 'string' ? parsed.id : 1,
              result: {
                protocolVersion: typeof parsed.params?.protocolVersion === 'string' ? parsed.params.protocolVersion : '2025-06-18',
                capabilities: {},
                serverInfo: { name: 'godot-mcp', version: '2.0.1' },
              },
            }));
            return;
          }

          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Unsupported method' }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const pathname = this.getRequestPathname(req.url);
    if (pathname === '/health') {
      const payload = {
        status: 'ok',
        serverName: 'godot-mcp',
        version: '2.0.1',
        bridge: this.getStatus(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(payload));
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(this.visualizerHtml);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  private getRequestPathname(url: string | undefined): string {
    try {
      return new URL(url ?? '/', `http://localhost:${this.port}`).pathname;
    } catch {
      return '/';
    }
  }

  private closeWebSocketServer(server: WebSocketServer): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      try {
        server.close(() => {
          finish();
        });
      } catch {
        finish();
      }
    });
  }

  private closeHttpServer(server: http.Server): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      try {
        server.close(() => {
          finish();
        });
      } catch {
        finish();
      }
    });
  }

  private handleConnection(nextSocket: WebSocket): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.log('warn', 'Rejecting second Godot connection');
      nextSocket.close(SECOND_CONNECTION_CLOSE_CODE, 'Godot already connected');
      return;
    }

    this.socket = nextSocket;
    this.connectionInfo = {
      connectedAt: new Date(),
    };

    this.startKeepalive();
    this.log('info', 'Godot editor connected');
    this.emitBridgeEvent('godot_connected', { projectPath: this.connectionInfo.projectPath });

    nextSocket.on('message', (data) => {
      this.handleRawMessage(data);
    });

    nextSocket.on('close', (code, reasonBuffer) => {
      const reason = reasonBuffer.toString();
      this.log('warn', `Godot disconnected (code=${code}, reason=${reason || 'none'})`);
      this.handleDisconnect(new Error('Godot disconnected during request'));
    });

    nextSocket.on('error', (error) => {
      this.log('error', `WebSocket error: ${error.message}`);
    });
  }

  private handleRawMessage(data: RawData): void {
    let parsed: unknown;

    try {
      parsed = JSON.parse(data.toString());
    } catch (error) {
      this.log('error', `Invalid JSON from Godot: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    if (!this.isIncomingMessage(parsed)) {
      this.log('warn', 'Ignoring unknown Godot message payload');
      return;
    }

    this.handleMessage(parsed);
  }

  private handleMessage(message: IncomingMessage): void {
    switch (message.type) {
      case 'tool_result': {
        const pending = this.pendingRequests.get(message.id);
        if (!pending) {
          this.log('warn', `Received tool_result for unknown id=${message.id}`);
          return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        const duration = Date.now() - pending.startedAt;
        this.log('debug', `Tool ${pending.toolName} finished in ${duration}ms`);
        this.emitBridgeEvent('tool_end', {
          tool: pending.toolName,
          id: message.id,
          success: message.success,
          duration,
        });

        if (message.success) {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error ?? `Tool ${pending.toolName} failed`));
        }
        return;
      }

      case 'godot_ready':
        if (this.connectionInfo) {
          this.connectionInfo.projectPath = message.project_path;
          this.log('info', `Godot ready: ${message.project_path}`);
          this.emitBridgeEvent('godot_connected', { projectPath: message.project_path });
        }
        return;

      case 'pong':
        if (this.connectionInfo) {
          this.connectionInfo.lastPongAt = new Date();
        }
        return;
    }
  }

  private invokeToolDirect(
    toolName: string,
    args: Record<string, unknown>,
    resourceKey?: string,
  ): Promise<unknown> {
    if (!this.isConnected()) {
      return Promise.reject(new Error('Godot is not connected'));
    }

    const requestId = randomUUID();
    const message: ToolInvokeMessage = {
      type: 'tool_invoke',
      id: requestId,
      tool: toolName,
      args,
    };

    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Tool ${toolName} timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.pendingRequests.set(requestId, {
        toolName,
        timeout,
        resolve,
        reject,
        startedAt: Date.now(),
        resourceKey,
      });

      this.emitBridgeEvent('tool_start', {
        tool: toolName,
        id: requestId,
        args,
      });

      try {
        this.sendMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  private sendMessage(message: OutgoingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Godot is not connected');
    }

    this.socket.send(JSON.stringify(message));
  }

  private startKeepalive(): void {
    this.stopKeepalive();

    this.pingInterval = setInterval(() => {
      if (!this.isConnected()) {
        return;
      }

      try {
        const ping: PingMessage = { type: 'ping' };
        this.sendMessage(ping);
      } catch (error) {
        this.log('warn', `Failed to send ping: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepalive(): void {
    if (!this.pingInterval) {
      return;
    }

    clearInterval(this.pingInterval);
    this.pingInterval = null;
  }

  private handleDisconnect(reason: Error): void {
    this.stopKeepalive();

    this.socket = null;
    this.connectionInfo = null;
    this.emitBridgeEvent('godot_disconnected', {});

    this.rejectAllPending(reason);
    this.resourceQueues.clear();
  }

  private emitBridgeEvent<K extends keyof BridgeEventMap>(eventName: K, payload: BridgeEventMap[K]): void {
    this.emit(eventName, payload);
  }

  private getDefaultVisualizerHtml(): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Godot MCP Visualizer</title>
  </head>
  <body>
    <h1>Godot MCP Visualizer</h1>
    <p>Run the map_project tool to load visualization data.</p>
  </body>
</html>`;
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }

    this.pendingRequests.clear();
  }

  private enqueueResourceRequest<T>(resourceKey: string, task: () => Promise<T>): Promise<T> {
    const previous = this.resourceQueues.get(resourceKey) ?? Promise.resolve();

    const taskPromise = previous.catch(() => undefined).then(task);

    const tail = taskPromise.then(() => undefined, () => undefined);
    this.resourceQueues.set(resourceKey, tail);

    return taskPromise.finally(() => {
      if (this.resourceQueues.get(resourceKey) === tail) {
        this.resourceQueues.delete(resourceKey);
      }
    });
  }

  private getResourceKey(args: Record<string, unknown>): string | undefined {
    const scenePath = this.getStringArg(args, 'scenePath') ?? this.getStringArg(args, 'scene_path');
    if (scenePath) {
      return `scene:${scenePath}`;
    }

    const resourcePath = this.getStringArg(args, 'resourcePath') ?? this.getStringArg(args, 'resource_path');
    if (resourcePath) {
      return `resource:${resourcePath}`;
    }

    return undefined;
  }

  private getStringArg(args: Record<string, unknown>, key: string): string | undefined {
    const value = args[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private isIncomingMessage(value: unknown): value is IncomingMessage {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const message = value as Record<string, unknown>;
    const type = message.type;
    if (type !== 'tool_result' && type !== 'pong' && type !== 'godot_ready') {
      return false;
    }

    if (type === 'pong') {
      return true;
    }

    if (type === 'godot_ready') {
      return typeof message.project_path === 'string';
    }

    return (
      typeof message.id === 'string' &&
      typeof message.success === 'boolean' &&
      (message.error === undefined || typeof message.error === 'string')
    );
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    console.error(`[${new Date().toISOString()}] [GodotBridge:${level.toUpperCase()}] ${message}`);
  }
}

let defaultBridge: GodotBridge | null = null;

export function getDefaultBridge(): GodotBridge {
  if (!defaultBridge) {
    defaultBridge = new GodotBridge(resolveDefaultBridgePort());
  }

  return defaultBridge;
}

export function createBridge(port?: number, timeoutMs?: number): GodotBridge {
  return new GodotBridge(port, timeoutMs);
}
