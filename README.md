# GoPeak

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/gopeak?style=flat&logo=npm&logoColor=white 'npm')](https://www.npmjs.com/package/gopeak)

[![](https://img.shields.io/github/last-commit/HaD0Yun/godot-mcp 'Last Commit')](https://github.com/HaD0Yun/godot-mcp/commits/main)
[![](https://img.shields.io/github/stars/HaD0Yun/godot-mcp 'Stars')](https://github.com/HaD0Yun/godot-mcp/stargazers)
[![](https://img.shields.io/github/forks/HaD0Yun/godot-mcp 'Forks')](https://github.com/HaD0Yun/godot-mcp/network/members)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)

🌐 **Language**: **English** | [한국어](README-ko.md) | [简体中文](README-zh.md) | [日本語](README-ja.md) | [Deutsch](README-de.md) | [Português](README-pt_BR.md)

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
                                                                                

        /$$$$$$             /$$$$$$$                      /$$      
       /$$__  $$           | $$__  $$                    | $$      
      | $$  \__/  /$$$$$$ | $$  \ $$ /$$$$$$   /$$$$$$$ | $$  /$$/
      | $$ /$$$$//$$__  $$| $$$$$$$//$$__  $$ |____  $$ | $$ /$$/ 
      | $$|_  $$| $$  \ $$| $$____/| $$$$$$$$  /$$$$$$$ | $$$$$/  
      | $$  \ $$| $$  | $$| $$     | $$_____/ /$$__  $$ | $$  $$  
      |  $$$$$$/|  $$$$$$/| $$     |  $$$$$$ |  $$$$$$$ | $$\  $$ 
       \______/  \______/ |__/      \______/  \_______/ |__/ \__/ 
```

**The most comprehensive Model Context Protocol (MCP) server for Godot Engine — enabling AI assistants to build, modify, and debug Godot games with unprecedented depth and precision.**

> **Now with Auto Reload!** Scenes and scripts automatically refresh in the Godot editor when modified externally via MCP.

---

## Why GoPeak? The Game-Changing Benefits

### 🚀 Transform Your Game Development Workflow

GoPeak isn't just another tool — it's a **paradigm shift** in how AI assistants interact with game engines. Here's why this matters:

#### 1. **AI That Truly Understands Godot**

Traditional AI assistants can write GDScript, but they're essentially working blind. They generate code based on training data, hoping it works. **GoPeak changes everything:**

- **Real-time Feedback Loop**: When you ask "run my project and show me errors," the AI actually runs your project, captures the output, and sees exactly what went wrong
- **Context-Aware Assistance**: The AI can inspect your actual scene tree, understand your node hierarchy, and provide suggestions based on your real project structure
- **Validation Before Suggesting**: Before suggesting you use a resource, the AI can verify it exists in your project

#### 2. **95+ Tools with Dynamic ClassDB Introspection**

Instead of hardcoding tools for every Godot class, GoPeak provides **generic tools** (`add_node`, `create_resource`) that work with ANY ClassDB class, plus **ClassDB introspection tools** that let AI discover classes, properties, and methods dynamically.

| Category | What You Can Do | Tools |
|----------|-----------------|-------|
| **Scene Management** | Build entire scene trees programmatically | `create_scene`, `add_node`, `delete_node`, `duplicate_node`, `reparent_node`, `list_scene_nodes`, `get_node_properties`, `set_node_properties` |
| **ClassDB Introspection** | Dynamically discover Godot classes, properties, methods, signals | `query_classes`, `query_class_info`, `inspect_inheritance` |
| **GDScript Operations** | Write and modify scripts with surgical precision | `create_script`, `modify_script`, `get_script_info` |
| **Resource Management** | Create any resource type, modify existing resources | `create_resource`, `modify_resource`, `create_material`, `create_shader` |
| **Animation System** | Build animations and state machines | `create_animation`, `add_animation_track`, `create_animation_tree`, `add_animation_state`, `connect_animation_states` |
| **2D Tile System** | Create tilesets and populate tilemaps | `create_tileset`, `set_tilemap_cells` |
| **Signal Management** | Wire up your game's event system | `connect_signal`, `disconnect_signal`, `list_connections` |
| **Project Configuration** | Manage settings, autoloads, and inputs | `get_project_setting`, `set_project_setting`, `add_autoload`, `add_input_action` |
| **Developer Experience** | Analyze, debug, and maintain your project | `get_dependencies`, `find_resource_usages`, `parse_error_log`, `get_project_health`, `search_project` |
| **Runtime Debugging** | Inspect and modify running games | `inspect_runtime_tree`, `set_runtime_property`, `call_runtime_method`, `get_runtime_metrics` |
| **Screenshot Capture** | Capture viewport screenshots from running games | `capture_screenshot`, `capture_viewport` |
| **Input Injection** | Simulate keyboard, mouse, and action inputs | `inject_action`, `inject_key`, `inject_mouse_click`, `inject_mouse_motion` |
| **GDScript LSP** | Diagnostics, completions, hover, and symbols via Godot's built-in Language Server | `lsp_get_diagnostics`, `lsp_get_completions`, `lsp_get_hover`, `lsp_get_symbols` |
| **Debug Adapter (DAP)** | Breakpoints, stepping, stack traces, and debug output capture | `dap_get_output`, `dap_set_breakpoint`, `dap_continue`, `dap_step_over`, `dap_get_stack_trace` |
| **MCP Resources** | Access project files via `godot://` URIs | `godot://project/info`, `godot://scene/{path}`, `godot://script/{path}` |
| **Audio System** | Create audio buses, configure effects | `create_audio_bus`, `get_audio_buses`, `set_audio_bus_effect`, `set_audio_bus_volume` |
| **Navigation** | AI pathfinding setup | `create_navigation_region`, `create_navigation_agent` |
| **UI/Themes** | Create and apply custom themes with shaders | `set_theme_color`, `set_theme_font_size`, `apply_theme_shader` |
| **Asset Library** | Search and download CC0 assets from multiple sources | `search_assets`, `fetch_asset`, `list_asset_providers` |
| **Auto Reload** | Instant editor refresh on external changes | Built-in Editor Plugin |

> **Design Philosophy**: Rather than providing 90+ specialized tools (e.g., `create_camera`, `create_light`, `create_physics_material`), GoPeak uses generic `add_node` and `create_resource` tools that work with ANY Godot class. The AI uses `query_classes` to discover available types and `query_class_info` to learn their properties — just like a developer using the Godot docs.

#### 3. **Seamless Editor Integration with Auto Reload**

The included **Auto Reload plugin** eliminates the friction of external editing:

- **No Manual Refresh**: When MCP modifies a scene or script, the Godot editor automatically reloads it
- **1-Second Detection**: Lightweight polling with negligible performance impact (~0.01ms/sec)
- **Smart Watching**: Monitors open scenes AND their attached scripts
- **Zero Configuration**: Just enable the plugin and forget about it

```
MCP modifies file → Auto Reload detects change → Editor reloads → You see the result instantly
```

#### 4. **Eliminate the Copy-Paste-Debug Cycle**

**Before GoPeak:**
1. Ask AI for code
2. Copy code to your project
3. Run project, encounter error
4. Copy error back to AI
5. Get fix, paste it
6. Repeat 10+ times

**With GoPeak:**
1. "Create a player character with health, movement, and jumping"
2. AI creates the scene, writes the script, adds the nodes, connects signals, and tests it
3. Done.

The AI doesn't just write code — it **implements features end-to-end**.

#### 5. **Type-Safe, Error-Resistant Operations**

Every operation in GoPeak includes:

- **Path Validation**: Prevents invalid file operations
- **Type Serialization**: Correctly handles Vector2, Vector3, Color, Transform, and all Godot types
- **Error Recovery**: Meaningful error messages with suggested fixes
- **Atomic Operations**: Changes are applied consistently or not at all

Example: When you ask to set a node's position, GoPeak:
1. Validates the scene exists
2. Validates the node path
3. Deserializes `{"x": 100, "y": 200}` to `Vector2(100, 200)`
4. Sets the property
5. Saves the scene
6. Confirms success or reports exactly what went wrong

#### 6. **Project Health Intelligence**

The `get_project_health` tool provides a comprehensive analysis of your project:

```json
{
  "score": 85,
  "grade": "B",
  "checks": {
    "structure": { "passed": true },
    "resources": { "issues": ["3 textures need reimporting"] },
    "scripts": { "issues": ["5 TODO comments found"] },
    "config": { "passed": true }
  },
  "recommendations": [
    "Configure export presets for your target platforms",
    "Review and resolve TODO items before release"
  ]
}
```

This turns your AI assistant into a **code reviewer that actually understands your Godot project**.

#### 7. **Dependency Analysis & Circular Reference Detection**

Ever had a project break because of circular dependencies? The `get_dependencies` tool:

- Maps every resource dependency in your project
- Detects circular references before they cause runtime errors
- Shows you the complete dependency chain for any resource

```
PlayerScene.tscn
├── PlayerScript.gd
│   └── WeaponBase.gd
│       └── ⚠️ CIRCULAR: PlayerScript.gd
└── PlayerSprite.png
```

#### 8. **Live Runtime Debugging (Optional Addon)**

Install the included `godot_mcp_runtime` addon and unlock:

- **Live Scene Tree Inspection**: See your game's actual node tree while it runs
- **Hot Property Modification**: Change values in real-time without restarting
- **Remote Method Calling**: Trigger functions in your running game
- **Performance Monitoring**: Track FPS, memory, draw calls, and more

This transforms debugging from "add print statements and restart" to "inspect and modify on the fly."

### 💡 Real-World Use Cases

#### **Rapid Prototyping**
```
"Create a basic platformer with a player that can move, jump, and collect coins"
```
The AI creates scenes, scripts, nodes, signals, and input actions — a playable prototype in minutes.

#### **Refactoring at Scale**
```
"Find all uses of the old PlayerData resource and update them to use the new PlayerStats"
```
Search the entire project, identify every reference, and make consistent changes.

#### **Debugging Complex Issues**
```
"My player keeps falling through the floor. Check my collision setup and tell me what's wrong"
```
Inspect node properties, analyze scene structure, and identify configuration issues.

#### **Learning Godot**
```
"Show me how signals work by creating a button that changes a label's text when clicked"
```
Instead of just explaining, the AI builds a working example in your actual project.

#### **Maintaining Large Projects**
```
"Run a health check on my project and tell me what needs attention"
```
Get actionable insights about project structure, unused resources, and potential issues.

---

## Features

### Core Features
- **Launch Godot Editor**: Open the Godot editor for a specific project
- **Run Godot Projects**: Execute Godot projects in debug mode
- **Capture Debug Output**: Retrieve console output and error messages
- **Control Execution**: Start and stop Godot projects programmatically
- **Get Godot Version**: Retrieve the installed Godot version
- **List Godot Projects**: Find Godot projects in a specified directory
- **Project Analysis**: Get detailed information about project structure

### Scene Management
- Create new scenes with specified root node types
- Add, delete, duplicate, and reparent nodes
- Set node properties with type-safe serialization
- List scene tree structure with full hierarchy
- Load sprites and textures into Sprite2D nodes
- Export 3D scenes as MeshLibrary resources for GridMap

### GDScript Operations
- **Create Scripts**: Generate new GDScript files with templates (singleton, state_machine, component, resource)
- **Modify Scripts**: Add functions, variables, and signals to existing scripts
- **Analyze Scripts**: Get detailed information about script structure, dependencies, and exports

### Signal & Connection Management
- Connect signals between nodes in scenes
- Disconnect signal connections
- List all signal connections in a scene

### ClassDB Introspection (New!)
- **Query Classes**: Discover available Godot classes with filtering by name, category (node, node2d, node3d, control, resource, etc.), and instantiability
- **Query Class Info**: Get detailed methods, properties, signals, and enums for any class
- **Inspect Inheritance**: Explore class hierarchy — ancestors, children, and all descendants

### Resource Management
- **Create Resources**: Generate ANY resource type as .tres files (replaces specialized create_* tools)
- **Modify Resources**: Update properties of existing .tres/.res files
- **Create Materials**: StandardMaterial3D, ShaderMaterial, CanvasItemMaterial, ParticleProcessMaterial
- **Create Shaders**: canvas_item, spatial, particles, sky, fog shaders with templates

### Animation System
- Create new animations in AnimationPlayer nodes
- Add property and method tracks to animations
- Insert keyframes with proper value serialization

### 2D Tile System
- Create TileSet resources with atlas texture sources
- Set TileMap cells programmatically

### Import/Export Pipeline
- Get import status and options for resources
- Modify import settings and trigger reimport
- List export presets and validate project for export
- Export projects using Godot CLI

### Project Configuration
- Get and set project settings
- Manage autoload singletons (add, remove, list)
- Set main scene
- Add input actions with key, mouse, and joypad events

### Plugin Management
- List installed plugins with status
- Enable and disable plugins

### Developer Experience
- **Dependency Analysis**: Get resource dependency graphs with circular reference detection
- **Resource Usage Finder**: Find all usages of a resource across the project
- **Error Log Parser**: Parse Godot error logs with suggestions
- **Project Health Check**: Comprehensive project analysis with scoring
- **Project Search**: Search for text/patterns across all project files

### Runtime Connection (Optional Addon)
- Real-time scene tree inspection
- Live property modification
- Remote method calling
- Performance metrics monitoring
- Signal watching

### Screenshot Capture (New!)
- Capture the running game's viewport as a base64 PNG/JPG image
- Specify target resolution for resized captures
- Capture specific viewports by node path

### Input Injection (New!)
- Simulate Godot input actions (press/release) for automated testing
- Inject keyboard key events with modifier support (Shift, Ctrl, Alt)
- Simulate mouse clicks (left/right/middle, single/double)
- Simulate mouse movement (absolute and relative)

### GDScript Language Server (New!)
- Get real-time diagnostics (errors/warnings) from Godot's built-in LSP
- Code completions at any position in a GDScript file
- Hover information for symbols, functions, and variables
- Document symbol outlines for navigation
- Lazy connection to Godot editor's LSP (port 6005)

### Debug Adapter Protocol (New!)
- Capture debug console output from running Godot games
- Set and remove breakpoints in GDScript files
- Step over, continue, and pause execution
- Inspect stack traces at breakpoints
- Lazy connection to Godot's built-in DAP (port 6006)

### MCP Resources (New!)
- Access Godot project files via `godot://` URI protocol
- `godot://project/info` — parsed project.godot metadata as JSON
- `godot://scene/{path}` — read .tscn scene files
- `godot://script/{path}` — read .gd script files
- `godot://resource/{path}` — read .tres/.tscn/.gd files
- Path traversal protection built-in

### UID Management (Godot 4.4+)
- Get UID for specific files
- Update UID references by resaving resources

### Multi-Source Asset Library (CC0)
- **Unified Search**: Search for 3D models, textures, HDRIs across multiple CC0 asset providers
- **Automatic Download**: Fetch assets directly into your Godot project
- **Provider Priority**: Searches Poly Haven → AmbientCG → Kenney in order
- **Attribution Tracking**: Automatic CREDITS.md generation for proper attribution

**Supported Providers:**

| Provider | Asset Types | License |
|----------|-------------|---------|
| [Poly Haven](https://polyhaven.com) | Models, Textures, HDRIs | CC0 |
| [AmbientCG](https://ambientcg.com) | Textures, Models, HDRIs | CC0 |
| [Kenney](https://kenney.nl) | Models, Textures, 2D, Audio | CC0 |

---

## Requirements

- [Godot Engine 4.x](https://godotengine.org/download) installed on your system
- Node.js 18+ and npm
- An AI assistant that supports MCP (Claude Desktop, Cline, Cursor, OpenCode, etc.)

---

## Installation and Configuration

### 🚀 One-Click Install (Recommended)

**Linux / macOS**
```bash
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash
```

This script will:
- ✅ Check prerequisites (Git, Node.js 18+, npm)
- ✅ Clone the repository to `~/.local/share/godot-mcp`
- ✅ Install dependencies and build automatically
- ✅ Auto-detect Godot installation
- ✅ Show configuration instructions for your AI assistant

**Advanced Options:**
```bash
# Custom installation directory
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash -s -- --dir ~/my-godot-mcp

# Specify Godot path
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash -s -- --godot /usr/bin/godot4

# Get configuration for specific AI assistant
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash -s -- --configure claude
```

**Available options:**
| Option | Description |
|--------|-------------|
| `-d, --dir PATH` | Installation directory (default: `~/.local/share/godot-mcp`) |
| `-g, --godot PATH` | Path to Godot executable |
| `-c, --configure NAME` | Show config for: `claude`, `cursor`, `cline`, `opencode` |
| `-h, --help` | Show help message |

---

### Install via npm (Fastest)

```bash
npx gopeak
```

Or install globally:
```bash
npm install -g gopeak
gopeak
```

Then configure your AI assistant to run `gopeak` (or `npx gopeak`) instead of `node /path/to/build/index.js`.

---

### Manual Installation

#### Step 1: Install and Build

```bash
git clone https://github.com/HaD0Yun/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

#### Step 2: Configure with Your AI Assistant

#### Option A: Configure with Cline (VS Code)

Add to your Cline MCP settings file:

**macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
**Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/path/to/godot",
        "DEBUG": "true"
      },
      "disabled": false
    }
  }
}
```

#### Option B: Configure with Cursor

1. Go to **Cursor Settings** > **Features** > **MCP**
2. Click **+ Add New MCP Server**
3. Name: `godot`, Type: `command`
4. Command: `node /absolute/path/to/godot-mcp/build/index.js`

#### Option C: Configure with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/absolute/path/to/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

#### Option D: Configure with OpenCode

Add to your `opencode.json`:

```json
{
  "mcp": {
    "godot": {
      "type": "local",
      "command": ["node", "/absolute/path/to/godot-mcp/build/index.js"],
      "enabled": true,
      "environment": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

### Step 3: Environment Variables

| Variable | Description |
|----------|-------------|
| `GODOT_PATH` | Path to Godot executable (auto-detected if not set) |
| `DEBUG` | Set to "true" for detailed logging |

---

## Example Prompts

Once configured, you can use natural language to control Godot:

### Scene Building
```
"Create a new scene with a CharacterBody2D root node called Player"
"Add a Sprite2D and CollisionShape2D to my Player scene"
"Duplicate the Enemy node and name it Enemy2"
```

### Script Operations
```
"Create a GDScript for my player with movement and jumping"
"Add a take_damage function to my player script that emits a health_changed signal"
"Show me the structure of my PlayerController script"
```

### Resource Management
```
"Create a red StandardMaterial3D for my enemy"
"Create a canvas_item shader with a dissolve effect"
"Generate a TileSet from my tilemap_atlas.png with 16x16 tiles"
"Modify the environment resource to enable fog and glow"
```

### ClassDB Discovery
```
"What 3D light types are available in Godot?"
"Show me all properties of CharacterBody3D"
"What classes inherit from Control?"
"Find all instantiable physics body types"
```

### Project Analysis
```
"Check my project health and show me any issues"
"Find all files that use the PlayerData resource"
"Show me the dependency graph for my main scene"
"Search my project for 'TODO' comments"
```

### Configuration
```
"Add a 'jump' input action mapped to Space and gamepad button 0"
"Register my GameManager script as an autoload singleton"
"Set the main scene to res://scenes/main_menu.tscn"
```

### Debugging
```
"Run my project and show me any errors"
"Parse my Godot error log and suggest fixes"
"Inspect the scene tree of my running game"
```

### Asset Library
```
"Search for a chair model across all asset sources"
"Find rock textures from AmbientCG"
"Download the nature-kit asset pack from Kenney"
"List all available asset providers"
```

### Screenshot & Input
```
"Take a screenshot of the running game"
"Press the jump action and capture the result"
"Click at position (400, 300) in the game"
"Simulate pressing the W key"
```

### GDScript Analysis (LSP)
```
"Check my player script for errors using the language server"
"Get code completions at line 25 in movement.gd"
"Show me hover info for the 'velocity' variable"
"Get the symbol outline for my main script"
```

### Debug Adapter
```
"Set a breakpoint at line 42 in player.gd"
"Show me the stack trace"
"Continue execution after the breakpoint"
"Get the debug console output"
```

---

## Included Addons

### Auto Reload Plugin (Recommended)

**Essential for MCP workflow** - automatically reloads scenes and scripts when modified externally.

#### Installation

**Option 1: One-Click Install**

**Linux / macOS (Bash)**
```bash
# Run in your Godot project folder
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.sh | bash
```

**Windows (PowerShell)**
```powershell
# Run in your Godot project folder
irm https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.ps1 | iex
```

**Option 2: Manual Install**
1. Copy `build/addon/auto_reload` to your project's `addons/` folder
2. Open your project in Godot
3. Go to **Project > Project Settings > Plugins**
4. Enable "Godot MCP Auto Reload"

#### How It Works

```
[1 sec polling] → Check file modification times → Reload changed files
```

| Feature | Detail |
|---------|--------|
| **Performance** | ~0.01ms per second (negligible) |
| **Watched Files** | Current scene + attached scripts |
| **Detection** | OS file modification timestamp |
| **Reload Method** | `EditorInterface.reload_scene_from_path()` |

#### Output Messages
```
[Godot MCP - AutoReload] Plugin activated - watching for external changes
[Godot MCP - AutoReload] Scene changed: res://scenes/player.tscn
[Godot MCP - AutoReload] Scene reloaded: res://scenes/player.tscn
```

#### Warning

**Data Loss Risk**: If you modify a scene in the editor AND externally at the same time, editor changes will be lost.

**Best Practice**:
- Use MCP for modifications
- Use Godot editor for viewing/testing only
- Save before external modifications

---

### Runtime Addon (Optional)

For live debugging features, install the runtime addon:

1. Copy `build/addon/godot_mcp_runtime` to your project's `addons/` folder
2. Enable in **Project Settings > Plugins**
3. The addon starts a TCP server on port 7777 when your game runs

**Runtime Tools:**
- `get_runtime_status` - Check if game is running
- `inspect_runtime_tree` - View live scene tree
- `set_runtime_property` - Modify properties in real-time
- `call_runtime_method` - Invoke methods remotely
- `get_runtime_metrics` - Monitor FPS, memory, draw calls
- `capture_screenshot` - Capture viewport as base64 image
- `capture_viewport` - Capture specific viewport texture
- `inject_action` / `inject_key` / `inject_mouse_click` / `inject_mouse_motion` - Input simulation

---

## Complete Tool Reference

### Core Tools (7)
| Tool | Description |
|------|-------------|
| `launch_editor` | Open Godot editor for a project |
| `run_project` | Execute project in debug mode |
| `stop_project` | Stop running project |
| `get_debug_output` | Get console output and errors |
| `get_godot_version` | Get installed Godot version |
| `list_projects` | Find projects in a directory |
| `get_project_info` | Get project structure info |

### Scene Tools (9)
| Tool | Description |
|------|-------------|
| `create_scene` | Create new scene file |
| `add_node` | Add ANY node type to scene (universal — replaces all specialized create_* node tools) |
| `delete_node` | Remove node from scene |
| `duplicate_node` | Clone node in scene |
| `reparent_node` | Move node to new parent |
| `list_scene_nodes` | Get scene tree structure |
| `get_node_properties` | Get all node properties |
| `set_node_properties` | Set multiple properties |
| `save_scene` | Save scene changes |

### Script Tools (3)
| Tool | Description |
|------|-------------|
| `create_script` | Create GDScript with templates |
| `modify_script` | Add functions/variables/signals |
| `get_script_info` | Analyze script structure |

### ClassDB Introspection Tools (3)
| Tool | Description |
|------|-------------|
| `query_classes` | Discover available Godot classes with filtering by name, category, and instantiability |
| `query_class_info` | Get methods, properties, signals, and enums for any class |
| `inspect_inheritance` | Explore class hierarchy — ancestors, children, all descendants |

### Resource Tools (7)
| Tool | Description |
|------|-------------|
| `create_resource` | Create ANY resource type as .tres file |
| `modify_resource` | Modify properties of existing .tres/.res files |
| `create_material` | Create material resource |
| `create_shader` | Create shader file |
| `load_sprite` | Load texture into Sprite2D |
| `export_mesh_library` | Export as MeshLibrary |
| `create_tileset` | Create TileSet resource |

### Animation Tools (2)
| Tool | Description |
|------|-------------|
| `create_animation` | Create animation in AnimationPlayer |
| `add_animation_track` | Add track with keyframes |

### Signal Tools (3)
| Tool | Description |
|------|-------------|
| `connect_signal` | Connect signal to method |
| `disconnect_signal` | Remove signal connection |
| `list_connections` | List all connections in scene |

### Import/Export Tools (7)
| Tool | Description |
|------|-------------|
| `get_import_status` | Check resource import status |
| `get_import_options` | Get import settings |
| `set_import_options` | Modify import settings |
| `reimport_resource` | Trigger reimport |
| `list_export_presets` | List export configurations |
| `export_project` | Build for distribution |
| `validate_project` | Check export readiness |

### Configuration Tools (7)
| Tool | Description |
|------|-------------|
| `get_project_setting` | Read project setting |
| `set_project_setting` | Write project setting |
| `add_autoload` | Register singleton |
| `remove_autoload` | Unregister singleton |
| `list_autoloads` | List all autoloads |
| `set_main_scene` | Set startup scene |
| `add_input_action` | Add input mapping |

### Plugin Tools (3)
| Tool | Description |
|------|-------------|
| `list_plugins` | List installed plugins |
| `enable_plugin` | Enable a plugin |
| `disable_plugin` | Disable a plugin |

### DX Tools (5)
| Tool | Description |
|------|-------------|
| `get_dependencies` | Map resource dependencies |
| `find_resource_usages` | Find all resource references |
| `parse_error_log` | Parse errors with suggestions |
| `get_project_health` | Comprehensive health check |
| `search_project` | Search across all files |

### Runtime Tools (5)
| Tool | Description |
|------|-------------|
| `get_runtime_status` | Check runtime connection |
| `inspect_runtime_tree` | Live scene inspection |
| `set_runtime_property` | Modify runtime property |
| `call_runtime_method` | Call method on running node |
| `get_runtime_metrics` | Get performance metrics |

### UID Tools (2)
| Tool | Description |
|------|-------------|
| `get_uid` | Get file UID (Godot 4.4+) |
| `update_project_uids` | Regenerate UIDs |

### Asset Library Tools (3)
| Tool | Description |
|------|-------------|
| `search_assets` | Search CC0 assets across Poly Haven, AmbientCG, and Kenney |
| `fetch_asset` | Download asset to your Godot project |
| `list_asset_providers` | List available providers and their capabilities |

### Screenshot Tools (2)
| Tool | Description |
|------|-------------|
| `capture_screenshot` | Capture running game viewport as base64 image |
| `capture_viewport` | Capture a specific viewport node's texture |

### Input Injection Tools (4)
| Tool | Description |
|------|-------------|
| `inject_action` | Simulate Godot input action press/release |
| `inject_key` | Simulate keyboard key event with modifiers |
| `inject_mouse_click` | Simulate mouse click at position |
| `inject_mouse_motion` | Simulate mouse movement |

### GDScript LSP Tools (4)
| Tool | Description |
|------|-------------|
| `lsp_get_diagnostics` | Get errors/warnings from Godot Language Server |
| `lsp_get_completions` | Get code completions at a position |
| `lsp_get_hover` | Get hover info for a symbol |
| `lsp_get_symbols` | Get document symbol outline |

### DAP (Debug) Tools (7)
| Tool | Description |
|------|-------------|
| `dap_get_output` | Get captured debug console output |
| `dap_set_breakpoint` | Set breakpoint in a GDScript file |
| `dap_remove_breakpoint` | Remove a breakpoint |
| `dap_continue` | Continue execution after breakpoint |
| `dap_pause` | Pause running debug target |
| `dap_step_over` | Step over current line |
| `dap_get_stack_trace` | Get current stack trace |

---

## Architecture

GoPeak uses a hybrid architecture:

1. **Direct CLI Commands**: Simple operations use Godot's built-in CLI
2. **Bundled GDScript**: Complex operations use a comprehensive `godot_operations.gd` script with ClassDB introspection
3. **Runtime Addon**: TCP server (port 7777) for live debugging, screenshot capture, and input injection
4. **Godot LSP Integration**: Connects to Godot editor's Language Server (port 6005) for GDScript diagnostics
5. **Godot DAP Integration**: Connects to Godot editor's Debug Adapter (port 6006) for breakpoints and stepping
6. **MCP Resources**: `godot://` URI protocol for direct project file access

**Key Design Decisions:**
- **ClassDB-based dynamic approach**: Instead of hardcoding tools for every Godot class, generic tools (`add_node`, `create_resource`) work with ANY class. AI discovers capabilities via `query_classes` and `query_class_info`
- **Type-safe serialization**: Automatic conversion for Vector2, Vector3, Color, Rect2, NodePath, and other Godot types
- **No temporary files**: Everything runs through the bundled GDScript operations dispatcher
- **Consistent error handling**: All operations validate inputs and provide meaningful error messages

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Godot not found | Set `GODOT_PATH` environment variable |
| Connection issues | Restart your AI assistant |
| Invalid project path | Ensure path contains `project.godot` |
| Build errors | Run `npm install` to install dependencies |
| Runtime tools not working | Install and enable the addon in your project |

---

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) guide.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Stats

- **95+ Tools** — comprehensive tools covering scene management, scripting, resources, animation, configuration, debugging, screenshots, input injection, LSP, DAP, and asset management
- **MCP Resources** — `godot://` URI protocol for direct project file access
- **GDScript LSP** — real-time diagnostics, completions, hover, and symbols via Godot's Language Server
- **Debug Adapter (DAP)** — breakpoints, stepping, stack traces, and console output capture
- **Screenshot Capture** — viewport capture from running games via runtime addon
- **Input Injection** — keyboard, mouse, and action simulation for automated testing
- **ClassDB Introspection** — AI dynamically discovers Godot classes, properties, and methods instead of relying on hardcoded tool definitions
- **20,000+ lines** of TypeScript and GDScript
- **~85% coverage** of Godot Engine's capabilities
- **Godot 4.x** full support (including 4.4+ UID features)
- **Auto Reload** plugin for seamless MCP integration
- **Multi-Source Asset Library** with CC0 assets from Poly Haven, AmbientCG, and Kenney
- **npm package** — install with `npx gopeak` or `npm install -g gopeak`

---

## Credits

- Original MCP server by [Coding-Solo](https://github.com/Coding-Solo/godot-mcp)
- Auto Reload plugin and unified package by [HaD0Yun](https://github.com/HaD0Yun)
