import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface ExportProjectParams {
  projectPath: string;
  preset: string;
  outputPath: string;
  debug?: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath: string;
  output: string;
  errors: string[];
}

export interface ExportPreset {
  name: string;
  platform: string;
  runnable: boolean;
  custom_features: string[];
  export_path: string;
}

/**
 * Exports the Godot project using the CLI
 */
export async function exportProject(params: ExportProjectParams, godotPath: string): Promise<ExportResult> {
  const absoluteOutputPath = join(params.projectPath, params.outputPath);
  const flag = params.debug ? '--export-debug' : '--export-release';
  
  // Construct command
  // "godot" --headless --path "project/path" --export-release "Windows Desktop" "builds/game.exe"
  const cmd = `"${godotPath}" --headless --path "${params.projectPath}" ${flag} "${params.preset}" "${absoluteOutputPath}"`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd);
    
    // Check if output file was created
    if (!existsSync(absoluteOutputPath)) {
        return {
            success: false,
            outputPath: absoluteOutputPath,
            output: stdout,
            errors: ["Output file was not created. Check export preset name and permissions.", stderr]
        };
    }

    return {
      success: true,
      outputPath: absoluteOutputPath,
      output: stdout,
      errors: stderr ? [stderr] : []
    };
  } catch (error: any) {
    return {
      success: false,
      outputPath: absoluteOutputPath,
      output: error.stdout || "",
      errors: [error.message, error.stderr]
    };
  }
}

/**
 * Parses export_presets.cfg to list available presets
 */
export function listExportPresets(projectPath: string): ExportPreset[] {
  const configPath = join(projectPath, 'export_presets.cfg');
  if (!existsSync(configPath)) {
    return [];
  }

  const content = readFileSync(configPath, 'utf-8');
  const presets: ExportPreset[] = [];
  
  const lines = content.split('\n');
  let currentPreset: Partial<ExportPreset> | null = null;
  
  for (const line of lines) {
    if (line.startsWith('[preset.')) {
        if (currentPreset && currentPreset.name) {
            presets.push(currentPreset as ExportPreset);
        }
        currentPreset = { custom_features: [] };
    } else if (line.startsWith('name=')) {
        if (currentPreset) currentPreset.name = line.split('=')[1].replace(/"/g, '');
    } else if (line.startsWith('platform=')) {
        if (currentPreset) currentPreset.platform = line.split('=')[1].replace(/"/g, '');
    } else if (line.startsWith('runnable=')) {
        if (currentPreset) currentPreset.runnable = line.split('=')[1] === 'true';
    } else if (line.startsWith('export_path=')) {
        if (currentPreset) currentPreset.export_path = line.split('=')[1].replace(/"/g, '');
    }
  }
  
  if (currentPreset && currentPreset.name) {
      presets.push(currentPreset as ExportPreset);
  }

  return presets;
}
