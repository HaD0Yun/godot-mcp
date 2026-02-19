import { createConnection, type Socket } from 'node:net';

interface PendingRequest {
  resolve: (value: DAPBody | PromiseLike<DAPBody>) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
}

interface DAPMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
  command?: string;
  arguments?: unknown;
  request_seq?: number;
  success?: boolean;
  message?: string;
  body?: Record<string, unknown>;
  event?: string;
}

type DAPBody = Record<string, unknown>;

type DAPArrayItem = Record<string, unknown>;

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type ToolResponse = { content: Array<{ type: string; text: string }> };

type ToolArgs = {
  scriptPath?: unknown;
  line?: unknown;
};

export class GodotDAPClient {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private port: number;
  private host: string;
  private seq: number = 1;
  private pendingRequests: Map<number, PendingRequest>;
  private buffer: string = '';
  private outputBuffer: string[] = [];
  private maxOutputLines: number = 1000;
  private initialized: boolean = false;
  private attached: boolean = false;
  private lastThreadId: number = 1;
  private breakpoints: Map<string, Set<number>> = new Map();

  constructor(port: number = 6006, host: string = '127.0.0.1') {
    this.port = port;
    this.host = host;
    this.pendingRequests = new Map();
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: this.host, port: this.port });
      this.socket = socket;

      socket.setEncoding('utf8');

      const connectTimeout = setTimeout(() => {
        socket.destroy();
        this.socket = null;
        reject(
          new Error(
            `Could not connect to Godot DAP server at ${this.host}:${this.port}. ` +
              'Make sure Godot is running with debug/DAP enabled.'
          )
        );
      }, 3000);

      const handleConnect = (): void => {
        clearTimeout(connectTimeout);
        this.connected = true;

        socket.on('data', (chunk: string) => {
          this.buffer += chunk;
          this.parseMessages();
        });

        socket.on('error', (error: Error) => {
          this.failPendingRequests(error);
        });

        socket.on('close', () => {
          this.connected = false;
          this.initialized = false;
          this.attached = false;
          this.socket = null;
          this.failPendingRequests(new Error('DAP connection closed'));
        });

        resolve();
      };

      const handleError = (error: Error): void => {
        clearTimeout(connectTimeout);
        this.socket = null;
        reject(
          new Error(
            `Could not connect to Godot DAP server at ${this.host}:${this.port}: ${error.message}`
          )
        );
      };

      socket.once('connect', handleConnect);
      socket.once('error', handleError);
    });
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      this.connected = false;
      this.initialized = false;
      this.attached = false;
      return;
    }

    if (this.connected) {
      try {
        await this.sendRequest('disconnect', { restart: false });
      } catch {}
    }

    await new Promise<void>((resolve) => {
      const socket = this.socket;
      if (!socket) {
        resolve();
        return;
      }

      socket.once('close', () => resolve());
      socket.end();
      setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
        }
        resolve();
      }, 500);
    });

    this.socket = null;
    this.connected = false;
    this.initialized = false;
    this.attached = false;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  private async sendRequest(command: string, args?: Record<string, unknown>): Promise<DAPBody> {
    await this.ensureConnected();

    if (!this.socket) {
      throw new Error('DAP socket is not available');
    }

    const requestSeq = this.seq++;
    const request: DAPMessage = {
      seq: requestSeq,
      type: 'request',
      command,
      arguments: args,
    };

    const payload = this.frameMessage(JSON.stringify(request));

    return await new Promise<DAPBody>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestSeq);
        reject(new Error(`DAP request timed out: ${command}`));
      }, 10000);

      this.pendingRequests.set(requestSeq, { resolve, reject, timer });

      this.socket?.write(payload, (error?: Error | null) => {
        if (error) {
          clearTimeout(timer);
          this.pendingRequests.delete(requestSeq);
          reject(new Error(`Failed to send DAP request '${command}': ${error.message}`));
        }
      });
    });
  }

  private frameMessage(content: string): string {
    return `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n${content}`;
  }

  private parseMessages(): void {
    while (true) {
      const headerEndIndex = this.buffer.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        return;
      }

      const headerText = this.buffer.slice(0, headerEndIndex);
      const headerLines = headerText.split('\r\n');

      let contentLength = -1;
      for (const line of headerLines) {
        const [rawKey, rawValue] = line.split(':');
        if (!rawKey || !rawValue) {
          continue;
        }

        if (rawKey.trim().toLowerCase() === 'content-length') {
          const parsedLength = Number.parseInt(rawValue.trim(), 10);
          if (!Number.isNaN(parsedLength) && parsedLength >= 0) {
            contentLength = parsedLength;
          }
        }
      }

      if (contentLength < 0) {
        this.buffer = this.buffer.slice(headerEndIndex + 4);
        continue;
      }

      const totalMessageLength = headerEndIndex + 4 + contentLength;
      if (this.buffer.length < totalMessageLength) {
        return;
      }

      const bodyText = this.buffer.slice(headerEndIndex + 4, totalMessageLength);
      this.buffer = this.buffer.slice(totalMessageLength);

      let message: DAPMessage;
      try {
        message = JSON.parse(bodyText) as DAPMessage;
      } catch {
        continue;
      }

      if (message.type === 'response') {
        const requestSeq = message.request_seq;
        if (typeof requestSeq !== 'number') {
          continue;
        }

        const pending = this.pendingRequests.get(requestSeq);
        if (!pending) {
          continue;
        }

        clearTimeout(pending.timer);
        this.pendingRequests.delete(requestSeq);

        if (message.success) {
          pending.resolve(message.body ?? {});
        } else {
          const errorText =
            typeof message.message === 'string'
              ? message.message
              : `DAP request failed: ${message.command ?? 'unknown command'}`;
          pending.reject(new Error(errorText));
        }
      } else if (message.type === 'event') {
        this.handleEvent(message);
      }
    }
  }

  private handleEvent(event: DAPMessage): void {
    const eventName = event.event;
    if (eventName === 'output') {
      const body = event.body;
      const outputText = typeof body?.output === 'string' ? body.output : '';

      if (outputText.length > 0) {
        const lines = outputText.split(/\r?\n/).filter((line: string) => line.length > 0);
        this.outputBuffer.push(...lines);
      }

      if (this.outputBuffer.length > this.maxOutputLines) {
        this.outputBuffer = this.outputBuffer.slice(this.outputBuffer.length - this.maxOutputLines);
      }
      return;
    }

    if (eventName === 'stopped') {
      const body = event.body;
      const threadId = body?.threadId;
      if (typeof threadId === 'number') {
        this.lastThreadId = threadId;
      }
      return;
    }

    if (eventName === 'terminated' || eventName === 'exited') {
      this.attached = false;
    }
  }

  async initialize(): Promise<DAPBody> {
    await this.ensureConnected();

    if (this.initialized) {
      return {};
    }

    const response = await this.sendRequest('initialize', {
      adapterID: 'godot',
      clientID: 'godot-mcp',
      clientName: 'godot-mcp',
      locale: 'en',
      linesStartAt1: true,
      columnsStartAt1: true,
      pathFormat: 'path',
      supportsVariableType: true,
      supportsRunInTerminalRequest: false,
      supportsProgressReporting: false,
      supportsInvalidatedEvent: false,
      supportsMemoryReferences: false,
    });

    this.initialized = true;
    return response;
  }

  async attach(): Promise<void> {
    await this.ensureConnected();

    if (this.attached) {
      return;
    }

    await this.initialize();
    await this.sendRequest('attach', {});
    await this.sendRequest('configurationDone', {});
    this.attached = true;
  }

  getOutput(clear: boolean = false): string[] {
    const lines = [...this.outputBuffer];
    if (clear) {
      this.outputBuffer = [];
    }
    return lines;
  }

  async setBreakpoint(filePath: string, line: number): Promise<DAPBody> {
    await this.attach();

    const fileBreakpoints = this.breakpoints.get(filePath) ?? new Set<number>();
    fileBreakpoints.add(line);
    this.breakpoints.set(filePath, fileBreakpoints);

    const lines = Array.from(fileBreakpoints).sort((a, b) => a - b);
    return await this.sendRequest('setBreakpoints', {
      source: { path: filePath },
      breakpoints: lines.map((breakpointLine) => ({ line: breakpointLine })),
    });
  }

  async removeBreakpoint(filePath: string, line: number): Promise<DAPBody> {
    await this.attach();

    const fileBreakpoints = this.breakpoints.get(filePath) ?? new Set<number>();
    fileBreakpoints.delete(line);

    if (fileBreakpoints.size === 0) {
      this.breakpoints.delete(filePath);
    } else {
      this.breakpoints.set(filePath, fileBreakpoints);
    }

    const remaining = Array.from(fileBreakpoints).sort((a, b) => a - b);
    return await this.sendRequest('setBreakpoints', {
      source: { path: filePath },
      breakpoints: remaining.map((breakpointLine) => ({ line: breakpointLine })),
    });
  }

  async continue(threadId?: number): Promise<void> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    await this.sendRequest('continue', { threadId: resolvedThreadId });
  }

  async pause(threadId?: number): Promise<void> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    await this.sendRequest('pause', { threadId: resolvedThreadId });
  }

  async stepOver(threadId?: number): Promise<void> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    await this.sendRequest('next', { threadId: resolvedThreadId });
  }

  async getStackTrace(threadId?: number): Promise<DAPArrayItem[]> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    const response = await this.sendRequest('stackTrace', {
      threadId: resolvedThreadId,
      startFrame: 0,
      levels: 100,
    });

    if (Array.isArray(response?.stackFrames)) {
      return response.stackFrames;
    }

    return [];
  }

  async getVariables(variablesReference: number): Promise<DAPArrayItem[]> {
    await this.attach();
    const response = await this.sendRequest('variables', { variablesReference });
    if (Array.isArray(response?.variables)) {
      return response.variables;
    }

    return [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async resolveThreadId(threadId?: number): Promise<number> {
    if (typeof threadId === 'number' && threadId > 0) {
      this.lastThreadId = threadId;
      return threadId;
    }

    if (this.lastThreadId > 0) {
      return this.lastThreadId;
    }

    try {
      const response = await this.sendRequest('threads');
      const threads = response?.threads;
      if (Array.isArray(threads) && threads.length > 0) {
        const firstThread = threads[0];
        const id = firstThread?.id;
        if (typeof id === 'number' && id > 0) {
          this.lastThreadId = id;
          return id;
        }
      }
    } catch {}

    return 1;
  }

  private failPendingRequests(error: Error): void {
    this.pendingRequests.forEach((pending, seq) => {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(seq);
    });
  }
}

export function createDAPTools(): ToolDefinition[] {
  return [
    {
      name: 'dap_get_output',
      description: 'Get captured Godot DAP console output lines',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'dap_set_breakpoint',
      description: 'Set a breakpoint in a Godot script at a specific line',
      inputSchema: {
        type: 'object',
        properties: {
          scriptPath: { type: 'string', description: 'Absolute or project-relative script path' },
          line: { type: 'number', description: '1-based line number' },
        },
        required: ['scriptPath', 'line'],
        additionalProperties: false,
      },
    },
    {
      name: 'dap_remove_breakpoint',
      description: 'Remove a breakpoint in a Godot script at a specific line',
      inputSchema: {
        type: 'object',
        properties: {
          scriptPath: { type: 'string', description: 'Absolute or project-relative script path' },
          line: { type: 'number', description: '1-based line number' },
        },
        required: ['scriptPath', 'line'],
        additionalProperties: false,
      },
    },
    {
      name: 'dap_continue',
      description: 'Continue execution after a breakpoint or pause',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'dap_pause',
      description: 'Pause execution of the running Godot debug target',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'dap_step_over',
      description: 'Step over the current line in the debugger',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'dap_get_stack_trace',
      description: 'Get the current stack trace from the Godot debugger',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  ];
}

export async function handleDAPTool(
  client: GodotDAPClient,
  toolName: string,
  args: unknown
): Promise<ToolResponse> {
  const safeArgs: ToolArgs = args && typeof args === 'object' ? (args as ToolArgs) : {};

  try {
    switch (toolName) {
      case 'dap_get_output': {
        const output = client.getOutput(false);
        return {
          content: [
            {
              type: 'text',
              text: output.length > 0 ? output.join('\n') : 'No DAP output captured yet.',
            },
          ],
        };
      }

      case 'dap_set_breakpoint': {
        if (typeof safeArgs.scriptPath !== 'string' || typeof safeArgs.line !== 'number') {
          throw new Error('dap_set_breakpoint requires { scriptPath: string, line: number }');
        }

        const result = await client.setBreakpoint(safeArgs.scriptPath, safeArgs.line);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'dap_remove_breakpoint': {
        if (typeof safeArgs.scriptPath !== 'string' || typeof safeArgs.line !== 'number') {
          throw new Error('dap_remove_breakpoint requires { scriptPath: string, line: number }');
        }

        const result = await client.removeBreakpoint(safeArgs.scriptPath, safeArgs.line);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'dap_continue': {
        await client.continue();
        return {
          content: [{ type: 'text', text: 'Execution continued.' }],
        };
      }

      case 'dap_pause': {
        await client.pause();
        return {
          content: [{ type: 'text', text: 'Execution paused.' }],
        };
      }

      case 'dap_step_over': {
        await client.stepOver();
        return {
          content: [{ type: 'text', text: 'Step-over completed.' }],
        };
      }

      case 'dap_get_stack_trace': {
        const stack = await client.getStackTrace();
        return {
          content: [{ type: 'text', text: JSON.stringify(stack, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown DAP tool: ${toolName}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text:
            `DAP tool '${toolName}' failed: ${message}. ` +
            'If Godot is not running in debug mode, start it with DAP enabled and retry.',
        },
      ],
    };
  }
}
