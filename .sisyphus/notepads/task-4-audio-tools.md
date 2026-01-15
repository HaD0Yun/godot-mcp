# Task 4: Audio System Tools - Implementation Plan

## Overview
Implement 6 audio system tools in godot-mcp MCP server using direct .tscn file manipulation approach.

## Audio Tools to Implement (6 tools)

1. **create_audio_player** - Create AudioStreamPlayer/AudioStreamPlayer2D/AudioStreamPlayer3D nodes
2. **configure_audio_bus** - Configure audio bus settings in project.godot
3. **add_audio_effect** - Add audio effects to a bus
4. **create_audio_bus_layout** - Create AudioBusLayout resource file
5. **get_audio_bus_info** - Get configuration for a specific bus
6. **list_audio_buses** - List all audio buses with their settings

## Implementation Notes

### Critical Constraint from Plan
- AudioServer API requires runtime access
- NOT compatible with current `add_node` approach
- Must use **direct .tscn file manipulation** (read → modify → write)

### File Manipulation Pattern
```typescript
// Read scene file
const sceneContent = readFileSync(scenePath, 'utf8');

// Parse and modify as text
const modifiedContent = modifySceneAsText(sceneContent, modifications);

// Write back
writeFileSync(scenePath, modifiedContent, 'utf8');
```

### Audio Bus Configuration in project.godot
Audio buses are configured in `project.godot` under:
```ini
[application]

config/audio_buses="res://default_bus_layout.tres"
```

AudioBusLayout resource (.tres) contains bus definitions with effects.

## Implementation Steps

- [ ] 4.1 Add tool definition for create_audio_player
- [ ] 4.2 Add tool definition for configure_audio_bus
- [ ] 4.3 Add tool definition for add_audio_effect
- [ ] 4.4 Add tool definition for create_audio_bus_layout
- [ ] 4.5 Add tool definition for get_audio_bus_info
- [ ] 4.6 Add tool definition for list_audio_buses
- [ ] 4.7 Add handler for create_audio_player
- [ ] 4.8 Add handler for configure_audio_bus
- [ ] 4.9 Add handler for add_audio_effect
- [ ] 4.10 Add handler for create_audio_bus_layout
- [ ] 4.11 Add handler for get_audio_bus_info
- [ ] 4.12 Add handler for list_audio_buses
- [ ] 4.13 Run npm run build to verify
- [ ] 4.14 Commit: `feat: add audio system tools (players, buses, effects)`

## Learnings

*(Fill after implementation)*

## Issues/Blockers

*(Fill after implementation)*
