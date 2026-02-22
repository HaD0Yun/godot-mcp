/**
 * Context menu, new script modal, and view switching
 */

import {
  nodes, edges, setCurrentView, setSceneData, getFolderColor,
  setExpandedScene, setExpandedSceneHierarchy, setSelectedSceneNode,
  setHoveredSceneNode, expandedScene,
  gitChangeSummary, categoryColorMap
} from './state.js';
import { sendCommand } from './websocket.js';
import { draw, getCanvas, roundRect, getContext, clearPositions, fitToView } from './canvas.js';
import { initLayout } from './layout.js';
import { closePanel, closeSceneNodePanel } from './panel.js';
import { updateStats, buildChangesPanel } from './events.js';

let contextMenu;

export function initModals() {
  contextMenu = document.getElementById('context-menu');
  initContextMenu();
}

// ---- Context Menu ----
function initContextMenu() {
  const canvas = getCanvas();

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Position menu at mouse
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.classList.add('visible');
  });

  // Hide context menu on click elsewhere
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.classList.remove('visible');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      contextMenu.classList.remove('visible');
      closeNewScriptModal();
    }
  });
}

// ---- New Script Creation ----
window.createNewScript = function () {
  contextMenu.classList.remove('visible');
  document.getElementById('new-script-modal').style.display = 'flex';
  document.getElementById('new-script-path').focus();
};

window.closeNewScriptModal = function () {
  document.getElementById('new-script-modal').style.display = 'none';
};

function closeNewScriptModal() {
  document.getElementById('new-script-modal').style.display = 'none';
}

window.submitNewScript = async function () {
  const path = document.getElementById('new-script-path').value.trim();
  const extendsType = document.getElementById('new-script-extends').value;
  const className = document.getElementById('new-script-classname').value.trim();

  if (!path) {
    alert('Please enter a script path');
    return;
  }

  if (!path.startsWith('res://') || !path.endsWith('.gd')) {
    alert('Path must start with res:// and end with .gd');
    return;
  }

  try {
    // Use existing create_script tool via invokeTool (not internal)
    const result = await sendCommand('create_script_file', {
      path: path,
      extends: extendsType,
      class_name: className || ''
    });

    if (result.ok) {
      closeNewScriptModal();
      // Refresh the project map
      refreshProject();
    } else {
      alert('Failed to create script: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Failed to create script: ' + err.message);
  }
};

window.refreshProject = async function () {
  contextMenu.classList.remove('visible');
  const refreshBtn = document.getElementById('refresh-btn');
  if (!refreshBtn) return;

  // Prevent double-clicks
  if (refreshBtn.classList.contains('spinning')) return;
  refreshBtn.classList.add('spinning');

  const spinStart = Date.now();
  let success = false;

  try {
    const result = await sendCommand('refresh_map', {});
    if (result.ok && result.project_map) {
      // Build old-position lookup by path for stable repositioning
      const oldPositions = {};
      nodes.forEach(n => { oldPositions[n.path] = { x: n.x, y: n.y }; });

      // Map new nodes, preserving positions for existing paths
      const newNodes = result.project_map.nodes.map((n) => {
        const old = oldPositions[n.path];
        return {
          ...n,
          x: old ? old.x : 0,
          y: old ? old.y : 0,
          color: categoryColorMap[n.category] || getFolderColor(n.folder),
          highlighted: true,
          visible: true,
          categoryVisible: true
        };
      });

      nodes.length = 0;
      nodes.push(...newNodes);
      edges.length = 0;
      edges.push(...result.project_map.edges);

      // Recalculate git change summary
      gitChangeSummary.modified = 0;
      gitChangeSummary.added = 0;
      gitChangeSummary.untracked = 0;
      nodes.forEach(n => {
        if (n.gitStatus === 'modified') gitChangeSummary.modified++;
        else if (n.gitStatus === 'added') gitChangeSummary.added++;
        else if (n.gitStatus === 'untracked') gitChangeSummary.untracked++;
      });

      // Rebuild changes panel UI
      buildChangesPanel();

      // Show/hide changes panel based on whether changes exist
      const totalChanges = gitChangeSummary.modified + gitChangeSummary.added + gitChangeSummary.untracked;
      const changesPanel = document.getElementById('changes-panel');
      if (changesPanel) {
        changesPanel.style.display = totalChanges > 0 ? '' : 'none';
      }

      // Only run full layout for brand-new nodes (no prior position)
      const hasNewNodes = newNodes.some(n => n.x === 0 && n.y === 0 && !oldPositions[n.path]);
      if (hasNewNodes) {
        initLayout();
      }

      updateStats();
      draw();
      success = true;
    }
  } catch (err) {
    console.error('Failed to refresh:', err);
  } finally {
    // Ensure spinner is visible for at least 600ms so user sees feedback
    const elapsed = Date.now() - spinStart;
    const remaining = Math.max(0, 600 - elapsed);

    setTimeout(() => {
      refreshBtn.classList.remove('spinning');

      // Flash success (green) or error (red) for 1.5s
      const feedbackClass = success ? 'refresh-done' : 'refresh-error';
      refreshBtn.classList.add(feedbackClass);
      setTimeout(() => refreshBtn.classList.remove(feedbackClass), 1500);
    }, remaining);
  }
};

function refreshProject() {
  window.refreshProject();
}

// ---- Reset Layout ----
window.resetLayout = function () {
  contextMenu.classList.remove('visible');
  // Clear saved positions
  clearPositions();
  // Re-run force-directed layout
  initLayout();
  // Fit view to show all nodes
  fitToView(nodes);
  // Redraw
  draw();
};

// ---- View Switching (Scripts/Scenes) ----
window.switchView = function (view) {
  const currentViewTab = document.querySelector('#view-tabs button.active')?.textContent.toLowerCase();
  if (view === currentViewTab) return;

  // Close any open panels
  if (view === 'scripts') {
    closeSceneNodePanel();
    // Clear scene state
    setExpandedScene(null);
    setExpandedSceneHierarchy(null);
    setSelectedSceneNode(null);
    setHoveredSceneNode(null);
    // Hide scene back button
    const backBtn = document.getElementById('scene-back-btn');
    if (backBtn) backBtn.style.display = 'none';
    // Show legend for scripts view
    const legend = document.getElementById('legend');
    if (legend) legend.classList.remove('hidden');
  } else {
    closePanel();
  }

  setCurrentView(view);

  // Update tab buttons
  document.querySelectorAll('#view-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase() === view);
  });

  // Update search placeholder
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.placeholder = view === 'scripts' ? 'Search scripts...' : 'Search scenes...';
  }

  if (view === 'scenes') {
    loadSceneView();
  } else {
    updateStats();
    draw();
  }
};

async function loadSceneView() {
  // Request scene data from Godot
  try {
    const result = await sendCommand('map_scenes', { root: 'res://' });
    if (result.ok) {
      setSceneData(result.scene_map);
      updateStats();
      draw();
    } else {
      console.error('Failed to load scenes:', result.error);
      alert('Failed to load scenes: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Failed to load scenes:', err);
    // Show placeholder for now
    draw();
  }
}
