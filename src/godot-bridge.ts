import { randomUUID } from 'node:crypto';
import type { RawData } from 'ws';
import { WebSocket, WebSocketServer } from 'ws';

const DEFAULT_PORT = 6505;
const DEFAULT_TIMEOUT_MS = 30_000;
const KEEPALIVE_INTERVAL_MS = 10_000;
const SECOND_CONNECTION_CLOSE_CODE = 4000;

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

export class GodotBridge {
  private server: WebSocketServer | null = null;
  private socket: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private connectionInfo: GodotConnectionInfo | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private resourceQueues = new Map<string, Promise<void>>();

  public constructor(
    private readonly port: number = DEFAULT_PORT,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  public start(): Promise<void> {
    if (this.server) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this.port });
      let settled = false;

      wss.once('listening', () => {
        settled = true;
        this.server = wss;
        this.log('info', `WebSocket bridge listening on port ${this.port}`);
        resolve();
      });

      wss.once('error', (error) => {
        if (!settled) {
          settled = true;
          reject(error);
          return;
        }

        this.log('error', `WebSocket server error: ${error.message}`);
      });

      wss.on('connection', (socket) => {
        this.handleConnection(socket);
      });
    });
  }

  public stop(): void {
    this.stopKeepalive();
    this.rejectAllPending(new Error('GodotBridge stopped'));
    this.resourceQueues.clear();

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
      }
      this.socket = null;
    }

    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.connectionInfo = null;
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
        this.log('debug', `Tool ${pending.toolName} finished in ${Date.now() - pending.startedAt}ms`);

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

    this.rejectAllPending(reason);
    this.resourceQueues.clear();
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
    defaultBridge = new GodotBridge();
  }

  return defaultBridge;
}

export function createBridge(port?: number, timeoutMs?: number): GodotBridge {
  return new GodotBridge(port, timeoutMs);
}
