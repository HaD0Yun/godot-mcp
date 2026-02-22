/**
 * Force-directed layout algorithm for node positioning
 */

import { nodes, edges, NODE_W, NODE_H } from './state.js';

// Minimum spacing between nodes
const MIN_SPACING_X = NODE_W + 40;
const MIN_SPACING_Y = NODE_H + 30;

export function initLayout() {
  if (nodes.length === 0) return;

  // Build adjacency map for connected nodes
  const adjacency = new Map();
  nodes.forEach(n => {
    adjacency.set(n.path, []);
  });

  edges.forEach(e => {
    if (adjacency.has(e.from) && adjacency.has(e.to)) {
      adjacency.get(e.from).push(e.to);
      adjacency.get(e.to).push(e.from);
    }
  });

  // Find root nodes (most connections or extends nothing)
  const connectionCount = new Map();
  nodes.forEach(n => {
    const count = (adjacency.get(n.path) || []).length;
    connectionCount.set(n.path, count);
  });

  // Sort nodes by connection count (most connected first)
  const sortedNodes = [...nodes].sort((a, b) =>
    connectionCount.get(b.path) - connectionCount.get(a.path)
  );

  // Initial placement: spread nodes in a grid with good spacing
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const startX = -(cols * MIN_SPACING_X) / 2;
  const startY = -(Math.ceil(nodes.length / cols) * MIN_SPACING_Y) / 2;

  sortedNodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    n.x = startX + col * MIN_SPACING_X;
    n.y = startY + row * MIN_SPACING_Y;
  });

  // Run force-directed simulation with collision detection
  const iterations = 150;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = Math.pow(1 - iter / iterations, 2); // Quadratic cooling
    applyForces(alpha, adjacency);
    resolveCollisions();
  }

  // Final collision resolution pass
  for (let i = 0; i < 10; i++) {
    resolveCollisions();
  }

  // Center the layout
  centerLayout();
}

export function initGroupedLayout() {
  if (nodes.length === 0) return;

  const groups = {};
  nodes.forEach(n => {
    const cat = n.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(n);
  });

  const groupKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  const groupCols = Math.ceil(Math.sqrt(groupKeys.length));
  const GROUP_PADDING = 60;
  const GROUP_GAP = 120;

  const groupLayouts = {};

  groupKeys.forEach((cat, gi) => {
    const groupNodes = groups[cat];
    const cols = Math.max(1, Math.ceil(Math.sqrt(groupNodes.length)));
    const rows = Math.ceil(groupNodes.length / cols);

    const innerW = cols * MIN_SPACING_X;
    const innerH = rows * MIN_SPACING_Y;

    const gCol = gi % groupCols;
    const gRow = Math.floor(gi / groupCols);

    groupLayouts[cat] = {
      nodes: groupNodes,
      cols,
      rows,
      innerW,
      innerH,
      totalW: innerW + GROUP_PADDING * 2,
      totalH: innerH + GROUP_PADDING * 2 + 30,
      gCol,
      gRow
    };
  });

  const maxColWidths = [];
  const maxRowHeights = [];

  Object.values(groupLayouts).forEach(g => {
    while (maxColWidths.length <= g.gCol) maxColWidths.push(0);
    while (maxRowHeights.length <= g.gRow) maxRowHeights.push(0);
    maxColWidths[g.gCol] = Math.max(maxColWidths[g.gCol], g.totalW);
    maxRowHeights[g.gRow] = Math.max(maxRowHeights[g.gRow], g.totalH);
  });

  const colOffsets = [0];
  for (let i = 1; i < maxColWidths.length; i++) {
    colOffsets[i] = colOffsets[i - 1] + maxColWidths[i - 1] + GROUP_GAP;
  }

  const rowOffsets = [0];
  for (let i = 1; i < maxRowHeights.length; i++) {
    rowOffsets[i] = rowOffsets[i - 1] + maxRowHeights[i - 1] + GROUP_GAP;
  }

  Object.entries(groupLayouts).forEach(([cat, g]) => {
    const groupX = colOffsets[g.gCol];
    const groupY = rowOffsets[g.gRow] + 30;

    g.groupBox = {
      x: groupX - GROUP_PADDING,
      y: groupY - GROUP_PADDING - 30,
      w: g.totalW,
      h: g.totalH,
      category: cat
    };

    g.nodes.forEach((n, ni) => {
      const col = ni % g.cols;
      const row = Math.floor(ni / g.cols);
      n.x = groupX + col * MIN_SPACING_X + MIN_SPACING_X / 2;
      n.y = groupY + row * MIN_SPACING_Y + MIN_SPACING_Y / 2;
    });
  });

  const iterations = 60;
  for (let iter = 0; iter < iterations; iter++) {
    const alpha = Math.pow(1 - iter / iterations, 2) * 0.5;

    Object.values(groupLayouts).forEach(g => {
      for (let i = 0; i < g.nodes.length; i++) {
        for (let j = i + 1; j < g.nodes.length; j++) {
          const a = g.nodes[i];
          const b = g.nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (dx === 0 && dy === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
          }
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (20000 / (dist * dist)) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.x -= fx;
          a.y -= fy;
          b.x += fx;
          b.y += fy;
        }
      }
    });

    edges.forEach(e => {
      const from = nodes.find(n => n.path === e.from);
      const to = nodes.find(n => n.path === e.to);
      if (!from || !to || from.category !== to.category) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist > MIN_SPACING_X) {
        const force = (dist - MIN_SPACING_X) * 0.05 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        from.x += fx;
        from.y += fy;
        to.x -= fx;
        to.y -= fy;
      }
    });
  }

  window.__categoryGroupBoxes = Object.values(groupLayouts).map(g => g.groupBox);
  centerGroupedLayout();
}

function applyForces(alpha, adjacency) {
  const repulsion = 50000;  // Strong repulsion
  const attraction = 0.08;  // Moderate attraction
  const idealEdgeLength = MIN_SPACING_X * 1.2;

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;

      // Add small random offset if nodes are at same position
      if (dx === 0 && dy === 0) {
        dx = (Math.random() - 0.5) * 10;
        dy = (Math.random() - 0.5) * 10;
      }

      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = MIN_SPACING_X; // Minimum desired distance

      // Stronger repulsion when nodes are close
      let force = repulsion / (dist * dist);
      if (dist < minDist) {
        force *= 3; // Extra push when too close
      }

      const fx = (dx / dist) * force * alpha;
      const fy = (dy / dist) * force * alpha;
      a.x -= fx;
      a.y -= fy;
      b.x += fx;
      b.y += fy;
    }
  }

  // Attraction along edges - pull connected nodes together
  edges.forEach(e => {
    const from = nodes.find(n => n.path === e.from);
    const to = nodes.find(n => n.path === e.to);
    if (!from || !to) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Only attract if nodes are far apart
    if (dist > idealEdgeLength) {
      const force = (dist - idealEdgeLength) * attraction * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      from.x += fx;
      from.y += fy;
      to.x -= fx;
      to.y -= fy;
    }
  });
}

function resolveCollisions() {
  // Separate overlapping nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      // Check for overlap using bounding boxes
      const overlapX = MIN_SPACING_X - Math.abs(b.x - a.x);
      const overlapY = MIN_SPACING_Y - Math.abs(b.y - a.y);

      if (overlapX > 0 && overlapY > 0) {
        // Nodes are overlapping - push them apart
        let dx = b.x - a.x;
        let dy = b.y - a.y;

        // Add random offset if exactly overlapping
        if (dx === 0) dx = (Math.random() - 0.5) * 2;
        if (dy === 0) dy = (Math.random() - 0.5) * 2;

        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Push apart in the direction of least overlap
        if (overlapX < overlapY) {
          // Push horizontally
          const push = (overlapX / 2 + 5) * Math.sign(dx);
          a.x -= push;
          b.x += push;
        } else {
          // Push vertically
          const push = (overlapY / 2 + 5) * Math.sign(dy);
          a.y -= push;
          b.y += push;
        }
      }
    }
  }
}

function centerLayout() {
  if (nodes.length === 0) return;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });

  // Center around origin
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  nodes.forEach(n => {
    n.x -= centerX;
    n.y -= centerY;
  });
}

function centerGroupedLayout() {
  if (nodes.length === 0) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  nodes.forEach(n => {
    n.x -= cx;
    n.y -= cy;
  });

  if (window.__categoryGroupBoxes) {
    window.__categoryGroupBoxes.forEach(b => {
      b.x -= cx;
      b.y -= cy;
    });
  }
}
