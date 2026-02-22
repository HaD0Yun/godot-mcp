#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src', 'visualizer');
const distDir = join(__dirname, '..', 'build');

async function buildVisualizer() {
  console.log('Building visualizer...');

  mkdirSync(distDir, { recursive: true });

  const template = readFileSync(join(srcDir, 'template.html'), 'utf-8');
  const css = readFileSync(join(srcDir, 'visualizer.css'), 'utf-8');

  const jsResult = await build({
    entryPoints: [join(srcDir, 'main.js')],
    bundle: true,
    format: 'iife',
    minify: false,
    write: false,
    target: ['es2020'],
    sourcemap: false,
  });

  const bundledJs = jsResult.outputFiles[0].text;

  let html = template
    .replace('%%CSS%%', css)
    .replace('%%SCRIPT%%', bundledJs);

  const outputPath = join(distDir, 'visualizer.html');
  writeFileSync(outputPath, html, 'utf-8');

  const lines = html.split('\n').length;
  const size = Buffer.byteLength(html, 'utf-8');
  console.log(`Visualizer built successfully: ${outputPath}`);
  console.log(`  Lines: ${lines}`);
  console.log(`  Size: ${(size / 1024).toFixed(1)} KB`);
}

buildVisualizer().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
