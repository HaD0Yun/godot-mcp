/**
 * Main entry point for the Godot Project Map Visualizer
 */

import './usages.js'; // Load usages module for side effects (global functions)
import { centerOnNodes, draw, fitToView, initCanvas, updateZoomIndicator } from './canvas.js';
import { buildCategoryList, buildChangesPanel, initEvents, updateStats } from './events.js';
import { initLayout } from './layout.js';
import { initModals } from './modals.js';
import { initPanel } from './panel.js';
import {
  addActionEntry,
  actionLog,
  gitChangeSummary,
  nodes,
  PROJECT_DATA
} from './state.js';
import { connectWebSocket, onActionEvent, sendCommand } from './websocket.js';

const COMMAND_DISPLAY = {
  create_script_file: (args) => `🆕 Script created: ${shortPath(args.path)}`,
  modify_variable: (args) => {
    const action = args.action || 'update';
    const icon = action === 'add' ? '+' : action === 'delete' ? '−' : '✏️';
    return `${icon} var ${args.name || args.old_name || '?'} ${action === 'add' ? '추가' : action === 'delete' ? '삭제' : '수정'}`;
  },
  modify_function: (args) => `✏️ func ${args.name || '?'}() 수정`,
  modify_function_delete: (args) => `− func ${args.name || '?'}() 삭제`,
  modify_signal: (args) => {
    const action = args.action || 'update';
    const icon = action === 'add' ? '🔗' : action === 'delete' ? '−' : '✏️';
    return `${icon} signal ${args.name || args.old_name || '?'} ${action === 'add' ? '추가' : action === 'delete' ? '삭제' : '수정'}`;
  },
  modify_script: () => '✏️ Script modified',
  create_script: () => '🆕 Script created'
};

function shortPath(p) {
  if (!p) return '?';
  const parts = p.replace('res://', '').split('/');
  return parts[parts.length - 1];
}

function formatTime(ts) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function commandToText(command, args) {
  if (!command) return 'Unknown action';
  const formatter = COMMAND_DISPLAY[command];
  if (formatter) return formatter(args || {});
  return command.replace(/_/g, ' ');
}

/** Normalize server entry format (ts/details) to frontend format (timestamp/args) */
function normalizeEntry(raw) {
  return {
    command: raw.command || 'unknown',
    args: raw.details || raw.args || {},
    timestamp: raw.ts || raw.timestamp || Date.now(),
    reason: raw.reason || null,
    filePath: raw.filePath || raw.details?.path || raw.args?.path || null
  };
}

function initTimeline() {
  renderTimeline();

  const fetchActionLog = (attempt = 0) => {
    sendCommand('get_action_log').then((result) => {
      if (result?.entries) {
        for (const entry of result.entries) {
          addActionEntry(normalizeEntry(entry));
        }
      }
      renderTimeline();
    }).catch((err) => {
      if (err.message === 'WebSocket not connected' && attempt < 10) {
        setTimeout(() => fetchActionLog(attempt + 1), 300);
        return;
      }
      console.log('[timeline] Could not fetch action log:', err.message);
    });
  };

  fetchActionLog();

  onActionEvent((msg) => {
    // Server sends { type: 'action_event', entry: { ts, command, filePath, details, reason } }
    const raw = msg.entry || msg;
    addActionEntry(normalizeEntry(raw));
    renderTimeline();
  });
}

function renderTimeline() {
  const list = document.getElementById('tl-list');
  const empty = document.getElementById('tl-empty');
  const count = document.getElementById('tl-count');
  if (!list || !empty || !count) return;

  count.textContent = actionLog.length;

  if (actionLog.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  empty.style.display = 'none';

  const sorted = [...actionLog].reverse();
  const groups = {};
  for (const entry of sorted) {
    const fp = entry.filePath || entry.args?.path || 'Unknown';
    if (!groups[fp]) groups[fp] = [];
    groups[fp].push(entry);
  }

  let html = '';
  for (const [filePath, entries] of Object.entries(groups)) {
    const fname = shortPath(filePath);
    const escapedPath = filePath.replace(/'/g, "\\'");

    html += `<div class="tl-card" data-path="${filePath}" onclick="timelineCardClick('${escapedPath}')">`;
    html += '<div class="tl-card-header">';
    html += `<span class="tl-card-file">${fname}</span>`;
    html += `<span class="tl-card-count">${entries.length}</span>`;
    html += '</div>';

    for (const entry of entries) {
      const text = commandToText(entry.command, entry.args);
      const time = formatTime(entry.timestamp);
      html += '<div class="tl-action">';
      html += `<span class="tl-action-text">${text}</span>`;
      html += `<span class="tl-action-time">${time}</span>`;
      if (entry.reason) {
        html += `<div class="tl-action-reason">${entry.reason}</div>`;
      }
      html += '</div>';
    }

    html += '</div>';
  }

  list.innerHTML = html;
}

// Initialize everything when DOM is ready
function init() {
  // Connect WebSocket for real-time communication
  connectWebSocket();

  // Initialize canvas and rendering (also restores saved positions)
  const { positionsRestored } = initCanvas();

  // Initialize panel and modals
  initPanel();
  initModals();

  // Initialize event handlers
  initEvents();

  // Update stats
  updateStats();

  // Build category list UI
  buildCategoryList();

  buildChangesPanel();

  const totalChanges = gitChangeSummary.modified + gitChangeSummary.added + gitChangeSummary.untracked;
  if (totalChanges === 0) {
    const changesPanel = document.getElementById('changes-panel');
    if (changesPanel) changesPanel.style.display = 'none';
  }

  initTimeline();
  initTimelineDrag();

  // Hide category panel if no categories
  if (!PROJECT_DATA.categories || PROJECT_DATA.categories.length === 0) {
    const catPanel = document.getElementById('category-panel');
    if (catPanel) catPanel.style.display = 'none';
  }

  // Get zoom indicator element
  const zoomIndicator = document.getElementById('zoom-indicator');

  if (nodes.length === 0) {
    // No scripts found - show placeholder
    const ctx = document.getElementById('canvas').getContext('2d');
    const W = window.innerWidth;
    const H = window.innerHeight;

    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.textAlign = 'center';
    ctx.fillText('No scripts found in project', W / 2, H / 2);
    zoomIndicator.style.display = 'none';
  } else {
    if (positionsRestored) {
      // Positions were restored from localStorage - just update zoom indicator
      updateZoomIndicator();
    } else {
      // No saved positions - run force-directed layout
      initLayout();
      // Fit view to show all nodes
      fitToView(nodes);
    }

    // Initial draw
    draw();
  }
}

window.timelineCardClick = function timelineCardClick(filePath) {
  const node = nodes.find(n => n.path === filePath);
  if (node) {
    centerOnNodes([node]);
    draw();
  }
};

window.toggleTimelinePanel = function toggleTimelinePanel() {
  const panel = document.getElementById('timeline-panel');
  if (panel) {
    panel.classList.toggle('collapsed');
  }
};

// ── Timeline panel drag ──
function initTimelineDrag() {
  const panel = document.getElementById('timeline-panel');
  const header = panel?.querySelector('.tl-header');
  if (!panel || !header) return;

  let dragging = false, offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    panel.style.left = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth)) + 'px';
    panel.style.top = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      header.style.cursor = '';
    }
  });
}

// Start when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
