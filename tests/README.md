# Test Fixtures

This directory contains test fixtures for verifying godot-mcp tool functionality.

## Test Project (`fixtures/test_project/`)

A minimal but functional Godot 4.x project used for verifying all MCP tools across all phases.

### Structure

```
test_project/
├── project.godot          # Godot 4.3 minimal configuration
├── test_3d.tscn          # Sample 3D scene with MeshInstance3D + Camera3D
├── test_2d.tscn          # Sample 2D scene with ColorRect + Camera2D
└── icon.svg              # Default Godot icon (optional)
```

### Scene Contents

#### test_3d.tscn
- Root: Node3D
- MeshInstance3D with BoxMesh
- DirectionalLight3D for lighting
- Camera3D for rendering
- Use case: Test 3D node creation, lighting, camera tools

#### test_2d.tscn
- Root: Node2D
- ColorRect for visible 2D element
- Camera2D for 2D viewport
- Use case: Test 2D node creation, camera tools

### Verification Usage

For each phase, use this test project to verify tool functionality:

**Phase 1: 3D Graphics + Audio**
- Add OmniLight3D/SpotLight3D to test_3d.tscn
- Add AudioStreamPlayer to scene

**Phase 2: Particles + Navigation**
- Add GPUParticles3D to test_3d.tscn
- Add NavigationRegion3D for pathfinding tests

**Phase 3: Physics + AnimationTree + UI + GridMap**
- Add PhysicsBody3D + CollisionShape3D
- Add AnimationTree for animation tests
- Add Control nodes with Theme

**Phase 4: Architecture**
- Run validate_scene on test_3d.tscn
- Test workflow tools

### Opening the Project

```bash
# From this directory
cd fixtures/test_project
godot --editor

# Or use godot-mcp
godot_launch_editor("D:/OneCue/godot-mcp/tests/fixtures/test_project")
```

### Expected Behavior

The test project should:
- Open in Godot 4.x editor without errors
- Run with both test scenes (no script errors)
- Provide clean slate for testing all tools
- Allow incremental additions per phase

### Project Settings

- Godot Version: 4.3+ (config_version=5)
- Main Scene: test_3d.tscn
- Window Size: 1280x720
- Features: Minimal set, no dependencies
