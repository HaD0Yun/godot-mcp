import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createGDScript, modifyGDScript, CreateScriptParams, ModifyScriptParams } from './gdscript_utils.js';
import { exportProject, listExportPresets, ExportProjectParams } from './project_utils.js';

/**
 * Defines the new tool schemas for Priority 1 features
 */
export const PRIORITY_1_TOOLS = [
  {
    name: 'create_script',
    description: 'Creates a new GDScript file with proper structure, class_name, and inheritance. Use this to create new scripts.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string', description: 'Absolute path to Godot project' },
        scriptPath: { type: 'string', description: 'Relative path for the new script (e.g., "scripts/player.gd")' },
        className: { type: 'string', description: 'Optional: class_name for global registration' },
        extends: { type: 'string', description: 'Base class to extend (default: "Node")' },
        content: { type: 'string', description: 'Optional: Initial content' },
        template: { type: 'string', description: 'Optional: Template name' }
      },
      required: ['projectPath', 'scriptPath']
    }
  },
  {
    name: 'modify_script',
    description: 'Modifies an existing GDScript file programmatically. Add variables, functions, or signals.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        scriptPath: { type: 'string' },
        modifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['add_function', 'add_variable', 'add_signal'] },
              name: { type: 'string' },
              // Other properties depend on type, simplified for schema
            },
            required: ['type', 'name']
          }
        }
      },
      required: ['projectPath', 'scriptPath', 'modifications']
    }
  },
  {
    name: 'export_project',
    description: 'Exports the project to a distributable format using a preset.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        preset: { type: 'string', description: 'Name of the export preset (e.g., "Windows Desktop")' },
        outputPath: { type: 'string', description: 'Relative path for output file' },
        debug: { type: 'boolean' }
      },
      required: ['projectPath', 'preset', 'outputPath']
    }
  },
  {
    name: 'list_export_presets',
    description: 'Lists available export presets from export_presets.cfg',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' }
      },
      required: ['projectPath']
    }
  }
];

/**
 * Handles the execution of Priority 1 tools
 */
export async function handlePriority1Tools(name: string, args: any, godotPath: string): Promise<any> {
  switch (name) {
    case 'create_script':
      return createGDScript(args as CreateScriptParams);
      
    case 'modify_script':
      return modifyGDScript(args as ModifyScriptParams);
      
    case 'export_project':
      return await exportProject(args as ExportProjectParams, godotPath);
      
    case 'list_export_presets':
      return { presets: listExportPresets(args.projectPath) };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
