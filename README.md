
# Godot MCP

[![Github-sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/Coding-Solo)

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)

[![](https://img.shields.io/github/last-commit/Coding-Solo/godot-mcp 'Last Commit')](https://github.com/Coding-Solo/godot-mcp/commits/main)
[![](https://img.shields.io/github/stars/Coding-Solo/godot-mcp 'Stars')](https://github.com/Coding-Solo/godot-mcp/stargazers)
[![](https://img.shields.io/github/forks/Coding-Solo/godot-mcp 'Forks')](https://github.com/Coding-Solo/godot-mcp/network/members)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)

```text
                           (((((((             (((((((                          
                        (((((((((((           (((((((((((                      
                        (((((((((((((       (((((((((((((                       
                        (((((((((((((((((((((((((((((((((                       
                        (((((((((((((((((((((((((((((((((                       
         (((((      (((((((((((((((((((((((((((((((((((((((((      (((((        
       (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((      
     ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((    
    ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((    
      (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((     
        (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((       
         (((((((((((@@@@@@@(((((((((((((((((((((((((((@@@@@@@(((((((((((        
         (((((((((@@@@,,,,,@@@(((((((((((((((((((((@@@,,,,,@@@@(((((((((        
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((        
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((        
         (((((((((@@@,,,,,,,@@((((((((@@@@@((((((((@@,,,,,,,@@@(((((((((        
         ((((((((((((@@@@@@(((((((((((@@@@@(((((((((((@@@@@@((((((((((((        
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((        
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((        
         @@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@        
         ((((((((( @@@(((((((((((@@(((((((((((@@(((((((((((@@@ (((((((((        
         (((((((((( @@((((((((((@@@(((((((((((@@@((((((((((@@ ((((((((((        
          (((((((((((@@@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@(((((((((((         
           (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((          
              (((((((((((((((((((((((((((((((((((((((((((((((((((((             
                 (((((((((((((((((((((((((((((((((((((((((((((((                
                        (((((((((((((((((((((((((((((((((                       
                                                                                

                          /$$      /$$  /$$$$$$  /$$$$$$$ 
                         | $$$    /$$$ /$$__  $$| $$__  $$
                         | $$$$  /$$$$| $$  \__/| $$  \ $$
                         | $$ $$/$$ $$| $$      | $$$$$$$/
                         | $$  $$$| $$| $$      | $$____/ 
                         | $$\  $ | $$| $$    $$| $$      
                         | $$ \/  | $$|  $$$$$$/| $$      
                         |__/     |__/ \______/ |__/       
```

A Model Context Protocol (MCP) server for interacting with the Godot game engine.

## Introduction

Godot MCP enables AI assistants to launch the Godot editor, run projects, and manage complex systems like 3D lighting, audio, physics, particles, and multiplayer - with 64 specialized tools covering 60%+ of the Godot 4.x API.

This direct feedback loop helps AI assistants like Claude understand what works and what doesn't in real Godot projects, leading to better code generation and debugging assistance.

## Features

- **Launch & Control**: Start/stop the Godot editor and projects programmatically
- **Project Analysis**: List projects and get detailed structural information
- **Scene & Node Management**:
  - Create scenes with any root node type
  - Add, modify, and manage nodes with full property control
  - High-level workflow tools like `create_character_controller`
- **3D Graphics & Environment**:
  - Full lighting support (Omni, Spot, Directional)
  - Camera3D configuration and environment linking
  - WorldEnvironment, Sky materials, and post-processing
  - Baked lighting with LightmapGI
- **Audio System**:
  - 2D/3D audio player management
  - Multi-bus setup with routing and effects (Reverb, EQ, etc.)
  - Bus layout persistence
- **Physics & Navigation**:
  - Physics joints (Pin, Hinge, Slider, etc.)
  - Collision shapes, Areas, and Raycasts
  - Navigation regions, agents, and mesh baking
- **Animation & UI**:
  - AnimationTree (State Machine, Blend Tree) configuration
  - UI Theme and StyleBox creation
  - Control layout with anchor presets
- **World Building**:
  - 3D GridMap (Tile) management
  - 2D TileSet and TileMap support
- **Multiplayer & Networking**:
  - MultiplayerSpawner and Synchronizer setup
  - RPC configuration and network peer settings
- **Diagnostics & Quality**:
  - Scene and Script validation tools
  - System diagnostics via the `info` tool
- **UID Management** (for Godot 4.4+):
  - Resource UID retrieval and project-wide updates

## Requirements

- [Godot Engine](https://godotengine.org/download) installed on your system
- Node.js and npm
- An AI assistant that supports MCP (Cline, Cursor, etc.)

## Installation and Configuration

### Step 1: Install and Build

First, clone the repository and build the MCP server:

```bash
git clone https://github.com/Coding-Solo/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

### Step 2: Configure with Your AI Assistant

#### Option A: Configure with Cline

Add to your Cline MCP settings file (`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "DEBUG": "true"                  // Optional: Enable detailed logging
      },
      "disabled": false,
      "autoApprove": [
        "launch_editor", "run_project", "get_debug_output", "stop_project",
        "get_godot_version", "list_projects", "get_project_info", "info",
        "create_scene", "add_node", "save_scene", "load_sprite",
        "create_light", "configure_light", "create_camera3d", "configure_camera3d",
        "create_audio_player", "configure_audio_bus", "add_audio_effect",
        "create_particle_system", "create_navigation_region", "create_physics_joint",
        "create_collision_shape", "create_area", "create_animation_tree",
        "create_theme", "create_gridmap", "configure_multiplayer",
        "validate_scene", "validate_script", "create_character_controller",
        "get_uid", "update_project_uids"
      ]
    }
  }
}
```

#### Option B: Configure with Cursor

**Using the Cursor UI:**

1. Go to **Cursor Settings** > **Features** > **MCP**
2. Click on the **+ Add New MCP Server** button
3. Fill out the form:
   - Name: `godot` (or any name you prefer)
   - Type: `command`
   - Command: `node /absolute/path/to/godot-mcp/build/index.js`
4. Click "Add"
5. You may need to press the refresh button in the top right corner of the MCP server card to populate the tool list

**Using Project-Specific Configuration:**

Create a file at `.cursor/mcp.json` in your project directory with the following content:

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "DEBUG": "true"                  // Enable detailed logging
      }
    }
  }
}
```

### Step 3: Optional Environment Variables

You can customize the server behavior with these environment variables:

- `GODOT_PATH`: Path to the Godot executable (overrides automatic detection)
- `DEBUG`: Set to "true" to enable detailed server-side debug logging

## Example Prompts

Once configured, your AI assistant will automatically run the MCP server when needed. You can use prompts like:

```text
"Launch the Godot editor for my project at /path/to/project"

"Run my Godot project and show me any errors"

"Get information about my Godot project structure and server status"

"Create a 3D character controller with a camera and basic movement script"

"Add an OmniLight3D to my scene, set it to a warm orange color, and enable shadows"

"Create a Reverb audio bus and route my SFX bus to it"

"Set up a GPUParticles3D system for a fire effect with 50 particles"

"Configure an AnimationTree state machine for my character's walk/run/idle states"

"Bake the navigation mesh for my level so enemies can follow me"

"Validate my main scene to find any broken resource paths or missing dependencies"

"Export my 3D models as a MeshLibrary and set up a GridMap for level building"

"Get the UID for a specific script file in my Godot 4.4 project"
```

## Implementation Details

### Architecture

The Godot MCP server uses a bundled GDScript approach for complex operations:

1. **Direct Commands**: Simple operations like launching the editor or getting project info use Godot's built-in CLI commands directly.
2. **Bundled Operations Script**: Complex operations like creating scenes or adding nodes use a single, comprehensive GDScript file (`godot_operations.gd`) that handles all operations.

This architecture provides several benefits:

- **No Temporary Files**: Eliminates the need for temporary script files, keeping your system clean
- **Simplified Codebase**: Centralizes all Godot operations in one (somewhat) organized file
- **Better Maintainability**: Makes it easier to add new operations or modify existing ones
- **Improved Error Handling**: Provides consistent error reporting across all operations
- **Reduced Overhead**: Minimizes file I/O operations for better performance

The bundled script accepts operation type and parameters as JSON, allowing for flexible and dynamic operation execution without generating temporary files for each operation.

## Troubleshooting

- **Server Diagnostics**: Use the `info` tool to check connection status, Godot version, and detected issues.
- **Godot Not Found**: Set the GODOT_PATH environment variable to your Godot executable
- **Connection Issues**: Ensure the server is running and restart your AI assistant
- **Invalid Project Path**: Ensure the path points to a directory containing a project.godot file
- **Build Issues**: Make sure all dependencies are installed by running `npm install`
- **For Cursor Specifically**:
-   Ensure the MCP server shows up and is enabled in Cursor settings (Settings > MCP)
-   MCP tools can only be run using the Agent chat profile (Cursor Pro or Business subscription)
-   Use "Yolo Mode" to automatically run MCP tool requests

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/coding-solo-godot-mcp-badge.png)](https://mseep.ai/app/coding-solo-godot-mcp)
