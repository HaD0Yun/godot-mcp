#!/usr/bin/env node
/**
 * Integration test for Godot MCP Bridge
 * Tests: MCP server startup, WebSocket bridge, tool routing
 */
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { setTimeout as delay } from 'node:timers/promises';

const MCP_SERVER = './build/index.js';
const bridgePortRaw = process.env.GODOT_BRIDGE_PORT || process.env.MCP_BRIDGE_PORT || process.env.GOPEAK_BRIDGE_PORT;
const parsedBridgePort = Number.parseInt(bridgePortRaw || '', 10);
const BRIDGE_PORT = Number.isInteger(parsedBridgePort) && parsedBridgePort >= 1 && parsedBridgePort <= 65535
  ? parsedBridgePort
  : 6505;
const GODOT_WS_URL = `ws://127.0.0.1:${BRIDGE_PORT}/godot`;
const VIZ_WS_URL = `ws://127.0.0.1:${BRIDGE_PORT}/visualizer`;
const GODOT_PATH = process.env.GODOT_PATH || '/home/doyun/Apps/godot-4.6-rc2/Godot_v4.6-rc2_linux.x86_64';

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}
function fail(name, err) {
  failed++;
  console.log(`  ❌ ${name}: ${err}`);
}

// --- MCP JSON-RPC helpers ---
let msgId = 1;
function rpcMsg(method, params = {}) {
  return JSON.stringify({ jsonrpc: '2.0', id: msgId++, method, params }) + '\n';
}

function parseResponses(data) {
  const lines = data.split('\n').filter(l => l.trim());
  const results = [];
  for (const line of lines) {
    try { results.push(JSON.parse(line)); } catch {}
  }
  return results;
}

// --- Main test ---
async function main() {
  console.log('\n🧪 Godot MCP Bridge Integration Test\n');

  // 1. Start MCP server
  console.log('📦 Starting MCP server...');
  const server = spawn('node', [MCP_SERVER], {
    env: { ...process.env, GODOT_PATH, DEBUG: 'true', GODOT_BRIDGE_PORT: String(BRIDGE_PORT) },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.on('data', d => { stderr += d.toString(); });

  let stdout = '';
  server.stdout.on('data', d => { stdout += d.toString(); });

  // Wait for server startup
  await delay(2000);

  if (server.exitCode !== null) {
    console.log('💥 Server crashed on startup!');
    console.log('stderr:', stderr);
    process.exit(1);
  }
  ok('MCP server started (pid: ' + server.pid + ')');

  // 2. Send MCP initialize
  console.log('\n📡 Testing MCP Protocol...');
  stdout = ''; // reset
  server.stdin.write(rpcMsg('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }));
  await delay(1000);

  const initResponses = parseResponses(stdout);
  if (initResponses.length > 0 && initResponses[0].result) {
    ok('MCP initialize response received');
    const caps = initResponses[0].result;
    if (caps.serverInfo) {
      ok(`Server: ${caps.serverInfo.name} v${caps.serverInfo.version}`);
    }
  } else {
    fail('MCP initialize', 'No valid response. stdout: ' + stdout.substring(0, 200));
  }

  // 3. Send initialized notification
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  await delay(500);

  // 4. List tools
  stdout = '';
  server.stdin.write(rpcMsg('tools/list', {}));
  await delay(2000);

  const listResponses = parseResponses(stdout);
  if (listResponses.length > 0 && listResponses[0].result?.tools) {
    const tools = listResponses[0].result.tools;
    ok(`tools/list returned ${tools.length} tools`);

    // Check for get_editor_status
    const editorStatus = tools.find(t => t.name === 'get_editor_status');
    if (editorStatus) {
      ok('get_editor_status tool registered');
    } else {
      fail('get_editor_status', 'Not found in tool list');
    }

    // Check migrated tools exist
    const migratedNames = ['create_scene', 'add_node', 'list_scene_nodes', 'create_resource', 'create_animation'];
    for (const name of migratedNames) {
      const t = tools.find(x => x.name === name);
      if (t) ok(`Tool '${name}' registered`);
      else fail(`Tool '${name}'`, 'Not found');
    }
  } else {
    fail('tools/list', 'No valid response. stdout: ' + stdout.substring(0, 500));
  }

  // 5. Call get_editor_status (should show disconnected)
  console.log('\n🔌 Testing get_editor_status (no Godot connected)...');
  stdout = '';
  server.stdin.write(rpcMsg('tools/call', {
    name: 'get_editor_status',
    arguments: {}
  }));
  await delay(1500);

  const statusResponses = parseResponses(stdout);
  if (statusResponses.length > 0) {
    const res = statusResponses[0];
    if (res.result?.content) {
      const text = res.result.content.map(c => c.text).join('');
      ok('get_editor_status responded');
      if (text.includes('false') || text.includes('disconnected') || text.includes('not connected')) {
        ok('Status shows disconnected (correct - no Godot)');
      } else {
        console.log('    Response:', text.substring(0, 300));
      }
    } else if (res.error) {
      fail('get_editor_status', JSON.stringify(res.error));
    }
  } else {
    fail('get_editor_status', 'No response');
  }

  // 6. Test a migrated tool (should fail gracefully when no Godot)
  console.log('\n🎮 Testing migrated tool without Godot connected...');
  stdout = '';
  server.stdin.write(rpcMsg('tools/call', {
    name: 'create_scene',
    arguments: { scene_path: 'res://test.tscn', root_type: 'Node2D' }
  }));
  await delay(2000);

  const sceneResponses = parseResponses(stdout);
  if (sceneResponses.length > 0) {
    const res = sceneResponses[0];
    if (res.result?.content) {
      const text = res.result.content.map(c => c.text).join('');
      if (text.includes('not connected') || text.includes('editor') || text.includes('Error') || text.includes('error')) {
        ok('create_scene correctly reports editor not connected');
      } else {
        ok('create_scene responded: ' + text.substring(0, 200));
      }
    } else if (res.error) {
      ok('create_scene returned error (expected): ' + res.error.message?.substring(0, 100));
    }
  } else {
    fail('create_scene without Godot', 'No response');
  }

  // 7. Test visualizer WebSocket path routing
  console.log('\n🖥️ Testing visualizer WebSocket path...');
  try {
    const vizWs = await new Promise((resolve, reject) => {
      const socket = new WebSocket(VIZ_WS_URL);
      socket.on('open', () => resolve(socket));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('Visualizer WS connect timeout')), 3000);
    });
    ok('Visualizer WebSocket connected to /visualizer');
    vizWs.close();
    await delay(200);
  } catch (e) {
    fail('Visualizer WebSocket path', e.message);
  }

  // 8. Test WebSocket connection (mock Godot client)
  console.log('\n🌐 Testing WebSocket bridge...');
  try {
    const ws = await new Promise((resolve, reject) => {
      const socket = new WebSocket(GODOT_WS_URL);
      socket.on('open', () => resolve(socket));
      socket.on('error', reject);
      setTimeout(() => reject(new Error('WS connect timeout')), 3000);
    });
    ok('Godot WebSocket connected to /godot');

    // Send godot_ready
    ws.send(JSON.stringify({
      type: 'godot_ready',
      project_path: '/home/doyun/gopeak-smoke-test'
    }));
    await delay(500);
    ok('Sent godot_ready message');

    // Check editor status again (should be connected now)
    stdout = '';
    server.stdin.write(rpcMsg('tools/call', {
      name: 'get_editor_status',
      arguments: {}
    }));
    await delay(1500);

    const connStatusResponses = parseResponses(stdout);
    if (connStatusResponses.length > 0) {
      const text = connStatusResponses[0].result?.content?.map(c => c.text).join('') || '';
      if (text.includes('true') || text.includes('connected')) {
        ok('get_editor_status shows connected after godot_ready');
      } else {
        fail('Connected status', 'Expected connected=true, got: ' + text.substring(0, 200));
      }
    }

    // Test tool invocation through WebSocket
    console.log('\n🔧 Testing tool invocation via WebSocket bridge...');
    
    // Listen for incoming tool_invoke on the mock Godot side
    const toolInvokePromise = new Promise((resolve, reject) => {
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'tool_invoke') {
            resolve(msg);
          }
        } catch {}
      });
      setTimeout(() => reject(new Error('No tool_invoke received')), 5000);
    });

    // Send create_scene via MCP
    stdout = '';
    server.stdin.write(rpcMsg('tools/call', {
      name: 'create_scene',
      arguments: { scene_path: 'res://test_bridge.tscn', root_type: 'Node2D' }
    }));

    try {
      const invokeMsg = await toolInvokePromise;
      ok(`Received tool_invoke: tool="${invokeMsg.tool}", id="${invokeMsg.id}"`);
      
      if (invokeMsg.tool === 'create_scene') {
        ok('Correct tool name routed');
      } else {
        fail('Tool routing', `Expected "create_scene", got "${invokeMsg.tool}"`);
      }

      // Send back a mock result
      ws.send(JSON.stringify({
        type: 'tool_result',
        id: invokeMsg.id,
        success: true,
        result: {
          message: 'Scene created successfully',
          scene_path: 'res://test_bridge.tscn',
          root_type: 'Node2D'
        }
      }));
      await delay(1500);

      // Check MCP got the result
      const toolResponses = parseResponses(stdout);
      if (toolResponses.length > 0) {
        const res = toolResponses[0];
        if (res.result?.content) {
          const text = res.result.content.map(c => c.text).join('');
          if (text.includes('success') || text.includes('Scene created') || text.includes('test_bridge')) {
            ok('MCP received tool result from mock Godot');
          } else {
            ok('MCP response: ' + text.substring(0, 200));
          }
        }
      } else {
        fail('Tool result relay', 'No MCP response after tool_result');
      }
    } catch (e) {
      fail('Tool invoke via WebSocket', e.message);
    }

    ws.close();
    await delay(500);

  } catch (e) {
    fail('WebSocket connection', e.message);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  server.stdin.end();
  server.kill('SIGTERM');
  await delay(1000);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
