import { exec, execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  createScriptFile,
  deleteFunction,
  findUsages,
  modifyFunction,
  modifySignal,
  modifyVariable,
  refreshMap,
  resolvePath,
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

function parseDiffHunks(diffText: string): {
  hunks: Array<{ startLine: number; endLine: number; header: string; lines: string[] }>;
  additions: number;
  deletions: number;
} {
  const hunks: Array<{ startLine: number; endLine: number; header: string; lines: string[] }> = [];
  let additions = 0;
  let deletions = 0;

  const hunkRegex = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/;
  const diffLines = diffText.split('\n');
  let currentHunk: { startLine: number; endLine: number; header: string; lines: string[] } | null = null;

  for (const line of diffLines) {
    const match = line.match(hunkRegex);
    if (match) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      const start = parseInt(match[1], 10);
      const count = match[2] ? parseInt(match[2], 10) : 1;
      currentHunk = { startLine: start, endLine: start + count - 1, header: match[3].trim(), lines: [] };
    } else if (currentHunk) {
      currentHunk.lines.push(line);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      }
      if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return { hunks, additions, deletions };
}

function runDiffCommand(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: 'utf-8', timeout: 5000 });
  } catch (error) {
    const stdout = (error as { stdout?: string | Buffer }).stdout;
    if (typeof stdout === 'string') {
      return stdout;
    }
    if (Buffer.isBuffer(stdout)) {
      return stdout.toString('utf-8');
    }
    throw error;
  }
}

function quoteForShell(value: string): string {
  return `"${value.replace(/[\\"$`]/g, '\\$&')}"`;
}

interface ActionEntry {
  ts: string;
  command: string;
  filePath: string;
  details: Record<string, unknown>;
  reason?: string;
}

const actionLog: ActionEntry[] = [];
const MAX_ACTION_LOG = 100;

const MUTATION_COMMANDS = new Set([
  'create_script_file',
  'modify_variable',
  'modify_signal',
  'modify_function',
  'modify_function_delete',
]);

const COMMAND_MAP: Record<string, CommandHandler> = {
  refresh_map: (pp, args) => refreshMap(pp, args) as { ok: boolean; [key: string]: unknown },
  create_script_file: (pp, args) => createScriptFile(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_variable: (pp, args) => modifyVariable(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_signal: (pp, args) => modifySignal(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_function: (pp, args) => modifyFunction(pp, args) as { ok: boolean; [key: string]: unknown },
  modify_function_delete: (pp, args) => deleteFunction(pp, args) as { ok: boolean; [key: string]: unknown },
  find_usages: (pp, args) => findUsages(pp, args) as { ok: boolean; [key: string]: unknown },
  get_action_log: (_pp, _args) => ({ ok: true, entries: actionLog }),
  get_file_diff: (pp, args) => {
    try {
      const requestPath = (args.path as string) || '';
      if (!requestPath) {
        return { ok: false, error: 'Missing required argument: path' };
      }

      const absolutePath = resolvePath(pp, requestPath);
      const quotedAbsolutePath = quoteForShell(absolutePath);
      let diffText = runDiffCommand(`git diff HEAD -- ${quotedAbsolutePath}`, pp);

      if (diffText.trim() === '' && fs.existsSync(absolutePath)) {
        const relPath = path.relative(pp, absolutePath);
        const quotedRelPath = quoteForShell(relPath);
        const untracked = runDiffCommand(
          `git ls-files --others --exclude-standard -- ${quotedRelPath}`,
          pp
        );
        if (untracked.trim() !== '') {
          diffText = runDiffCommand(`git diff --no-index /dev/null ${quotedAbsolutePath}`, pp);
        }
      }

      const parsed = parseDiffHunks(diffText);
      return {
        ok: true,
        diff: {
          path: requestPath,
          hunks: parsed.hunks,
          summary: {
            additions: parsed.additions,
            deletions: parsed.deletions,
          },
        },
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      return { ok: false, error: errMsg };
    }
  },
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
      const result = handler(currentProjectPath, args);
      if (result.ok && MUTATION_COMMANDS.has(command)) {
        const entry: ActionEntry = {
          ts: new Date().toISOString(),
          command,
          filePath: (args.path as string) || '',
          details: { ...args },
          reason: (args.reason as string) || undefined,
        };
        actionLog.push(entry);
        if (actionLog.length > MAX_ACTION_LOG) {
          actionLog.shift();
        }
        if (wss) {
          const msg = JSON.stringify({ type: 'action_event', entry });
          wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(msg);
            }
          });
        }
      }
      return result;
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
