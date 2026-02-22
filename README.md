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

![GoPeak Hero](assets/gopeak-hero-v2.png)

**GoPeak is an MCP server for Godot that lets AI assistants run, inspect, modify, and debug real projects end-to-end.**

> Includes Auto Reload: when MCP edits scenes/scripts, the Godot editor refreshes automatically.

---

## Why GoPeak (Short Version)

- **Real project feedback loop**: run the game, read logs, fix issues in-context.
- **95+ tools** across scene, script, resource, runtime, LSP, DAP, input, and assets.
- **Deep Godot integration**: ClassDB introspection, runtime inspection, debugger hooks.
- **Faster iteration**: less copy-paste, more direct implementation/testing.

### Best For

- Solo/indie developers building quickly with AI assistance
- Teams that want AI to inspect real project state, not just generate snippets
- Debug-heavy workflows where runtime introspection and breakpoints matter

---

## GoPeak vs Upstream (Coding-Solo/godot-mcp)

| Capability | Upstream | GoPeak |
|---|---|---|
| GDScript LSP tools | Not available in README tool list | ✅ `lsp_get_diagnostics`, `lsp_get_completions`, `lsp_get_hover`, `lsp_get_symbols` |
| DAP debugging tools | Not available in README tool list | ✅ breakpoints, step/continue/pause, stack trace, debug output |
| Input injection tools | Not available in README tool list | ✅ `inject_action`, `inject_key`, `inject_mouse_click`, `inject_mouse_motion` |
| Screenshot capture tools | Not available in README tool list | ✅ `capture_screenshot`, `capture_viewport` |
| Auto Reload editor plugin | Not available | ✅ included `auto_reload` addon |
| Tool coverage scale | Smaller documented scope | ✅ 95+ MCP tools |

---

## Requirements

- Godot 4.x
- Node.js 18+
- MCP-compatible client (Claude Desktop, Cursor, Cline, OpenCode, etc.)

---

## Installation

### 1) Fastest (recommended)

```bash
npx gopeak
```

or

```bash
npm install -g gopeak
gopeak
```

### 2) Manual (from source)

```bash
git clone https://github.com/HaD0Yun/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

Set `GODOT_PATH` if Godot is not auto-detected.

### MCP Client Config (practical examples)

Use one of these depending on your client.

**A) Global install (`npm install -g gopeak`)**

```json
{
  "mcpServers": {
    "godot": {
      "command": "gopeak",
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

**B) No global install (npx mode)**

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["-y", "gopeak"],
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

> Tip: If your client uses `args` array style only, use `"command": "npx"` + `"args": ["-y", "gopeak"]`.

---

## Core Capabilities

- **Project control**: launch editor, run/stop project, capture debug output
- **Scene editing**: create scenes, add/delete/reparent nodes, edit properties
- **Script workflows**: create/modify scripts, inspect script structure
- **Resources**: create/modify resources, materials, shaders, tilesets
- **Signals/animation**: connect signals, build animations/tracks/state machines
- **Runtime tools**: inspect live tree, set properties, call methods, metrics
- **LSP + DAP**: diagnostics/completion/hover + breakpoints/step/stack trace
- **Input + screenshots**: keyboard/mouse/action injection and viewport capture
- **Asset library**: search/fetch CC0 assets (Poly Haven, AmbientCG, Kenney)

### Tool Coverage at a Glance

| Area | Examples |
|---|---|
| Scene/Node | `create_scene`, `add_node`, `set_node_properties` |
| Script | `create_script`, `modify_script`, `get_script_info` |
| Runtime | `inspect_runtime_tree`, `call_runtime_method` |
| LSP/DAP | `lsp_get_diagnostics`, `dap_set_breakpoint` |
| Input/Visual | `inject_key`, `inject_mouse_click`, `capture_screenshot` |

---

## Project Visualizer

Visualize your entire project architecture with `map_project`. Scripts are automatically grouped by folder structure into color-coded categories — no configuration needed.

![Project Visualizer — AI-generated architecture map](assets/visualizer-category-map.png)

> The AI scanned a real Godot project via `map_project` and produced this interactive dependency graph. Categories, colors, and grouping are derived automatically from your folder layout.

---

## Quick Prompt Examples

### Build
- "Create a Player scene with CharacterBody2D, Sprite2D, CollisionShape2D, and a basic movement script."
- "Add an enemy spawner scene and wire spawn signals to GameManager."

### Debug
- "Run the project, collect errors, and fix the top 3 issues automatically."
- "Set a breakpoint at `scripts/player.gd:42`, continue execution, and show the stack trace when hit."

### Runtime Testing
- "Press `ui_accept`, move mouse to (400, 300), click, then capture a screenshot."
- "Inspect the live scene tree and report nodes with missing scripts or invalid references."

### Refactor / Maintenance
- "Find all TODO/FIXME comments and group them by file with a priority suggestion."
- "Analyze project health and list quick wins to improve stability before release."

---

## Auto Reload Addon (Recommended)

Install in your Godot project folder:

```bash
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.sh | bash
```

Then enable plugin in **Project Settings → Plugins**.

---

## Troubleshooting

- **Godot not found** → set `GODOT_PATH`
- **No MCP tools visible** → restart your MCP client
- **Project path invalid** → confirm `project.godot` exists
- **Runtime tools not working** → install/enable runtime addon

---

## Docs & Project Links

- [CHANGELOG](CHANGELOG.md)
- [ROADMAP](ROADMAP.md)
- [CONTRIBUTING](CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](LICENSE).

## Credits

- Original MCP server by [Coding-Solo](https://github.com/Coding-Solo/godot-mcp)
- GoPeak enhancements by [HaD0Yun](https://github.com/HaD0Yun)
