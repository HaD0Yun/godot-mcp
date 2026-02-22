import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import {
  refreshMap,
  createScriptFile,
  modifyVariable,
  modifySignal,
  modifyFunction,
  deleteFunction,
  findUsages,
} from './gdscript_parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let vizServer: http.Server | null = null;
let wss: WebSocketServer | null = null;
let currentProjectPath: string | null = null;
const DEFAULT_PORT = 6510;

export function setProjectPath(projectPath: string): void {
  currentProjectPath = projectPath;
}

export async function serveVisualization(projectData: unknown): Promise<string> {
  if (vizServer) {
    if (wss) { wss.close(); wss = null; }
    vizServer.close();
    vizServer = null;
  }

  const htmlPath = path.join(__dirname, 'visualizer.html');
  let html: string;
  try {
    html = fs.readFileSync(htmlPath, 'utf-8');
  } catch {
    throw new Error(`Visualizer HTML template not found at ${htmlPath}`);
  }

  const dataJson = JSON.stringify(projectData);
  html = html.replace('"%%PROJECT_DATA%%"', dataJson);

  const port = await findPort(DEFAULT_PORT);

  return new Promise((resolve, reject) => {
    vizServer = http.createServer((_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(html);
    });

    wss = new WebSocketServer({ server: vizServer });
    wss.on('connection', handleVisualizerConnection);

    vizServer.on('error', (err) => {
      reject(new Error(`Failed to start visualizer server: ${err.message}`));
    });

    vizServer.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.error(`[visualizer] Serving at ${url}`);
      openBrowser(url);
      resolve(url);
    });
  });
}

function handleVisualizerConnection(ws: WebSocket): void {
  console.error('[visualizer] Browser connected via WebSocket');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const result = await handleInternalCommand(message);
      ws.send(JSON.stringify({ id: message.id, ...result }));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      ws.send(JSON.stringify({ error: errMsg }));
    }
  });

  ws.on('close', () => {
    console.error('[visualizer] Browser disconnected');
  });
}

type CommandHandler = (projectPath: string, args: Record<string, unknown>) =>
  { ok: boolean; [key: string]: unknown };

const COMMAND_MAP: Record<string, CommandHandler> = {
  refresh_map: (pp, args) => refreshMap(pp, args) as { ok: boolean; [key: string]: unknown },
  create_script_file: (pp, args) => createScriptFile(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_variable: (pp, args) => modifyVariable(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_signal: (pp, args) => modifySignal(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_function: (pp, args) => modifyFunction(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_function_delete: (pp, args) => deleteFunction(pp, args) as { ok: boolean; [key: string]: unknown },
  find_usages: (pp, args) => findUsages(pp, args) as { ok: boolean; [key: string]: unknown },
};

async function handleInternalCommand(message: {
  id?: number;
  command: string;
  args: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  const { command, args } = message;

  if (!currentProjectPath) {
    return { ok: false, error: 'No project path set. Call map_project first.' };
  }

  console.error(`[visualizer] Internal command: ${command}`);

  const handler = COMMAND_MAP[command];
  if (handler) {
    try {
      return handler(currentProjectPath, args);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      return { ok: false, error: errMsg };
    }
  }

  return { ok: false, error: `Unknown command: ${command}` };
}

export function stopVisualizationServer(): void {
  if (wss) { wss.close(); wss = null; }
  if (vizServer) {
    vizServer.close();
    vizServer = null;
    console.error('[visualizer] Server stopped');
  }
}

function findPort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => {
      resolve(findPort(startPort + 1));
    });
  });
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32' ? 'start'
            : 'xdg-open';
  exec(`${cmd} ${url}`, (err) => {
    if (err) {
      console.error(`[visualizer] Could not open browser: ${err.message}`);
    }
  });
}
