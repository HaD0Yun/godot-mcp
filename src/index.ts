
import { fileURLToPath } from 'url';
import { join, dirname, basename, normalize } from 'path';
import { existsSync, readdirSync, mkdirSync, readFileSync } from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Check if debug mode is enabled
const DEBUG_MODE: boolean = process.env.DEBUG === 'true';
const GODOT_DEBUG_MODE: boolean = true; // Always use GODOT DEBUG MODE

const execAsync = promisify(exec);

// Derive __filename and __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Interface representing a running Godot process
 */
interface GodotProcess {
  process: any;
  output: string[];
  errors: string[];
}

/**
 * Interface for server configuration
 */
interface GodotServerConfig {
  godotPath?: string;
  debugMode?: boolean;
  godotDebugMode?: boolean;
  strictPathValidation?: boolean; // New option to control path validation behavior
}

/**
 * Interface for operation parameters
 */
interface OperationParams {
  [key: string]: any;
}

/**
 * Main server class for the Godot MCP server
 */
class GodotServer {
  private server: Server;
  private activeProcess: GodotProcess | null = null;
  private godotPath: string | null = null;
  private operationsScriptPath: string;
  private validatedPaths: Map<string, boolean> = new Map();
  private strictPathValidation: boolean = false;

  /**
   * Parameter name mappings between snake_case and camelCase
   * This allows the server to accept both formats
   */
  private parameterMappings: Record<string, string> = {
    'project_path': 'projectPath',
    'scene_path': 'scenePath',
    'root_node_type': 'rootNodeType',
    'parent_node_path': 'parentNodePath',
    'node_type': 'nodeType',
    'node_name': 'nodeName',
    'texture_path': 'texturePath',
    'node_path': 'nodePath',
    'output_path': 'outputPath',
    'mesh_item_names': 'meshItemNames',
    'new_path': 'newPath',
    'file_path': 'filePath',
    'light_type': 'lightType',
    'properties': 'properties',
    'shadow_enabled': 'shadowEnabled',
    'shadow_type': 'shadowType',
    'player_type': 'playerType',
    'stream_path': 'streamPath',
    'bus_name': 'busName',
    'volume_db': 'volumeDb',
    'send_to': 'sendTo',
    'layout_path': 'layoutPath',
    'effect_type': 'effectType',
    'particle_type': 'particleType',
    'one_shot': 'oneShot',
    'material_path': 'materialPath',
    'region_path': 'regionPath',
    'agent_type': 'agentType',
    'link_type': 'linkType',
    'peer_type': 'peerType',
    'max_clients': 'maxClients',
    'transfer_mode': 'transferMode',
    'spawn_path': 'spawnPath',
    'auto_spawn_list': 'autoSpawnList',
    'root_path': 'rootPath',
    'replication_interval': 'replicationInterval',
    'method_name': 'methodName',
    'rpc_mode': 'rpcMode',
    'call_local': 'callLocal',
    'channel': 'channel',
    'joint_type': 'jointType',
    'node_a': 'nodeA',
    'node_b': 'nodeB',
    'collision_layer': 'collisionLayer',
    'collision_mask': 'collisionMask',
    'is_3d': 'is3d',
    'target_position': 'targetPosition',
    'shape_type': 'shapeType',
    'shape_properties': 'shapeProperties',
    'animation_player_path': 'animationPlayerPath',
    'tree_type': 'treeType',
    'animation_tree_path': 'animationTreePath',
    'state_name': 'stateName',
    'animation_name': 'animationName',
    'from_state': 'fromState',
    'to_state': 'toState',
    'parameter_name': 'parameterName',
    'theme_path': 'themePath',
    'base_theme': 'baseTheme',
    'default_font': 'defaultFont',
    'default_font_size': 'defaultFontSize',
    'type_name': 'typeName',
    'stylebox_path': 'styleboxPath',
    'stylebox_type': 'styleboxType',
    'anchor_preset': 'anchorPreset',
    'layout_mode': 'layoutMode',
  };


  /**
   * Reverse mapping from camelCase to snake_case
   * Generated from parameterMappings for quick lookups
   */
  private reverseParameterMappings: Record<string, string> = {};

  constructor(config?: GodotServerConfig) {
    // Initialize reverse parameter mappings
    for (const [snakeCase, camelCase] of Object.entries(this.parameterMappings)) {
      this.reverseParameterMappings[camelCase] = snakeCase;
    }
    // Apply configuration if provided
    let debugMode = DEBUG_MODE;
    let godotDebugMode = GODOT_DEBUG_MODE;

    if (config) {
      if (config.debugMode !== undefined) {
        debugMode = config.debugMode;
      }
      if (config.godotDebugMode !== undefined) {
        godotDebugMode = config.godotDebugMode;
      }
      if (config.strictPathValidation !== undefined) {
        this.strictPathValidation = config.strictPathValidation;
      }

      // Store and validate custom Godot path if provided
      if (config.godotPath) {
        const normalizedPath = normalize(config.godotPath);
        this.godotPath = normalizedPath;
        this.logDebug(`Custom Godot path provided: ${this.godotPath}`);

        // Validate immediately with sync check
        if (!this.isValidGodotPathSync(this.godotPath)) {
          console.warn(`[SERVER] Invalid custom Godot path provided: ${this.godotPath}`);
          this.godotPath = null; // Reset to trigger auto-detection later
        }
      }
    }

    // Set the path to the operations script
    this.operationsScriptPath = join(__dirname, 'scripts', 'godot_operations.gd');
    if (debugMode) console.error(`[DEBUG] Operations script path: ${this.operationsScriptPath}`);

    // Initialize the MCP server
    this.server = new Server(
      {
        name: 'godot-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up tool handlers
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);

    // Cleanup on exit
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Log debug messages if debug mode is enabled
   * Using stderr instead of stdout to avoid interfering with JSON-RPC communication
   */
  private logDebug(message: string): void {
    if (DEBUG_MODE) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  /**
   * Create a standardized error response with possible solutions
   */
  private createErrorResponse(message: string, possibleSolutions: string[] = []): any {
    // Log the error
    console.error(`[SERVER] Error response: ${message}`);
    if (possibleSolutions.length > 0) {
      console.error(`[SERVER] Possible solutions: ${possibleSolutions.join(', ')}`);
    }

    const response: any = {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };

    if (possibleSolutions.length > 0) {
      response.content.push({
        type: 'text',
        text: 'Possible solutions:\n- ' + possibleSolutions.join('\n- '),
      });
    }

    return response;
  }

  /**
   * Validate a path to prevent path traversal attacks
   */
  private validatePath(path: string): boolean {
    // Basic validation to prevent path traversal
    if (!path || path.includes('..')) {
      return false;
    }

    // Add more validation as needed
    return true;
  }

  /**
   * Synchronous validation for constructor use
   * This is a quick check that only verifies file existence, not executable validity
   * Full validation will be performed later in detectGodotPath
   * @param path Path to check
   * @returns True if the path exists or is 'godot' (which might be in PATH)
   */
  private isValidGodotPathSync(path: string): boolean {
    try {
      this.logDebug(`Quick-validating Godot path: ${path}`);
      return path === 'godot' || existsSync(path);
    } catch (error) {
      this.logDebug(`Invalid Godot path: ${path}, error: ${error}`);
      return false;
    }
  }

  /**
   * Validate if a Godot path is valid and executable
   */
  private async isValidGodotPath(path: string): Promise<boolean> {
    // Check cache first
    if (this.validatedPaths.has(path)) {
      return this.validatedPaths.get(path)!;
    }

    try {
      this.logDebug(`Validating Godot path: ${path}`);

      // Check if the file exists (skip for 'godot' which might be in PATH)
      if (path !== 'godot' && !existsSync(path)) {
        this.logDebug(`Path does not exist: ${path}`);
        this.validatedPaths.set(path, false);
        return false;
      }

      // Try to execute Godot with --version flag
      const command = path === 'godot' ? 'godot --version' : `"${path}" --version`;
      await execAsync(command);

      this.logDebug(`Valid Godot path: ${path}`);
      this.validatedPaths.set(path, true);
      return true;
    } catch (error) {
      this.logDebug(`Invalid Godot path: ${path}, error: ${error}`);
      this.validatedPaths.set(path, false);
      return false;
    }
  }

  /**
   * Detect the Godot executable path based on the operating system
   */
  private async detectGodotPath() {
    // If godotPath is already set and valid, use it
    if (this.godotPath && await this.isValidGodotPath(this.godotPath)) {
      this.logDebug(`Using existing Godot path: ${this.godotPath}`);
      return;
    }

    // Check environment variable next
    if (process.env.GODOT_PATH) {
      const normalizedPath = normalize(process.env.GODOT_PATH);
      this.logDebug(`Checking GODOT_PATH environment variable: ${normalizedPath}`);
      if (await this.isValidGodotPath(normalizedPath)) {
        this.godotPath = normalizedPath;
        this.logDebug(`Using Godot path from environment: ${this.godotPath}`);
        return;
      } else {
        this.logDebug(`GODOT_PATH environment variable is invalid`);
      }
    }

    // Auto-detect based on platform
    const osPlatform = process.platform;
    this.logDebug(`Auto-detecting Godot path for platform: ${osPlatform}`);

    const possiblePaths: string[] = [
      'godot', // Check if 'godot' is in PATH first
    ];

    // Add platform-specific paths
    if (osPlatform === 'darwin') {
      possiblePaths.push(
        '/Applications/Godot.app/Contents/MacOS/Godot',
        '/Applications/Godot_4.app/Contents/MacOS/Godot',
        `${process.env.HOME}/Applications/Godot.app/Contents/MacOS/Godot`,
        `${process.env.HOME}/Applications/Godot_4.app/Contents/MacOS/Godot`,
        `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Godot Engine/Godot.app/Contents/MacOS/Godot`
      );
    } else if (osPlatform === 'win32') {
      possiblePaths.push(
        'C:\\Program Files\\Godot\\Godot.exe',
        'C:\\Program Files (x86)\\Godot\\Godot.exe',
        'C:\\Program Files\\Godot_4\\Godot.exe',
        'C:\\Program Files (x86)\\Godot_4\\Godot.exe',
        `${process.env.USERPROFILE}\\Godot\\Godot.exe`
      );
    } else if (osPlatform === 'linux') {
      possiblePaths.push(
        '/usr/bin/godot',
        '/usr/local/bin/godot',
        '/snap/bin/godot',
        `${process.env.HOME}/.local/bin/godot`
      );
    }

    // Try each possible path
    for (const path of possiblePaths) {
      const normalizedPath = normalize(path);
      if (await this.isValidGodotPath(normalizedPath)) {
        this.godotPath = normalizedPath;
        this.logDebug(`Found Godot at: ${normalizedPath}`);
        return;
      }
    }

    // If we get here, we couldn't find Godot
    this.logDebug(`Warning: Could not find Godot in common locations for ${osPlatform}`);
    console.error(`[SERVER] Could not find Godot in common locations for ${osPlatform}`);
    console.error(`[SERVER] Set GODOT_PATH=/path/to/godot environment variable or pass { godotPath: '/path/to/godot' } in the config to specify the correct path.`);

    if (this.strictPathValidation) {
      // In strict mode, throw an error
      throw new Error(`Could not find a valid Godot executable. Set GODOT_PATH or provide a valid path in config.`);
    } else {
      // Fallback to a default path in non-strict mode; this may not be valid and requires user configuration for reliability
      if (osPlatform === 'win32') {
        this.godotPath = normalize('C:\\Program Files\\Godot\\Godot.exe');
      } else if (osPlatform === 'darwin') {
        this.godotPath = normalize('/Applications/Godot.app/Contents/MacOS/Godot');
      } else {
        this.godotPath = normalize('/usr/bin/godot');
      }

      this.logDebug(`Using default path: ${this.godotPath}, but this may not work.`);
      console.error(`[SERVER] Using default path: ${this.godotPath}, but this may not work.`);
      console.error(`[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.`);
    }
  }

  /**
   * Set a custom Godot path
   * @param customPath Path to the Godot executable
   * @returns True if the path is valid and was set, false otherwise
   */
  public async setGodotPath(customPath: string): Promise<boolean> {
    if (!customPath) {
      return false;
    }

    // Normalize the path to ensure consistent format across platforms
    // (e.g., backslashes to forward slashes on Windows, resolving relative paths)
    const normalizedPath = normalize(customPath);
    if (await this.isValidGodotPath(normalizedPath)) {
      this.godotPath = normalizedPath;
      this.logDebug(`Godot path set to: ${normalizedPath}`);
      return true;
    }

    this.logDebug(`Failed to set invalid Godot path: ${normalizedPath}`);
    return false;
  }

  /**
   * Clean up resources when shutting down
   */
  private async cleanup() {
    this.logDebug('Cleaning up resources');
    if (this.activeProcess) {
      this.logDebug('Killing active Godot process');
      this.activeProcess.process.kill();
      this.activeProcess = null;
    }
    await this.server.close();
  }

  /**
   * Check if the Godot version is 4.4 or later
   * @param version The Godot version string
   * @returns True if the version is 4.4 or later
   */
  private isGodot44OrLater(version: string): boolean {
    const match = version.match(/^(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      return major > 4 || (major === 4 && minor >= 4);
    }
    return false;
  }

  /**
   * Normalize parameters to camelCase format
   * @param params Object with either snake_case or camelCase keys
   * @returns Object with all keys in camelCase format
   */
  private normalizeParameters(params: OperationParams): OperationParams {
    if (!params || typeof params !== 'object') {
      return params;
    }
    
    const result: OperationParams = {};
    
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        let normalizedKey = key;
        
        // If the key is in snake_case, convert it to camelCase using our mapping
        if (key.includes('_') && this.parameterMappings[key]) {
          normalizedKey = this.parameterMappings[key];
        }
        
        // Handle nested objects recursively
        if (typeof params[key] === 'object' && params[key] !== null && !Array.isArray(params[key])) {
          result[normalizedKey] = this.normalizeParameters(params[key] as OperationParams);
        } else {
          result[normalizedKey] = params[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Convert camelCase keys to snake_case
   * @param params Object with camelCase keys
   * @returns Object with snake_case keys
   */
  private convertCamelToSnakeCase(params: OperationParams): OperationParams {
    const result: OperationParams = {};
    
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        // Convert camelCase to snake_case
        const snakeKey = this.reverseParameterMappings[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        // Handle nested objects recursively
        if (typeof params[key] === 'object' && params[key] !== null && !Array.isArray(params[key])) {
          result[snakeKey] = this.convertCamelToSnakeCase(params[key] as OperationParams);
        } else {
          result[snakeKey] = params[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Execute a Godot operation using the operations script
   * @param operation The operation to execute
   * @param params The parameters for the operation
   * @param projectPath The path to the Godot project
   * @returns The stdout and stderr from the operation
   */
  private async executeOperation(
    operation: string,
    params: OperationParams,
    projectPath: string
  ): Promise<{ stdout: string; stderr: string }> {
    this.logDebug(`Executing operation: ${operation} in project: ${projectPath}`);
    this.logDebug(`Original operation params: ${JSON.stringify(params)}`);

    // Convert camelCase parameters to snake_case for Godot script
    const snakeCaseParams = this.convertCamelToSnakeCase(params);
    this.logDebug(`Converted snake_case params: ${JSON.stringify(snakeCaseParams)}`);


    // Ensure godotPath is set
    if (!this.godotPath) {
      await this.detectGodotPath();
      if (!this.godotPath) {
        throw new Error('Could not find a valid Godot executable path');
      }
    }

    try {
      // Serialize the snake_case parameters to a valid JSON string
      const paramsJson = JSON.stringify(snakeCaseParams);
      // Escape single quotes in the JSON string to prevent command injection
      const escapedParams = paramsJson.replace(/'/g, "'\\''");
      // On Windows, cmd.exe does not strip single quotes, so we use
      // double quotes and escape them to ensure the JSON is parsed
      // correctly by Godot.
      const isWindows = process.platform === 'win32';
      const quotedParams = isWindows
        ? `\"${paramsJson.replace(/\"/g, '\\"')}\"`
        : `'${escapedParams}'`;


      // Add debug arguments if debug mode is enabled
      const debugArgs = GODOT_DEBUG_MODE ? ['--debug-godot'] : [];

      // Construct the command with the operation and JSON parameters
      const cmd = [
        `"${this.godotPath}"`,
        '--headless',
        '--path',
        `"${projectPath}"`,
        '--script',
        `"${this.operationsScriptPath}"`,
        operation,
        quotedParams, // Pass the JSON string as a single argument
        ...debugArgs,
      ].join(' ');

      this.logDebug(`Command: ${cmd}`);

      const { stdout, stderr } = await execAsync(cmd);

      return { stdout, stderr };
    } catch (error: unknown) {
      // If execAsync throws, it still contains stdout/stderr
      if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
        const execError = error as Error & { stdout: string; stderr: string };
        return {
          stdout: execError.stdout,
          stderr: execError.stderr,
        };
      }

      throw error;
    }
  }

  /**
   * Get the structure of a Godot project
   * @param projectPath Path to the Godot project
   * @returns Object representing the project structure
   */
  private async getProjectStructure(projectPath: string): Promise<any> {
    try {
      // Get top-level directories in the project
      const entries = readdirSync(projectPath, { withFileTypes: true });

      const structure: any = {
        scenes: [],
        scripts: [],
        assets: [],
        other: [],
      };

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirName = entry.name.toLowerCase();

          // Skip hidden directories
          if (dirName.startsWith('.')) {
            continue;
          }

          // Count files in common directories
          if (dirName === 'scenes' || dirName.includes('scene')) {
            structure.scenes.push(entry.name);
          } else if (dirName === 'scripts' || dirName.includes('script')) {
            structure.scripts.push(entry.name);
          } else if (
            dirName === 'assets' ||
            dirName === 'textures' ||
            dirName === 'models' ||
            dirName === 'sounds' ||
            dirName === 'music'
          ) {
            structure.assets.push(entry.name);
          } else {
            structure.other.push(entry.name);
          }
        }
      }

      return structure;
    } catch (error) {
      this.logDebug(`Error getting project structure: ${error}`);
      return { error: 'Failed to get project structure' };
    }
  }

  /**
   * Find Godot projects in a directory
   * @param directory Directory to search
   * @param recursive Whether to search recursively
   * @returns Array of Godot projects
   */
  private findGodotProjects(directory: string, recursive: boolean): Array<{ path: string; name: string }> {
    const projects: Array<{ path: string; name: string }> = [];

    try {
      // Check if the directory itself is a Godot project
      const projectFile = join(directory, 'project.godot');
      if (existsSync(projectFile)) {
        projects.push({
          path: directory,
          name: basename(directory),
        });
      }

      // If not recursive, only check immediate subdirectories
      if (!recursive) {
        const entries = readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subdir = join(directory, entry.name);
            const projectFile = join(subdir, 'project.godot');
            if (existsSync(projectFile)) {
              projects.push({
                path: subdir,
                name: entry.name,
              });
            }
          }
        }
      } else {
        // Recursive search
        const entries = readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subdir = join(directory, entry.name);
            // Skip hidden directories
            if (entry.name.startsWith('.')) {
              continue;
            }
            // Check if this directory is a Godot project
            const projectFile = join(subdir, 'project.godot');
            if (existsSync(projectFile)) {
              projects.push({
                path: subdir,
                name: entry.name,
              });
            } else {
              // Recursively search this directory
              const subProjects = this.findGodotProjects(subdir, true);
              projects.push(...subProjects);
            }
          }
        }
      }
    } catch (error) {
      this.logDebug(`Error searching directory ${directory}: ${error}`);
    }

    return projects;
  }

  /**
   * Set up the tool handlers for the MCP server
   */
  private setupToolHandlers() {
    // Define available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'launch_editor',
          description: 'Launch Godot editor for a specific project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'run_project',
          description: 'Run the Godot project and capture output',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scene: {
                type: 'string',
                description: 'Optional: Specific scene to run',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'get_debug_output',
          description: 'Get the current debug output and errors',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'stop_project',
          description: 'Stop the currently running Godot project',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_godot_version',
          description: 'Get the installed Godot version',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'list_projects',
          description: 'List Godot projects in a directory',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory to search for Godot projects',
              },
              recursive: {
                type: 'boolean',
                description: 'Whether to search recursively (default: false)',
              },
            },
            required: ['directory'],
          },
        },
        {
          name: 'get_project_info',
          description: 'Retrieve metadata about a Godot project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'create_scene',
          description: 'Create a new Godot scene file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path where the scene file will be saved (relative to project)',
              },
              rootNodeType: {
                type: 'string',
                description: 'Type of the root node (e.g., Node2D, Node3D)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'add_node',
          description: 'Add a node to an existing scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to the parent node (e.g., "root" or "root/Player")',
              },
              nodeType: {
                type: 'string',
                description: 'Type of node to add (e.g., Sprite2D, CollisionShape2D)',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the new node',
              },
              properties: {
                type: 'object',
                description: 'Optional properties to set on the node',
              },
            },
            required: ['projectPath', 'scenePath', 'nodeType', 'nodeName'],
          },
        },
        {
          name: 'load_sprite',
          description: 'Load a sprite into a Sprite2D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              nodePath: {
                type: 'string',
                description: 'Path to the Sprite2D node (e.g., "root/Player/Sprite2D")',
              },
              texturePath: {
                type: 'string',
                description: 'Path to the texture file (relative to project)',
              },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'texturePath'],
          },
        },
        {
          name: 'export_mesh_library',
          description: 'Export a scene as a MeshLibrary resource',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (.tscn) to export',
              },
              outputPath: {
                type: 'string',
                description: 'Path where the mesh library (.res) will be saved',
              },
              meshItemNames: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Optional: Names of specific mesh items to include (defaults to all)',
              },
            },
            required: ['projectPath', 'scenePath', 'outputPath'],
          },
        },
        {
          name: 'save_scene',
          description: 'Save changes to a scene file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              newPath: {
                type: 'string',
                description: 'Optional: New path to save the scene to (for creating variants)',
              },
            },
            required: ['projectPath', 'scenePath'],
          },
        },
        {
          name: 'get_uid',
          description: 'Get the UID for a specific file in a Godot project (for Godot 4.4+)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              filePath: {
                type: 'string',
                description: 'Path to the file (relative to project) for which to get the UID',
              },
            },
            required: ['projectPath', 'filePath'],
          },
        },
        {
          name: 'update_project_uids',
          description: 'Update UID references in a Godot project by resaving resources (for Godot 4.4+)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'info',
          description: 'Get MCP server information, Godot connection status, and diagnostics',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Optional: Check specific project status',
              },
            },
            required: [],
          },
        },
        {
          name: 'create_light',
          description: 'Create a light node (OmniLight3D, SpotLight3D, or DirectionalLight3D) in a scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to parent node (e.g., "root/World")',
              },
              lightType: {
                type: 'string',
                enum: ['OmniLight3D', 'SpotLight3D', 'DirectionalLight3D'],
                description: 'Type of light to create',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the light node',
              },
              properties: {
                type: 'object',
                description: 'Light properties (color, energy, range, etc.)',
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'lightType', 'nodeName'],
          },
        },
        {
          name: 'configure_light',
          description: 'Configure properties of an existing light node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to scene file (relative to project)',
              },
              nodePath: {
                type: 'string',
                description: 'Path to the light node',
              },
              properties: {
                type: 'object',
                description: 'Properties: light_color, light_energy, shadow_enabled, shadow_bias, omni_range, spot_range, spot_angle, etc.',
              },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'properties'],
          },
        },
        {
          name: 'create_lightmap_gi',
          description: 'Create a LightmapGI node for baked lighting in a scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to parent node (e.g., "root/World")',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the LightmapGI node',
              },
              properties: {
                type: 'object',
                description: 'LightmapGI properties: bake_quality, bounce_indirect_energy, etc.',
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'configure_shadow',
          description: 'Configure shadow settings for a light node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to scene file (relative to project)',
              },
              nodePath: {
                type: 'string',
                description: 'Path to the light node',
              },
              shadowEnabled: {
                type: 'boolean',
                description: 'Enable or disable shadows',
              },
              shadowType: {
                type: 'string',
                enum: ['0', '1', '2'],
                description: 'Shadow type (0=disabled, 1=opaque shadow, 2=transparent shadow)',
              },
              properties: {
                type: 'object',
                description: 'Additional shadow properties: shadow_bias, shadow_normal_bias, shadow_transmittance, etc.',
              },
            },
              required: ['projectPath', 'scenePath', 'nodePath', 'shadowEnabled'],
          },
        },
        {
          name: 'create_world_environment',
          description: 'Create a WorldEnvironment node with Environment resource',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to parent node (e.g., "root/World")',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the WorldEnvironment node',
                default: 'WorldEnvironment',
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath'],
          },
        },
        {
          name: 'configure_environment',
          description: 'Configure properties of an existing WorldEnvironment node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              nodePath: {
                type: 'string',
                description: 'Path to the WorldEnvironment node',
              },
              environmentSettings: {
                type: 'object',
                description: 'Environment settings: background_mode, ambient_light, fog, glow, ssao, etc.',
              },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'environmentSettings'],
          },
        },
        {
          name: 'create_sky',
          description: 'Create a WorldEnvironment with sky resource (ProceduralSkyMaterial, PhysicalSkyMaterial)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to parent node (e.g., "root/World")',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the node',
                default: 'SkyEnvironment',
              },
              skySettings: {
                type: 'object',
                description: 'Sky material settings: sky_mode, ground_horizon_color, sky_horizon_color, etc.',
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath'],
          },
        },
        {
          name: 'create_audio_player',
          description: 'Create an AudioStreamPlayer, AudioStreamPlayer2D, or AudioStreamPlayer3D',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              scenePath: {
                type: 'string',
                description: 'Path to the scene file (relative to project)',
              },
              parentNodePath: {
                type: 'string',
                description: 'Path to parent node (e.g., "root" or "root/Player")',
              },
              playerType: {
                type: 'string',
                enum: ['AudioStreamPlayer', 'AudioStreamPlayer2D', 'AudioStreamPlayer3D'],
                description: 'Type of audio player to create',
              },
              nodeName: {
                type: 'string',
                description: 'Name for the audio player node',
              },
              streamPath: {
                type: 'string',
                description: 'Path to audio file (optional)',
              },
              bus: {
                type: 'string',
                description: 'Audio bus name (default: Master)',
              },
              properties: {
                type: 'object',
                description: 'Player properties (volume_db, autoplay, etc.)',
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'playerType', 'nodeName'],
          },
        },
        {
          name: 'configure_audio_bus',
          description: 'Configure audio bus settings (volume, effects, routing)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              busName: {
                type: 'string',
                description: 'Bus name (Master, SFX, Music, etc.)',
              },
              volumeDb: {
                type: 'number',
                description: 'Volume in decibels (default: 0)',
              },
              mute: {
                type: 'boolean',
                description: 'Mute the bus',
              },
              solo: {
                type: 'boolean',
                description: 'Solo the bus',
              },
              sendTo: {
                type: 'string',
                description: 'Bus to route audio to',
              },
            },
            required: ['projectPath', 'busName'],
          },
        },
        {
          name: 'add_audio_effect',
          description: 'Add an audio effect to a bus (Reverb, Delay, EQ, Compressor, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              busName: {
                type: 'string',
                description: 'Bus name to add effect to',
              },
              effectType: {
                type: 'string',
                enum: ['AudioEffectReverb', 'AudioEffectDelay', 'AudioEffectChorus',
                       'AudioEffectDistortion', 'AudioEffectEQ', 'AudioEffectCompressor',
                       'AudioEffectLimiter', 'AudioEffectPhaser', 'AudioEffectPitchShift',
                       'AudioEffectSpectrumAnalyzer', 'AudioEffectRecord'],
                description: 'Type of audio effect',
              },
              properties: {
                type: 'object',
                description: 'Effect-specific properties',
              },
            },
            required: ['projectPath', 'busName', 'effectType'],
          },
        },
        {
          name: 'create_audio_bus_layout',
          description: 'Create an AudioBusLayout resource file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              layoutPath: {
                type: 'string',
                description: 'Output path for the layout file (.tres)',
              },
              buses: {
                type: 'array',
                description: 'Array of bus definitions',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Bus name' },
                    volumeDb: { type: 'number', description: 'Volume in decibels' },
                    sendTo: { type: 'string', description: 'Send to bus' },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['projectPath', 'layoutPath', 'buses'],
          },
        },
        {
          name: 'get_audio_bus_info',
          description: 'Get configuration for a specific audio bus',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
              busName: {
                type: 'string',
                description: 'Bus name to query',
              },
            },
            required: ['projectPath', 'busName'],
          },
        },
        {
          name: 'list_audio_buses',
          description: 'List all audio buses in the project with their effects and routing',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Path to the Godot project directory',
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'create_particle_system',
          description: 'Create a GPUParticles2D, GPUParticles3D, CPUParticles2D, or CPUParticles3D',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node (e.g., "root" or "root/World")' },
              particleType: {
                type: 'string',
                enum: ['GPUParticles2D', 'GPUParticles3D', 'CPUParticles2D', 'CPUParticles3D'],
                description: 'Type of particle system to create',
              },
              nodeName: { type: 'string', description: 'Name for the particle system node' },
              amount: { type: 'number', description: 'Number of particles (default: 8)' },
              lifetime: { type: 'number', description: 'Particle lifetime in seconds (default: 1.0)' },
              oneShot: { type: 'boolean', description: 'Emit once then stop (default: false)' },
              emitting: { type: 'boolean', description: 'Whether the system is emitting (default: true)' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'particleType', 'nodeName'],
          },
        },
        {
          name: 'configure_particle_material',
          description: 'Configure ParticleProcessMaterial for a particle system',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              nodePath: { type: 'string', description: 'Path to the particle system node' },
              material: {
                type: 'object',
                description: 'Material settings: emission_shape, direction, spread, gravity, initial_velocity, scale, color, etc.',
              },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'material'],
          },
        },
        {
          name: 'create_particle_material',
          description: 'Create a ParticleProcessMaterial resource file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              materialPath: { type: 'string', description: 'Output path for the material file (.tres)' },
              properties: {
                type: 'object',
                description: 'Material properties (emission_shape, direction, etc.)',
              },
            },
            required: ['projectPath', 'materialPath'],
          },
        },
        {
          name: 'create_navigation_region',
          description: 'Create a NavigationRegion2D or NavigationRegion3D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the navigation region node' },
              is3d: { type: 'boolean', description: 'Whether to create a 3D navigation region (default: true)' },
              properties: { type: 'object', description: 'Optional properties to set' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'create_navigation_agent',
          description: 'Create a NavigationAgent2D or NavigationAgent3D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the navigation agent node' },
              is3d: { type: 'boolean', description: 'Whether to create a 3D navigation agent (default: true)' },
              properties: { type: 'object', description: 'Optional properties to set' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'configure_navigation_mesh',
          description: 'Configure and optionally bake a navigation mesh for a region',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              nodePath: { type: 'string', description: 'Path to the NavigationRegion node' },
              bake: { type: 'boolean', description: 'Whether to bake the navigation mesh after configuration (default: true)' },
              properties: { type: 'object', description: 'Optional properties to set on the region or its navigation mesh' },
            },
            required: ['projectPath', 'scenePath', 'nodePath'],
          },
        },
        {
          name: 'create_navigation_link',
          description: 'Create a NavigationLink2D or NavigationLink3D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the navigation link node' },
              is3d: { type: 'boolean', description: 'Whether to create a 3D navigation link (default: true)' },
              properties: { type: 'object', description: 'Optional properties to set' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'configure_multiplayer',
          description: 'Configure multiplayer settings in project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              peerType: { 
                type: 'string', 
                enum: ['ENetMultiplayerPeer', 'WebSocketMultiplayerPeer', 'WebRTCMultiplayerPeer'],
                description: 'Type of multiplayer peer'
              },
              maxClients: { type: 'number', description: 'Maximum number of clients' },
              transferMode: { 
                type: 'string', 
                enum: ['reliable', 'unreliable', 'ordered'],
                description: 'Default transfer mode'
              },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'create_multiplayer_spawner',
          description: 'Create a MultiplayerSpawner node in a scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the spawner node' },
              spawnPath: { type: 'string', description: 'Path to the node where entities will be spawned' },
              autoSpawnList: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of scene paths that can be auto-spawned'
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'create_multiplayer_synchronizer',
          description: 'Create a MultiplayerSynchronizer node in a scene',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the synchronizer node' },
              rootPath: { type: 'string', description: 'Path to the node to synchronize' },
              replicationInterval: { type: 'number', description: 'Replication interval in seconds' },
              properties: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of property paths to synchronize'
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'add_rpc_config',
          description: 'Add RPC configuration to a node/script',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              nodePath: { type: 'string', description: 'Path to the node' },
              methodName: { type: 'string', description: 'Name of the method to configure RPC for' },
              rpcMode: { 
                type: 'string', 
                enum: ['disabled', 'any_peer', 'authority'],
                description: 'RPC mode'
              },
              transferMode: { 
                type: 'string', 
                enum: ['reliable', 'unreliable', 'ordered'],
                description: 'Transfer mode'
              },
              callLocal: { type: 'boolean', description: 'Whether to call the method locally as well' },
              channel: { type: 'number', description: 'Transfer channel' },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'methodName'],
          },
        },
        {
          name: 'get_multiplayer_info',
          description: 'Get multiplayer information for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'create_physics_joint',
          description: 'Create a physics joint (PinJoint2D/3D, HingeJoint3D, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              parentNodePath: { type: 'string' },
              nodeName: { type: 'string' },
              jointType: { 
                type: 'string',
                enum: ['PinJoint2D', 'GrooveJoint2D', 'DampedSpringJoint2D', 
                       'PinJoint3D', 'HingeJoint3D', 'SliderJoint3D', 'ConeTwistJoint3D', 'Generic6DOFJoint3D']
              },
              nodeA: { type: 'string', description: 'Path to the first node' },
              nodeB: { type: 'string', description: 'Path to the second node' },
              properties: { type: 'object' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName', 'jointType'],
          },
        },
        {
          name: 'create_physics_material',
          description: 'Create a PhysicsMaterial resource file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              materialPath: { type: 'string', description: 'Path to save the material (.tres)' },
              friction: { type: 'number' },
              rough: { type: 'boolean' },
              bounce: { type: 'number' },
              absorbent: { type: 'boolean' },
            },
            required: ['projectPath', 'materialPath'],
          },
        },
        {
          name: 'configure_collision_layers',
          description: 'Configure collision layers and masks for a node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              nodePath: { type: 'string' },
              collisionLayer: { type: 'number' },
              collisionMask: { type: 'number' },
            },
            required: ['projectPath', 'scenePath', 'nodePath'],
          },
        },
        {
          name: 'create_raycast',
          description: 'Create a RayCast2D or RayCast3D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              parentNodePath: { type: 'string' },
              nodeName: { type: 'string' },
              is3d: { type: 'boolean', default: true },
              enabled: { type: 'boolean', default: true },
              targetPosition: { type: 'object', description: 'Vector2 or Vector3' },
              properties: { type: 'object' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'create_collision_shape',
          description: 'Create a CollisionShape2D or CollisionShape3D with a shape',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              parentNodePath: { type: 'string' },
              nodeName: { type: 'string' },
              is3d: { type: 'boolean', default: true },
              shapeType: { 
                type: 'string',
                enum: ['RectangleShape2D', 'CircleShape2D', 'CapsuleShape2D', 'SeparationRayShape2D', 
                       'WorldBoundaryShape2D', 'SegmentShape2D', 'ConcavePolygonShape2D', 'ConvexPolygonShape2D',
                       'BoxShape3D', 'SphereShape3D', 'CapsuleShape3D', 'CylinderShape3D', 
                       'WorldBoundaryShape3D', 'SeparationRayShape3D', 'ConcavePolygonShape3D', 'ConvexPolygonShape3D']
              },
              shapeProperties: { type: 'object' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName', 'shapeType'],
          },
        },
        {
          name: 'create_area',
          description: 'Create an Area2D or Area3D node',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              parentNodePath: { type: 'string' },
              nodeName: { type: 'string' },
              is3d: { type: 'boolean', default: true },
              properties: { type: 'object' },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName'],
          },
        },
        {
          name: 'create_animation_tree',
          description: 'Create an AnimationTree node with a state machine or blend tree',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file (relative to project)' },
              parentNodePath: { type: 'string', description: 'Path to parent node' },
              nodeName: { type: 'string', description: 'Name for the AnimationTree node' },
              animationPlayerPath: { type: 'string', description: 'Path to the AnimationPlayer node' },
              treeType: { 
                type: 'string', 
                enum: ['AnimationNodeStateMachine', 'AnimationNodeBlendTree'],
                description: 'Type of root animation node'
              },
            },
            required: ['projectPath', 'scenePath', 'parentNodePath', 'nodeName', 'treeType'],
          },
        },
        {
          name: 'add_animation_state',
          description: 'Add a state to an AnimationNodeStateMachine',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              animationTreePath: { type: 'string', description: 'Path to the AnimationTree node' },
              stateName: { type: 'string', description: 'Name for the new state' },
              animationName: { type: 'string', description: 'Name of the animation to play' },
              position: { 
                type: 'object', 
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                description: 'Position in the state machine editor'
              },
            },
            required: ['projectPath', 'scenePath', 'animationTreePath', 'stateName'],
          },
        },
        {
          name: 'add_animation_transition',
          description: 'Add a transition between states in an AnimationNodeStateMachine',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              animationTreePath: { type: 'string' },
              fromState: { type: 'string' },
              toState: { type: 'string' },
              properties: { type: 'object', description: 'Transition properties (switch_mode, advance_mode, etc.)' },
            },
            required: ['projectPath', 'scenePath', 'animationTreePath', 'fromState', 'toState'],
          },
        },
        {
          name: 'configure_blend_tree',
          description: 'Add and configure nodes in an AnimationNodeBlendTree',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              animationTreePath: { type: 'string' },
              nodeName: { type: 'string' },
              nodeType: { type: 'string', description: 'Type of animation node (e.g., AnimationNodeOneShot)' },
              properties: { type: 'object' },
            },
            required: ['projectPath', 'scenePath', 'animationTreePath', 'nodeName', 'nodeType'],
          },
        },
        {
          name: 'set_animation_tree_parameter',
          description: 'Set a parameter value on an AnimationTree',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string' },
              scenePath: { type: 'string' },
              animationTreePath: { type: 'string' },
              parameterName: { type: 'string' },
              value: { type: 'any' },
            },
            required: ['projectPath', 'scenePath', 'animationTreePath', 'parameterName', 'value'],
          },
        },
        {
          name: 'create_theme',
          description: 'Create a Theme resource file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              themePath: { type: 'string', description: 'Output path for theme file (.tres)' },
              defaultFont: { type: 'string', description: 'Path to default font file' },
              defaultFontSize: { type: 'number' },
            },
            required: ['projectPath', 'themePath'],
          },
        },
        {
          name: 'configure_theme_type',
          description: 'Configure styles for a control type in a Theme resource',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              themePath: { type: 'string', description: 'Path to the theme file' },
              typeName: { type: 'string', description: 'Control type name (e.g., "Button", "Label")' },
              data: {
                type: 'object',
                description: 'Style data: colors, constants, fonts, font_sizes, icons, styleboxes',
                properties: {
                  colors: { type: 'object', additionalProperties: { type: 'string' } },
                  constants: { type: 'object', additionalProperties: { type: 'number' } },
                  fonts: { type: 'object', additionalProperties: { type: 'string' } },
                  font_sizes: { type: 'object', additionalProperties: { type: 'number' } },
                  icons: { type: 'object', additionalProperties: { type: 'string' } },
                  styleboxes: { type: 'object', additionalProperties: { type: 'string' } },
                }
              },
            },
            required: ['projectPath', 'themePath', 'typeName', 'data'],
          },
        },
        {
          name: 'create_stylebox',
          description: 'Create a StyleBox resource file',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              styleboxPath: { type: 'string', description: 'Output path for the stylebox file (.tres)' },
              styleboxType: {
                type: 'string',
                enum: ['StyleBoxFlat', 'StyleBoxTexture', 'StyleBoxLine', 'StyleBoxEmpty'],
                description: 'Type of StyleBox'
              },
              properties: { type: 'object', description: 'StyleBox properties' },
            },
            required: ['projectPath', 'styleboxPath', 'styleboxType'],
          },
        },
        {
          name: 'configure_control_anchors',
          description: 'Configure anchors and offsets for a Control node using presets',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the Godot project directory' },
              scenePath: { type: 'string', description: 'Path to the scene file' },
              nodePath: { type: 'string', description: 'Path to the Control node' },
              anchorPreset: { 
                type: 'number', 
                description: 'Layout preset index (0-15). 0: Top-Left, 8: Center, 15: Full Rect, etc.' 
              },
              layoutMode: { type: 'number', description: 'Layout preset mode (0-3)' },
              margin: { type: 'number', description: 'Margin/Offset from anchor' },
            },
            required: ['projectPath', 'scenePath', 'nodePath', 'anchorPreset'],
          },
        },
      ],
    }));
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logDebug(`Handling tool request: ${request.params.name}`);
      switch (request.params.name) {
        case 'launch_editor':
          return await this.handleLaunchEditor(request.params.arguments);
        case 'run_project':
          return await this.handleRunProject(request.params.arguments);
        case 'get_debug_output':
          return await this.handleGetDebugOutput();
        case 'stop_project':
          return await this.handleStopProject();
        case 'get_godot_version':
          return await this.handleGetGodotVersion();
        case 'list_projects':
          return await this.handleListProjects(request.params.arguments);
        case 'get_project_info':
          return await this.handleGetProjectInfo(request.params.arguments);
        case 'create_scene':
          return await this.handleCreateScene(request.params.arguments);
        case 'add_node':
          return await this.handleAddNode(request.params.arguments);
        case 'load_sprite':
          return await this.handleLoadSprite(request.params.arguments);
        case 'export_mesh_library':
          return await this.handleExportMeshLibrary(request.params.arguments);
        case 'save_scene':
          return await this.handleSaveScene(request.params.arguments);
        case 'get_uid':
          return await this.handleGetUid(request.params.arguments);
        case 'update_project_uids':
          return await this.handleUpdateProjectUids(request.params.arguments);
        case 'info':
          return await this.handleInfo(request.params.arguments);
        case 'create_light':
          return await this.handleCreateLight(request.params.arguments);
        case 'configure_light':
          return await this.handleConfigureLight(request.params.arguments);
        case 'create_lightmap_gi':
          return await this.handleCreateLightmapGi(request.params.arguments);
        case 'configure_shadow':
          return await this.handleConfigureShadow(request.params.arguments);
        case 'create_world_environment':
          return await this.handleCreateWorldEnvironment(request.params.arguments);
        case 'configure_environment':
          return await this.handleConfigureEnvironment(request.params.arguments);
        case 'create_sky':
          return await this.handleCreateSky(request.params.arguments);
        case 'create_audio_player':
          return await this.handleCreateAudioPlayer(request.params.arguments);
        case 'configure_audio_bus':
          return await this.handleConfigureAudioBus(request.params.arguments);
        case 'add_audio_effect':
          return await this.handleAddAudioEffect(request.params.arguments);
        case 'create_audio_bus_layout':
          return await this.handleCreateAudioBusLayout(request.params.arguments);
        case 'get_audio_bus_info':
          return await this.handleGetAudioBusInfo(request.params.arguments);
        case 'list_audio_buses':
          return await this.handleListAudioBuses(request.params.arguments);
        case 'create_particle_system':
          return await this.handleCreateParticleSystem(request.params.arguments);
        case 'configure_particle_material':
          return await this.handleConfigureParticleMaterial(request.params.arguments);
        case 'create_particle_material':
          return await this.handleCreateParticleMaterial(request.params.arguments);
        case 'create_navigation_region':
          return await this.handleCreateNavigationRegion(request.params.arguments);
        case 'create_navigation_agent':
          return await this.handleCreateNavigationAgent(request.params.arguments);
        case 'configure_navigation_mesh':
          return await this.handleConfigureNavigationMesh(request.params.arguments);
        case 'create_navigation_link':
          return await this.handleCreateNavigationLink(request.params.arguments);
        case 'configure_multiplayer':
          return await this.handleConfigureMultiplayer(request.params.arguments);
        case 'create_multiplayer_spawner':
          return await this.handleCreateMultiplayerSpawner(request.params.arguments);
        case 'create_multiplayer_synchronizer':
          return await this.handleCreateMultiplayerSynchronizer(request.params.arguments);
        case 'add_rpc_config':
          return await this.handleAddRpcConfig(request.params.arguments);
        case 'get_multiplayer_info':
          return await this.handleGetMultiplayerInfo(request.params.arguments);
        case 'create_physics_joint':
          return await this.handleCreatePhysicsJoint(request.params.arguments);
        case 'create_physics_material':
          return await this.handleCreatePhysicsMaterial(request.params.arguments);
        case 'configure_collision_layers':
          return await this.handleConfigureCollisionLayers(request.params.arguments);
        case 'create_raycast':
          return await this.handleCreateRaycast(request.params.arguments);
        case 'create_collision_shape':
          return await this.handleCreateCollisionShape(request.params.arguments);
        case 'create_area':
          return await this.handleCreateArea(request.params.arguments);
        case 'create_animation_tree':
          return await this.handleCreateAnimationTree(request.params.arguments);
        case 'add_animation_state':
          return await this.handleAddAnimationState(request.params.arguments);
        case 'add_animation_transition':
          return await this.handleAddAnimationTransition(request.params.arguments);
        case 'configure_blend_tree':
          return await this.handleConfigureBlendTree(request.params.arguments);
        case 'set_animation_tree_parameter':
          return await this.handleSetAnimationTreeParameter(request.params.arguments);
        case 'create_theme':
          return await this.handleCreateTheme(request.params.arguments);
        case 'configure_theme_type':
          return await this.handleConfigureThemeType(request.params.arguments);
        case 'create_stylebox':
          return await this.handleCreateStylebox(request.params.arguments);
        case 'configure_control_anchors':
          return await this.handleConfigureControlAnchors(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Handle the launch_editor tool
   * @param args Tool arguments
   */
  private async handleLaunchEditor(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      this.logDebug(`Launching Godot editor for project: ${args.projectPath}`);
      const process = spawn(this.godotPath, ['-e', '--path', args.projectPath], {
        stdio: 'pipe',
      });

      process.on('error', (err: Error) => {
        console.error('Failed to start Godot editor:', err);
      });

      return {
        content: [
          {
            type: 'text',
            text: `Godot editor launched successfully for project at ${args.projectPath}.`,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to launch Godot editor: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the run_project tool
   * @param args Tool arguments
   */
  private async handleRunProject(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Kill any existing process
      if (this.activeProcess) {
        this.logDebug('Killing existing Godot process before starting a new one');
        this.activeProcess.process.kill();
      }

      const cmdArgs = ['-d', '--path', args.projectPath];
      if (args.scene && this.validatePath(args.scene)) {
        this.logDebug(`Adding scene parameter: ${args.scene}`);
        cmdArgs.push(args.scene);
      }

      this.logDebug(`Running Godot project: ${args.projectPath}`);
      const process = spawn(this.godotPath!, cmdArgs, { stdio: 'pipe' });
      const output: string[] = [];
      const errors: string[] = [];

      process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        output.push(...lines);
        lines.forEach((line: string) => {
          if (line.trim()) this.logDebug(`[Godot stdout] ${line}`);
        });
      });

      process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        errors.push(...lines);
        lines.forEach((line: string) => {
          if (line.trim()) this.logDebug(`[Godot stderr] ${line}`);
        });
      });

      process.on('exit', (code: number | null) => {
        this.logDebug(`Godot process exited with code ${code}`);
        if (this.activeProcess && this.activeProcess.process === process) {
          this.activeProcess = null;
        }
      });

      process.on('error', (err: Error) => {
        console.error('Failed to start Godot process:', err);
        if (this.activeProcess && this.activeProcess.process === process) {
          this.activeProcess = null;
        }
      });

      this.activeProcess = { process, output, errors };

      return {
        content: [
          {
            type: 'text',
            text: `Godot project started in debug mode. Use get_debug_output to see output.`,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to run Godot project: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the get_debug_output tool
   */
  private async handleGetDebugOutput() {
    if (!this.activeProcess) {
      return this.createErrorResponse(
        'No active Godot process.',
        [
          'Use run_project to start a Godot project first',
          'Check if the Godot process crashed unexpectedly',
        ]
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              output: this.activeProcess.output,
              errors: this.activeProcess.errors,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle the stop_project tool
   */
  private async handleStopProject() {
    if (!this.activeProcess) {
      return this.createErrorResponse(
        'No active Godot process to stop.',
        [
          'Use run_project to start a Godot project first',
          'The process may have already terminated',
        ]
      );
    }

    this.logDebug('Stopping active Godot process');
    this.activeProcess.process.kill();
    const output = this.activeProcess.output;
    const errors = this.activeProcess.errors;
    this.activeProcess = null;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Godot project stopped',
              finalOutput: output,
              finalErrors: errors,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle the get_godot_version tool
   */
  private async handleGetGodotVersion() {
    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      this.logDebug('Getting Godot version');
      const { stdout } = await execAsync(`"${this.godotPath}" --version`);
      return {
        content: [
          {
            type: 'text',
            text: stdout.trim(),
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        `Failed to get Godot version: ${errorMessage}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
        ]
      );
    }
  }

  /**
   * Handle the list_projects tool
   */
  private async handleListProjects(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.directory) {
      return this.createErrorResponse(
        'Directory is required',
        ['Provide a valid directory path to search for Godot projects']
      );
    }

    if (!this.validatePath(args.directory)) {
      return this.createErrorResponse(
        'Invalid directory path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      this.logDebug(`Listing Godot projects in directory: ${args.directory}`);
      if (!existsSync(args.directory)) {
        return this.createErrorResponse(
          `Directory does not exist: ${args.directory}`,
          ['Provide a valid directory path that exists on the system']
        );
      }

      const recursive = args.recursive === true;
      const projects = this.findGodotProjects(args.directory, recursive);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to list projects: ${error?.message || 'Unknown error'}`,
        [
          'Ensure the directory exists and is accessible',
          'Check if you have permission to read the directory',
        ]
      );
    }
  }

  /**
   * Get the structure of a Godot project asynchronously by counting files recursively
   * @param projectPath Path to the Godot project
   * @returns Promise resolving to an object with counts of scenes, scripts, assets, and other files
   */
  private getProjectStructureAsync(projectPath: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        const structure = {
          scenes: 0,
          scripts: 0,
          assets: 0,
          other: 0,
        };

        const scanDirectory = (currentPath: string) => {
          const entries = readdirSync(currentPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const entryPath = join(currentPath, entry.name);
            
            // Skip hidden files and directories
            if (entry.name.startsWith('.')) {
              continue;
            }
            
            if (entry.isDirectory()) {
              // Recursively scan subdirectories
              scanDirectory(entryPath);
            } else if (entry.isFile()) {
              // Count file by extension
              const ext = entry.name.split('.').pop()?.toLowerCase();
              
              if (ext === 'tscn') {
                structure.scenes++;
              } else if (ext === 'gd' || ext === 'gdscript' || ext === 'cs') {
                structure.scripts++;
              } else if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'ttf', 'wav', 'mp3', 'ogg'].includes(ext || '')) {
                structure.assets++;
              } else {
                structure.other++;
              }
            }
          }
        };
        
        // Start scanning from the project root
        scanDirectory(projectPath);
        resolve(structure);
      } catch (error) {
        this.logDebug(`Error getting project structure asynchronously: ${error}`);
        resolve({ 
          error: 'Failed to get project structure',
          scenes: 0,
          scripts: 0,
          assets: 0,
          other: 0
        });
      }
    });
  }

  /**
   * Handle the get_project_info tool
   */
  private async handleGetProjectInfo(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }
  
    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }
  
    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }
  
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }
  
      this.logDebug(`Getting project info for: ${args.projectPath}`);
  
      // Get Godot version
      const execOptions = { timeout: 10000 }; // 10 second timeout
      const { stdout } = await execAsync(`"${this.godotPath}" --version`, execOptions);
  
      // Get project structure using the recursive method
      const projectStructure = await this.getProjectStructureAsync(args.projectPath);
  
      // Extract project name from project.godot file
      let projectName = basename(args.projectPath);
      try {
        const fs = require('fs');
        const projectFileContent = fs.readFileSync(projectFile, 'utf8');
        const configNameMatch = projectFileContent.match(/config\/name="([^"]+)"/);
        if (configNameMatch && configNameMatch[1]) {
          projectName = configNameMatch[1];
          this.logDebug(`Found project name in config: ${projectName}`);
        }
      } catch (error) {
        this.logDebug(`Error reading project file: ${error}`);
        // Continue with default project name if extraction fails
      }
  
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: projectName,
                path: args.projectPath,
                godotVersion: stdout.trim(),
                structure: projectStructure,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to get project info: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the create_scene tool
   */
  private async handleCreateScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath) {
      return this.createErrorResponse(
        'Project path and scene path are required',
        ['Provide valid paths for both the project and the scene']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        scenePath: args.scenePath,
        rootNodeType: args.rootNodeType || 'Node2D',
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('create_scene', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to create scene: ${stderr}`,
          [
            'Check if the root node type is valid',
            'Ensure you have write permissions to the scene path',
            'Verify the scene path is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Scene created successfully at: ${args.scenePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to create scene: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the add_node tool
   */
  private async handleAddNode(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.nodeType || !args.nodeName) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodeType, and nodeName']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
        nodeType: args.nodeType,
        nodeName: args.nodeName,
      };

      // Add optional parameters
      if (args.parentNodePath) {
        params.parentNodePath = args.parentNodePath;
      }

      if (args.properties) {
        params.properties = args.properties;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('add_node', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to add node: ${stderr}`,
          [
            'Check if the node type is valid',
            'Ensure the parent node path exists',
            'Verify the scene file is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Node '${args.nodeName}' of type '${args.nodeType}' added successfully to '${args.scenePath}'.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to add node: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the load_sprite tool
   */
  private async handleLoadSprite(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.nodePath || !args.texturePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodePath, and texturePath']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.nodePath) ||
      !this.validatePath(args.texturePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Check if the texture file exists
      const texturePath = join(args.projectPath, args.texturePath);
      if (!existsSync(texturePath)) {
        return this.createErrorResponse(
          `Texture file does not exist: ${args.texturePath}`,
          [
            'Ensure the texture path is correct',
            'Upload or create the texture file first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        scenePath: args.scenePath,
        nodePath: args.nodePath,
        texturePath: args.texturePath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('load_sprite', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to load sprite: ${stderr}`,
          [
            'Check if the node path is correct',
            'Ensure the node is a Sprite2D, Sprite3D, or TextureRect',
            'Verify the texture file is a valid image format',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Sprite loaded successfully with texture: ${args.texturePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to load sprite: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the export_mesh_library tool
   */
  private async handleExportMeshLibrary(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath || !args.outputPath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, and outputPath']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.outputPath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
        outputPath: args.outputPath,
      };

      // Add optional parameters
      if (args.meshItemNames && Array.isArray(args.meshItemNames)) {
        params.meshItemNames = args.meshItemNames;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('export_mesh_library', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to export mesh library: ${stderr}`,
          [
            'Check if the scene contains valid 3D meshes',
            'Ensure the output path is valid',
            'Verify the scene file is valid',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `MeshLibrary exported successfully to: ${args.outputPath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to export mesh library: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the save_scene tool
   */
  private async handleSaveScene(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.scenePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath and scenePath']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.scenePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    // If newPath is provided, validate it
    if (args.newPath && !this.validatePath(args.newPath)) {
      return this.createErrorResponse(
        'Invalid new path',
        ['Provide a valid new path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the scene file exists
      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          [
            'Ensure the scene path is correct',
            'Use create_scene to create a new scene first',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params: any = {
        scenePath: args.scenePath,
      };

      // Add optional parameters
      if (args.newPath) {
        params.newPath = args.newPath;
      }

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('save_scene', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to save scene: ${stderr}`,
          [
            'Check if the scene file is valid',
            'Ensure you have write permissions to the output path',
            'Verify the scene can be properly packed',
          ]
        );
      }

      const savePath = args.newPath || args.scenePath;
      return {
        content: [
          {
            type: 'text',
            text: `Scene saved successfully to: ${savePath}\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to save scene: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the get_uid tool
   */
  private async handleGetUid(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath || !args.filePath) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath and filePath']
      );
    }

    if (!this.validatePath(args.projectPath) || !this.validatePath(args.filePath)) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Check if the file exists
      const filePath = join(args.projectPath, args.filePath);
      if (!existsSync(filePath)) {
        return this.createErrorResponse(
          `File does not exist: ${args.filePath}`,
          ['Ensure the file path is correct']
        );
      }

      // Get Godot version to check if UIDs are supported
      const { stdout: versionOutput } = await execAsync(`"${this.godotPath}" --version`);
      const version = versionOutput.trim();

      if (!this.isGodot44OrLater(version)) {
        return this.createErrorResponse(
          `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
          [
            'Upgrade to Godot 4.4 or later to use UIDs',
            'Use resource paths instead of UIDs for this version of Godot',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        filePath: args.filePath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('get_uid', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to get UID: ${stderr}`,
          [
            'Check if the file is a valid Godot resource',
            'Ensure the file path is correct',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `UID for ${args.filePath}: ${stdout.trim()}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to get UID: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the update_project_uids tool
   */
  private async handleUpdateProjectUids(args: any) {
    // Normalize parameters to camelCase
    args = this.normalizeParameters(args);
    
    if (!args.projectPath) {
      return this.createErrorResponse(
        'Project path is required',
        ['Provide a valid path to a Godot project directory']
      );
    }

    if (!this.validatePath(args.projectPath)) {
      return this.createErrorResponse(
        'Invalid project path',
        ['Provide a valid path without ".." or other potentially unsafe characters']
      );
    }

    try {
      // Ensure godotPath is set
      if (!this.godotPath) {
        await this.detectGodotPath();
        if (!this.godotPath) {
          return this.createErrorResponse(
            'Could not find a valid Godot executable path',
            [
              'Ensure Godot is installed correctly',
              'Set GODOT_PATH environment variable to specify the correct path',
            ]
          );
        }
      }

      // Check if the project directory exists and contains a project.godot file
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          [
            'Ensure the path points to a directory containing a project.godot file',
            'Use list_projects to find valid Godot projects',
          ]
        );
      }

      // Get Godot version to check if UIDs are supported
      const { stdout: versionOutput } = await execAsync(`"${this.godotPath}" --version`);
      const version = versionOutput.trim();

      if (!this.isGodot44OrLater(version)) {
        return this.createErrorResponse(
          `UIDs are only supported in Godot 4.4 or later. Current version: ${version}`,
          [
            'Upgrade to Godot 4.4 or later to use UIDs',
            'Use resource paths instead of UIDs for this version of Godot',
          ]
        );
      }

      // Prepare parameters for the operation (already in camelCase)
      const params = {
        projectPath: args.projectPath,
      };

      // Execute the operation
      const { stdout, stderr } = await this.executeOperation('resave_resources', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to update project UIDs: ${stderr}`,
          [
            'Check if the project is valid',
            'Ensure you have write permissions to the project directory',
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Project UIDs updated successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to update project UIDs: ${error?.message || 'Unknown error'}`,
        [
          'Ensure Godot is installed correctly',
          'Check if the GODOT_PATH environment variable is set correctly',
          'Verify the project path is accessible',
        ]
      );
    }
  }

  /**
   * Handle the info tool
   * Get MCP server information, Godot connection status, and diagnostics
   * @param args Tool arguments (optional projectPath)
   */
  private async handleInfo(args: any) {
    try {
      // Normalize parameters to camelCase
      args = this.normalizeParameters(args);

      // Read version from package.json
      let serverVersion = 'unknown';
      try {
        const packagePath = join(__dirname, '..', 'package.json');
        const packageContent = readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        serverVersion = packageJson.version || 'unknown';
      } catch (error) {
        this.logDebug(`Could not read package.json: ${error}`);
      }

      // Detect Godot path if not already set
      if (!this.godotPath) {
        await this.detectGodotPath();
      }

      // Get Godot version if possible
      let godotVersion = 'unknown';
      if (this.godotPath && await this.isValidGodotPath(this.godotPath)) {
        try {
          const { stdout } = await execAsync(`"${this.godotPath}" --version`, { timeout: 5000 });
          godotVersion = stdout.trim();
        } catch (error) {
          this.logDebug(`Could not get Godot version: ${error}`);
        }
      }

      // Count available tools
      const toolCount = 42; // 14 core + 16 Phase 1 + 12 Phase 2

      // Check for detected issues
      const detectedIssues: string[] = [];

      if (!this.godotPath) {
        detectedIssues.push('Godot executable path not found. Set GODOT_PATH environment variable.');
      } else if (!(await this.isValidGodotPath(this.godotPath))) {
        detectedIssues.push(`Godot executable not valid: ${this.godotPath}`);
      }

      if (godotVersion === 'unknown') {
        detectedIssues.push('Could not determine Godot version');
      }

      // Check project path if provided
      let projectStatus: any = null;
      if (args.projectPath) {
        try {
          const projectFile = join(args.projectPath, 'project.godot');
          if (!existsSync(args.projectPath)) {
            detectedIssues.push(`Project directory does not exist: ${args.projectPath}`);
          } else if (!existsSync(projectFile)) {
            detectedIssues.push(`Not a valid Godot project: ${args.projectPath} (missing project.godot)`);
          } else {
            projectStatus = {
              path: args.projectPath,
              isValid: true,
              godotVersion: godotVersion,
            };
          }
        } catch (error: any) {
          detectedIssues.push(`Project path check failed: ${error?.message || 'Unknown error'}`);
        }
      }

      const info: any = {
        version: serverVersion,
        godot_path: this.godotPath,
        godot_version: godotVersion,
        tool_count: toolCount,
        detected_issues: detectedIssues,

        platform: process.platform,
        node_version: process.version,
        debug_mode: DEBUG_MODE,
        godot_debug_mode: GODOT_DEBUG_MODE,
      };

      if (projectStatus) {
        info.project = projectStatus;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to get info: ${error?.message || 'Unknown error'}`,
        ['Check if server is running correctly', 'Verify file system access permissions']
      );
    }
  }

  /**
   * Handle create_world_environment tool
   * Create a WorldEnvironment node in a scene
   * @param args Tool arguments
   */
  private async handleCreateWorldEnvironment(args: any) {
    args = this.normalizeParameters(args);

    const { stdout, stderr } = await this.executeOperation('add_node', {
      scene_path: args.scenePath,
      parent_node_path: args.parentNodePath,
      node_type: 'WorldEnvironment',
      node_name: args.nodeName || 'WorldEnvironment',
    }, args.projectPath);

    if (stderr && stderr.includes('Failed to')) {
      return this.createErrorResponse(
        `Failed to create WorldEnvironment: ${stderr}`,
        ['Ensure scene path is correct', 'Node type must be WorldEnvironment']
      );
    }

    return { content: [{ type: 'text', text: `WorldEnvironment created successfully.\n\n${stdout}` }] };
  }

  /**
   * Handle configure_environment tool
   * Configure properties of a WorldEnvironment node
   * @param args Tool arguments
   */
  private async handleConfigureEnvironment(args: any) {
    args = this.normalizeParameters(args);

    const { stdout, stderr } = await this.executeOperation('set_node_properties', {
      scene_path: args.scenePath,
      node_path: args.nodePath,
      properties: args.environmentSettings,
    }, args.projectPath);

    if (stderr && stderr.includes('Failed to')) {
      return this.createErrorResponse(
        `Failed to configure environment: ${stderr}`,
        ['Check environment settings format', 'Ensure node_path points to valid WorldEnvironment']
      );
    }

    return { content: [{ type: 'text', text: `Environment configured successfully.\n\n${stdout}` }] };
  }

  /**
   * Handle create_sky tool
   * Create a WorldEnvironment with sky settings
   * @param args Tool arguments
   */
  private async handleCreateSky(args: any) {
    args = this.normalizeParameters(args);

    // Sky is a resource, so we create a WorldEnvironment with sky
    const { stdout, stderr } = await this.executeOperation('add_node', {
      scene_path: args.scenePath,
      parent_node_path: args.parentNodePath,
      node_type: 'WorldEnvironment',
      node_name: args.nodeName || 'SkyEnvironment',
      properties: {
        environment: {
          sky: args.skySettings || {},
        }
      },
    }, args.projectPath);

    if (stderr && stderr.includes('Failed to')) {
      return this.createErrorResponse(
        `Failed to create sky environment: ${stderr}`,
        ['Ensure sky settings format is valid', 'Scene path must be correct']
      );
    }

    return { content: [{ type: 'text', text: `Sky environment created successfully.\n\n${stdout}` }] };
  }

  /**
   * Handle the create_light tool
   * Create OmniLight3D, SpotLight3D, or DirectionalLight3D nodes
   * @param args Tool arguments
   */
  private async handleCreateLight(args: any) {
    args = this.normalizeParameters(args);

    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.lightType || !args.nodeName) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, parentNodePath, lightType, and nodeName']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.parentNodePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          ['Ensure the path points to a directory containing a project.godot file']
        );
      }

      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          ['Ensure the scene path is correct', 'Use create_scene to create a new scene first']
        );
      }

      const params: any = {
        scenePath: args.scenePath,
        parentNodePath: args.parentNodePath,
        lightType: args.lightType,
        nodeName: args.nodeName,
      };

      if (args.properties) {
        params.properties = args.properties;
      }

      const { stdout, stderr } = await this.executeOperation('create_light', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to create light: ${stderr}`,
          ['Check if the light type is valid', 'Ensure the parent node path is correct']
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Light '${args.nodeName}' of type ${args.lightType} created successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to create light: ${error?.message || 'Unknown error'}`,
        ['Ensure Godot is installed correctly', 'Verify the project path is accessible']
      );
    }
  }

  /**
   * Handle the configure_light tool
   * Configure light properties
   * @param args Tool arguments
   */
  private async handleConfigureLight(args: any) {
    args = this.normalizeParameters(args);

    if (!args.projectPath || !args.scenePath || !args.nodePath || !args.properties) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodePath, and properties']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.nodePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          ['Ensure the path points to a directory containing a project.godot file']
        );
      }

      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          ['Ensure the scene path is correct']
        );
      }

      const params: any = {
        scenePath: args.scenePath,
        nodePath: args.nodePath,
        properties: args.properties,
      };

      const { stdout, stderr } = await this.executeOperation('configure_light', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to configure light: ${stderr}`,
          ['Check if the node path is correct', 'Ensure the node is a valid light type']
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Light configured successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to configure light: ${error?.message || 'Unknown error'}`,
        ['Ensure Godot is installed correctly', 'Verify the project path is accessible']
      );
    }
  }

  /**
   * Handle the create_lightmap_gi tool
   * Create LightmapGI node for baked lighting
   * @param args Tool arguments
   */
  private async handleCreateLightmapGi(args: any) {
    args = this.normalizeParameters(args);

    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, parentNodePath, and nodeName']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.parentNodePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          ['Ensure the path points to a directory containing a project.godot file']
        );
      }

      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          ['Ensure the scene path is correct', 'Use create_scene to create a new scene first']
        );
      }

      const params: any = {
        scenePath: args.scenePath,
        parentNodePath: args.parentNodePath,
        nodeName: args.nodeName,
      };

      if (args.properties) {
        params.properties = args.properties;
      }

      const { stdout, stderr } = await this.executeOperation('create_lightmap_gi', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to create LightmapGI: ${stderr}`,
          ['Check if the parent node path is correct']
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `LightmapGI '${args.nodeName}' created successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to create LightmapGI: ${error?.message || 'Unknown error'}`,
        ['Ensure Godot is installed correctly', 'Verify the project path is accessible']
      );
    }
  }

  /**
   * Handle the configure_shadow tool
   * Configure shadow settings for a light node
   * @param args Tool arguments
   */
  private async handleConfigureShadow(args: any) {
    args = this.normalizeParameters(args);

    if (!args.projectPath || !args.scenePath || !args.nodePath || args.shadowEnabled === undefined) {
      return this.createErrorResponse(
        'Missing required parameters',
        ['Provide projectPath, scenePath, nodePath, and shadowEnabled']
      );
    }

    if (
      !this.validatePath(args.projectPath) ||
      !this.validatePath(args.scenePath) ||
      !this.validatePath(args.nodePath)
    ) {
      return this.createErrorResponse(
        'Invalid path',
        ['Provide valid paths without ".." or other potentially unsafe characters']
      );
    }

    try {
      const projectFile = join(args.projectPath, 'project.godot');
      if (!existsSync(projectFile)) {
        return this.createErrorResponse(
          `Not a valid Godot project: ${args.projectPath}`,
          ['Ensure the path points to a directory containing a project.godot file']
        );
      }

      const scenePath = join(args.projectPath, args.scenePath);
      if (!existsSync(scenePath)) {
        return this.createErrorResponse(
          `Scene file does not exist: ${args.scenePath}`,
          ['Ensure the scene path is correct']
        );
      }

      const params: any = {
        scenePath: args.scenePath,
        nodePath: args.nodePath,
        shadowEnabled: args.shadowEnabled,
      };

      if (args.shadowType !== undefined) {
        params.shadowType = args.shadowType;
      }

      if (args.properties) {
        params.properties = args.properties;
      }

      const { stdout, stderr } = await this.executeOperation('configure_shadow', params, args.projectPath);

      if (stderr && stderr.includes('Failed to')) {
        return this.createErrorResponse(
          `Failed to configure shadow: ${stderr}`,
          ['Check if the node path is correct', 'Ensure the node is a valid light type with shadow support']
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Shadow settings configured successfully.\n\nOutput: ${stdout}`,
          },
        ],
      };
    } catch (error: any) {
      return this.createErrorResponse(
        `Failed to configure shadow: ${error?.message || 'Unknown error'}`,
        ['Ensure Godot is installed correctly', 'Verify the project path is accessible']
      );
    }
  }

  /**
   * Handle create_audio_player tool
   */

  private async handleCreateAudioPlayer(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.playerType || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, playerType, and nodeName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_audio_player', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create audio player: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create audio player: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_audio_bus tool
   */
  private async handleConfigureAudioBus(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.busName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath and busName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_audio_bus', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure audio bus: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure audio bus: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle add_audio_effect tool
   */
  private async handleAddAudioEffect(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.busName || !args.effectType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, busName, and effectType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('add_audio_effect', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to add audio effect: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to add audio effect: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_audio_bus_layout tool
   */
  private async handleCreateAudioBusLayout(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.layoutPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath and layoutPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_audio_bus_layout', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create audio bus layout: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create audio bus layout: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle get_audio_bus_info tool
   */
  private async handleGetAudioBusInfo(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.busName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath and busName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('get_audio_bus_info', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to get audio bus info: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to get audio bus info: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle list_audio_buses tool
   */
  private async handleListAudioBuses(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('list_audio_buses', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to list audio buses: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to list audio buses: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle the create_particle_system tool
   * @param args Tool arguments
   */
  private async handleCreateParticleSystem(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_particle_system', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create particle system: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create particle system: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle the configure_particle_material tool
   * @param args Tool arguments
   */
  private async handleConfigureParticleMaterial(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_particle_material', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure particle material: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure particle material: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle the create_particle_material tool
   * @param args Tool arguments
   */
  private async handleCreateParticleMaterial(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_particle_material', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create particle material: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create particle material: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_navigation_region tool
   */
  private async handleCreateNavigationRegion(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    const is3d = args.is3d !== false;
    const nodeType = is3d ? 'NavigationRegion3D' : 'NavigationRegion2D';
    
    try {
      const params = {
        scenePath: args.scenePath,
        parentNodePath: args.parentNodePath,
        nodeType: nodeType,
        nodeName: args.nodeName,
        properties: args.properties || {}
      };
      const { stdout, stderr } = await this.executeOperation('add_node', params, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create navigation region: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Navigation region created successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create navigation region: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_navigation_agent tool
   */
  private async handleCreateNavigationAgent(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    const is3d = args.is3d !== false;
    const nodeType = is3d ? 'NavigationAgent3D' : 'NavigationAgent2D';
    
    try {
      const params = {
        scenePath: args.scenePath,
        parentNodePath: args.parentNodePath,
        nodeType: nodeType,
        nodeName: args.nodeName,
        properties: args.properties || {}
      };
      const { stdout, stderr } = await this.executeOperation('add_node', params, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create navigation agent: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Navigation agent created successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create navigation agent: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_navigation_mesh tool
   */
  private async handleConfigureNavigationMesh(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.nodePath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, and nodePath']);
    }
    
    try {
      let resultText = '';
      
      // First set properties if any
      if (args.properties && Object.keys(args.properties).length > 0) {
        const { stdout, stderr } = await this.executeOperation('set_node_properties', {
          scenePath: args.scenePath,
          nodePath: args.nodePath,
          properties: args.properties
        }, args.projectPath);
        
        if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
          return this.createErrorResponse(`Failed to configure navigation mesh properties: ${stderr}`);
        }
        resultText += `Properties configured.\n${stdout.trim()}\n`;
      }
      
      // Then bake if requested (default true)
      if (args.bake !== false) {
        const { stdout, stderr } = await this.executeOperation('bake_navigation_mesh', {
          scenePath: args.scenePath,
          nodePath: args.nodePath
        }, args.projectPath);
        
        if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
          return this.createErrorResponse(`Failed to bake navigation mesh: ${stderr}`);
        }
        resultText += `Navigation mesh baked.\n${stdout.trim()}`;
      }
      
      return { content: [{ type: 'text', text: resultText || 'No action taken.' }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure/bake navigation mesh: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_navigation_link tool
   */
  private async handleCreateNavigationLink(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    const is3d = args.is3d !== false;
    const nodeType = is3d ? 'NavigationLink3D' : 'NavigationLink2D';
    
    try {
      const params = {
        scenePath: args.scenePath,
        parentNodePath: args.parentNodePath,
        nodeType: nodeType,
        nodeName: args.nodeName,
        properties: args.properties || {}
      };
      const { stdout, stderr } = await this.executeOperation('add_node', params, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create navigation link: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Navigation link created successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create navigation link: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_multiplayer tool
   */
  private async handleConfigureMultiplayer(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_multiplayer', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure multiplayer: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Multiplayer configured successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure multiplayer: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_multiplayer_spawner tool
   */
  private async handleCreateMultiplayerSpawner(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_multiplayer_spawner', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create multiplayer spawner: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Multiplayer spawner created successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create multiplayer spawner: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_multiplayer_synchronizer tool
   */
  private async handleCreateMultiplayerSynchronizer(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_multiplayer_synchronizer', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create multiplayer synchronizer: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `Multiplayer synchronizer created successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create multiplayer synchronizer: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle add_rpc_config tool
   */
  private async handleAddRpcConfig(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.nodePath || !args.methodName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, nodePath, and methodName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('add_rpc_config', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to add RPC config: ${stderr}`);
      }
      return { content: [{ type: 'text', text: `RPC config added successfully.\n\n${stdout.trim()}` }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to add RPC config: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle get_multiplayer_info tool
   */
  private async handleGetMultiplayerInfo(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('get_multiplayer_info', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to get multiplayer info: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to get multiplayer info: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_physics_joint tool
   */
  private async handleCreatePhysicsJoint(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName || !args.jointType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, nodeName, and jointType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_physics_joint', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create physics joint: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create physics joint: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_physics_material tool
   */
  private async handleCreatePhysicsMaterial(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.materialPath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath and materialPath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_physics_material', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create physics material: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create physics material: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_collision_layers tool
   */
  private async handleConfigureCollisionLayers(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.nodePath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, and nodePath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_collision_layers', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure collision layers: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure collision layers: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_raycast tool
   */
  private async handleCreateRaycast(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_raycast', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create raycast: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create raycast: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_collision_shape tool
   */
  private async handleCreateCollisionShape(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName || !args.shapeType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, nodeName, and shapeType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_collision_shape', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create collision shape: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create collision shape: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_area tool
   */
  private async handleCreateArea(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, and nodeName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_area', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create area: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create area: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_animation_tree tool
   */
  private async handleCreateAnimationTree(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.parentNodePath || !args.nodeName || !args.treeType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, parentNodePath, nodeName, and treeType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_animation_tree', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create animation tree: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create animation tree: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle add_animation_state tool
   */
  private async handleAddAnimationState(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.animationTreePath || !args.stateName) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, animationTreePath, and stateName']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('add_animation_state', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to add animation state: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to add animation state: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle add_animation_transition tool
   */
  private async handleAddAnimationTransition(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.animationTreePath || !args.fromState || !args.toState) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, animationTreePath, fromState, and toState']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('add_animation_transition', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to add animation transition: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to add animation transition: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_blend_tree tool
   */
  private async handleConfigureBlendTree(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.animationTreePath || !args.nodeName || !args.nodeType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, animationTreePath, nodeName, and nodeType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_blend_tree', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure blend tree: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure blend tree: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle set_animation_tree_parameter tool
   */
  private async handleSetAnimationTreeParameter(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.animationTreePath || !args.parameterName || args.value === undefined) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, animationTreePath, parameterName, and value']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('set_animation_tree_parameter', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to set animation tree parameter: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to set animation tree parameter: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_theme tool
   */
  private async handleCreateTheme(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.themePath) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath and themePath']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_theme', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create theme: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create theme: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_theme_type tool
   */
  private async handleConfigureThemeType(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.themePath || !args.typeName || !args.data) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, themePath, typeName, and data']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_theme_type', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure theme type: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure theme type: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle create_stylebox tool
   */
  private async handleCreateStylebox(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.styleboxPath || !args.styleboxType) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, styleboxPath, and styleboxType']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('create_stylebox', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to create stylebox: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to create stylebox: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Handle configure_control_anchors tool
   */
  private async handleConfigureControlAnchors(args: any) {
    args = this.normalizeParameters(args);
    if (!args.projectPath || !args.scenePath || !args.nodePath || args.anchorPreset === undefined) {
      return this.createErrorResponse('Missing required parameters', ['Provide projectPath, scenePath, nodePath, and anchorPreset']);
    }
    try {
      const { stdout, stderr } = await this.executeOperation('configure_control_anchors', args, args.projectPath);
      if (stderr && (stderr.includes('Failed to') || stderr.includes('Error'))) {
        return this.createErrorResponse(`Failed to configure control anchors: ${stderr}`);
      }
      return { content: [{ type: 'text', text: stdout.trim() }] };
    } catch (error: any) {
      return this.createErrorResponse(`Failed to configure control anchors: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Run the MCP server
   */
  async run() {
    try {
      // Detect Godot path before starting the server
      await this.detectGodotPath();

      if (!this.godotPath) {
        console.error('[SERVER] Failed to find a valid Godot executable path');
        console.error('[SERVER] Please set GODOT_PATH environment variable or provide a valid path');
        process.exit(1);
      }

      // Check if the path is valid
      const isValid = await this.isValidGodotPath(this.godotPath);

      if (!isValid) {
        if (this.strictPathValidation) {
          // In strict mode, exit if the path is invalid
          console.error(`[SERVER] Invalid Godot path: ${this.godotPath}`);
          console.error('[SERVER] Please set a valid GODOT_PATH environment variable or provide a valid path');
          process.exit(1);
        } else {
          // In compatibility mode, warn but continue with the default path
          console.error(`[SERVER] Warning: Using potentially invalid Godot path: ${this.godotPath}`);
          console.error('[SERVER] This may cause issues when executing Godot commands');
          console.error('[SERVER] This fallback behavior will be removed in a future version. Set strictPathValidation: true to opt-in to the new behavior.');
        }
      }

      console.error(`[SERVER] Using Godot at: ${this.godotPath}`);

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Godot MCP server running on stdio');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SERVER] Failed to start:', errorMessage);
      process.exit(1);
    }
  }
}

// Create and run the server
const server = new GodotServer();
server.run().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Failed to run server:', errorMessage);
  process.exit(1);
});
