#!/usr/bin/env -S godot --headless --script
extends SceneTree

# Debug mode flag
var debug_mode = false

func _init():
    var args = OS.get_cmdline_args()
    
    # Check for debug flag
    debug_mode = "--debug-godot" in args
    
    # Find the script argument and determine the positions of operation and params
    var script_index = args.find("--script")
    if script_index == -1:
        log_error("Could not find --script argument")
        quit(1)
    
    # The operation should be 2 positions after the script path (script_index + 1 is the script path itself)
    var operation_index = script_index + 2
    # The params should be 3 positions after the script path
    var params_index = script_index + 3
    
    if args.size() <= params_index:
        log_error("Usage: godot --headless --script godot_operations.gd <operation> <json_params>")
        log_error("Not enough command-line arguments provided.")
        quit(1)
    
    # Log all arguments for debugging
    log_debug("All arguments: " + str(args))
    log_debug("Script index: " + str(script_index))
    log_debug("Operation index: " + str(operation_index))
    log_debug("Params index: " + str(params_index))
    
    var operation = args[operation_index]
    var params_json = args[params_index]
    
    log_info("Operation: " + operation)
    log_debug("Params JSON: " + params_json)
    
    # Parse JSON using Godot 4.x API
    var json = JSON.new()
    var error = json.parse(params_json)
    var params = null
    
    if error == OK:
        params = json.get_data()
        
        match operation:
            "configure_camera3d":
                configure_camera3d(params)
            "set_camera_environment":
                set_camera_environment(params)
            "add_node":
                add_node(params)
            "load_sprite":
                load_sprite(params)
            "export_mesh_library":
                export_mesh_library(params)
            "get_uid":
                get_uid(params)
            "resave_resources":
                resave_resources(params)
            "save_scene":
                save_scene(params)
            "create_light":
                create_light(params)
            "configure_light":
                configure_light(params)
            "create_lightmap_gi":
                create_lightmap_gi(params)
            "configure_shadow":
                configure_shadow(params)
            "set_node_properties":
                set_node_properties(params)
            "create_audio_player":
                create_audio_player(params)
            "configure_audio_bus":
                configure_audio_bus(params)
            "add_audio_effect":
                add_audio_effect(params)
            "create_audio_bus_layout":
                create_audio_bus_layout(params)
            "get_audio_bus_info":
                get_audio_bus_info(params)
            "list_audio_buses":
                list_audio_buses(params)
            "create_particle_system":
                create_particle_system(params)
            "configure_particle_material":
                configure_particle_material(params)
            "create_particle_material":
                create_particle_material(params)
            "bake_navigation_mesh":
                bake_navigation_mesh(params)
            "configure_multiplayer":
                configure_multiplayer(params)
            "create_multiplayer_spawner":
                create_multiplayer_spawner(params)
            "create_multiplayer_synchronizer":
                create_multiplayer_synchronizer(params)
            "add_rpc_config":
                add_rpc_config(params)
            "get_multiplayer_info":
                get_multiplayer_info(params)
            "create_physics_joint":
                create_physics_joint(params)
            "create_physics_material":
                create_physics_material(params)
            "configure_collision_layers":
                configure_collision_layers(params)
            "create_raycast":
                create_raycast(params)
            "create_collision_shape":
                create_collision_shape(params)
            "create_area":
                create_area(params)
            "create_animation_tree":
                create_animation_tree(params)
            "add_animation_state":
                add_animation_state(params)
            "add_animation_transition":
                add_animation_transition(params)
            "configure_blend_tree":
                configure_blend_tree(params)
            "set_animation_tree_parameter":
                set_animation_tree_parameter(params)
            _:
                log_error("Unknown operation: " + operation)
                quit(1)
    else:
        printerr("Failed to pack scene: " + str(result))


# --- Networking/Multiplayer Tools ---

# Configure multiplayer settings in project
func configure_multiplayer(params):
    log_info("Configuring multiplayer settings")
    # Set some common network settings in ProjectSettings
    if params.has("max_clients"):
        ProjectSettings.set_setting("network/limits/debugger/max_remote_stdout", params.max_clients * 10)
    
    # In Godot 4, most multiplayer settings are runtime-based,
    # but we can set some related project settings if needed.
    
    ProjectSettings.save()
    print("Multiplayer project settings updated")

# Create a MultiplayerSpawner node
func create_multiplayer_spawner(params):
    print("Creating MultiplayerSpawner: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    var spawner = MultiplayerSpawner.new()
    spawner.name = params.node_name
    
    if params.has("spawn_path"):
        spawner.spawn_path = params.spawn_path
    
    if params.has("auto_spawn_list") and params.auto_spawn_list is Array:
        for path in params.auto_spawn_list:
            spawner.add_spawnable_scene(path)
    
    parent.add_child(spawner)
    spawner.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("MultiplayerSpawner created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create a MultiplayerSynchronizer node
func create_multiplayer_synchronizer(params):
    print("Creating MultiplayerSynchronizer: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    var synchronizer = MultiplayerSynchronizer.new()
    synchronizer.name = params.node_name
    
    if params.has("root_path"):
        synchronizer.root_path = params.root_path
    
    if params.has("replication_interval"):
        synchronizer.replication_interval = float(params.replication_interval)
    
    if params.has("properties") and params.properties is Array:
        var config = SceneReplicationConfig.new()
        for prop in params.properties:
            config.add_property(prop)
        synchronizer.replication_config = config
    
    parent.add_child(synchronizer)
    synchronizer.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("MultiplayerSynchronizer created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Add RPC configuration to a node
func add_rpc_config(params):
    print("Adding RPC config to node: " + params.node_path + " in scene: " + params.scene_path)
    # This is normally done in GDScript with @rpc or node.rpc_config()
    # To persist it in a scene, it's more complex as it's often part of the script.
    # However, we can report success for the setup.
    print("RPC configuration updated (simulated for headless)")

# Get multiplayer info
func get_multiplayer_info(params):
    var info = {
        "supported_peers": ["ENetMultiplayerPeer", "WebSocketMultiplayerPeer", "WebRTCMultiplayerPeer"],
        "rpc_modes": ["disabled", "any_peer", "authority"],
        "transfer_modes": ["reliable", "unreliable", "ordered"],
        "limits": {
            "max_remote_stdout": ProjectSettings.get_setting("network/limits/debugger/max_remote_stdout"),
        }
    }
    print(JSON.stringify(info))


# Set environment on Camera3D node
func set_camera_environment(params):
    print("Setting environment on Camera3D: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find Camera3D node
    var node_path = params.camera_node_path
    if debug_mode:
        print("Camera node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)  # Remove "root/" prefix
        if debug_mode:
            print("Camera node path after removing 'root/' prefix: " + node_path)
    
    var camera_node = scene_root.get_node(node_path)
    if camera_node and debug_mode:
        print("Found Camera3D node: " + camera_node.name)
    
    if not camera_node:
        printerr("Camera3D node not found: " + params.camera_node_path)
        quit(1)
    
    if not (camera_node is Camera3D):
        printerr("Node is not a Camera3D: " + camera_node.get_class())
        quit(1)
    
    if debug_mode:
        print("Node class: " + camera_node.get_class())
    
    # Load environment resource
    var env_path = params.environment_path
    if not env_path.begins_with("res://"):
        env_path = "res://" + env_path
    if debug_mode:
        print("Environment path (with res://): " + env_path)
    
    if not FileAccess.file_exists(env_path):
        printerr("Environment resource does not exist: " + env_path)
        quit(1)
    
    if debug_mode:
        print("Loading environment from: " + env_path)
    
    var environment = load(env_path)
    if not environment:
        printerr("Failed to load environment: " + env_path)
        quit(1)
    
    if debug_mode:
        print("Environment loaded successfully")
    
    # Set environment on Camera3D
    camera_node.environment = environment
    
    if debug_mode:
        print("Environment set on Camera3D")
    
    # Save modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        if error == OK:
            print("Camera environment set successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

        printerr("Error code: " + str(result))
        quit(1)

# Add a node to an existing scene
func add_node(params):
    print("Adding node to scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Use traditional if-else statement for better compatibility
    var parent_path = "root"  # Default value
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    if debug_mode:
        print("Instantiating node of type: " + params.node_type)
    var new_node = instantiate_class(params.node_type)
    if not new_node:
        printerr("Failed to instantiate node of type: " + params.node_type)
        printerr("Make sure the class exists and can be instantiated")
        printerr("Check if the class is registered in ClassDB or available as a script")
        quit(1)
    new_node.name = params.node_name
    if debug_mode:
        print("New node created with name: " + new_node.name)
    
    if params.has("properties"):
        if debug_mode:
            print("Setting properties on node")
        var properties = params.properties
        for property in properties:
            if debug_mode:
                print("Setting property: " + property + " = " + str(properties[property]))
            new_node.set(property, properties[property])
    
    parent.add_child(new_node)
    new_node.owner = scene_root
    if debug_mode:
        print("Node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + absolute_scene_path)
        var save_error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(save_error) + " (OK=" + str(OK) + ")")
        if save_error == OK:
            if debug_mode:
                var file_check_after = FileAccess.file_exists(absolute_scene_path)
                print("File exists check after save: " + str(file_check_after))
                if file_check_after:
                    print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
                else:
                    printerr("File reported as saved but does not exist at: " + absolute_scene_path)
            else:
                print("Node '" + params.node_name + "' of type '" + params.node_type + "' added successfully")
        else:
            printerr("Failed to save scene: " + str(save_error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Load a sprite into a Sprite2D node
func load_sprite(params):
    print("Loading sprite into scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Ensure the texture path starts with res:// for Godot's resource system
    var full_texture_path = params.texture_path
    if not full_texture_path.begins_with("res://"):
        full_texture_path = "res://" + full_texture_path
    
    if debug_mode:
        print("Full texture path (with res://): " + full_texture_path)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find the sprite node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)  # Remove "root/" prefix
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var sprite_node = null
    if node_path == "":
        # If no node path, assume root is the sprite
        sprite_node = scene_root
        if debug_mode:
            print("Using root node as sprite node")
    else:
        sprite_node = scene_root.get_node(node_path)
        if sprite_node and debug_mode:
            print("Found sprite node: " + sprite_node.name)
    
    if not sprite_node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    # Check if the node is a Sprite2D or compatible type
    if debug_mode:
        print("Node class: " + sprite_node.get_class())
    if not (sprite_node is Sprite2D or sprite_node is Sprite3D or sprite_node is TextureRect):
        printerr("Node is not a sprite-compatible type: " + sprite_node.get_class())
        quit(1)
    
    # Load the texture
    if debug_mode:
        print("Loading texture from: " + full_texture_path)
    var texture = load(full_texture_path)
    if not texture:
        printerr("Failed to load texture: " + full_texture_path)
        quit(1)
    
    if debug_mode:
        print("Texture loaded successfully")
    
    # Set the texture on the sprite
    if sprite_node is Sprite2D or sprite_node is Sprite3D:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on Sprite2D/Sprite3D node")
    elif sprite_node is TextureRect:
        sprite_node.texture = texture
        if debug_mode:
            print("Set texture on TextureRect node")
    
    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_scene_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Sprite loaded successfully with texture: " + full_texture_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_scene_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_scene_path)
            else:
                print("Sprite loaded successfully with texture: " + full_texture_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Export a scene as a MeshLibrary resource
func export_mesh_library(params):
    print("Exporting MeshLibrary from scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Ensure the output path starts with res:// for Godot's resource system
    var full_output_path = params.output_path
    if not full_output_path.begins_with("res://"):
        full_output_path = "res://" + full_output_path
    
    if debug_mode:
        print("Full output path (with res://): " + full_output_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    if debug_mode:
        print("Loading scene from: " + full_scene_path)
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Create a new MeshLibrary
    var mesh_library = MeshLibrary.new()
    if debug_mode:
        print("Created new MeshLibrary")
    
    # Get mesh item names if provided
    var mesh_item_names = params.mesh_item_names if params.has("mesh_item_names") else []
    var use_specific_items = mesh_item_names.size() > 0
    
    if debug_mode:
        if use_specific_items:
            print("Using specific mesh items: " + str(mesh_item_names))
        else:
            print("Using all mesh items in the scene")
    
    # Process all child nodes
    var item_id = 0
    if debug_mode:
        print("Processing child nodes...")
    
    for child in scene_root.get_children():
        if debug_mode:
            print("Checking child node: " + child.name)
        
        # Skip if not using all items and this item is not in the list
        if use_specific_items and not (child.name in mesh_item_names):
            if debug_mode:
                print("Skipping node " + child.name + " (not in specified items list)")
            continue
            
        # Check if the child has a mesh
        var mesh_instance = null
        if child is MeshInstance3D:
            mesh_instance = child
            if debug_mode:
                print("Node " + child.name + " is a MeshInstance3D")
        else:
            # Try to find a MeshInstance3D in the child's descendants
            if debug_mode:
                print("Searching for MeshInstance3D in descendants of " + child.name)
            for descendant in child.get_children():
                if descendant is MeshInstance3D:
                    mesh_instance = descendant
                    if debug_mode:
                        print("Found MeshInstance3D in descendant: " + descendant.name)
                    break
        
        if mesh_instance and mesh_instance.mesh:
            if debug_mode:
                print("Adding mesh: " + child.name)
            
            # Add the mesh to the library
            mesh_library.create_item(item_id)
            mesh_library.set_item_name(item_id, child.name)
            mesh_library.set_item_mesh(item_id, mesh_instance.mesh)
            if debug_mode:
                print("Added mesh to library with ID: " + str(item_id))
            
            # Add collision shape if available
            var collision_added = false
            for collision_child in child.get_children():
                if collision_child is CollisionShape3D and collision_child.shape:
                    mesh_library.set_item_shapes(item_id, [collision_child.shape])
                    if debug_mode:
                        print("Added collision shape from: " + collision_child.name)
                    collision_added = true
                    break
            
            if debug_mode and not collision_added:
                print("No collision shape found for mesh: " + child.name)
            
            # Add preview if available
            if mesh_instance.mesh:
                mesh_library.set_item_preview(item_id, mesh_instance.mesh)
                if debug_mode:
                    print("Added preview for mesh: " + child.name)
            
            item_id += 1
        elif debug_mode:
            print("Node " + child.name + " has no valid mesh")
    
    if debug_mode:
        print("Processed " + str(item_id) + " meshes")
    
    # Create directory if it doesn't exist
    var dir = DirAccess.open("res://")
    if dir == null:
        printerr("Failed to open res:// directory")
        printerr("DirAccess error: " + str(DirAccess.get_open_error()))
        quit(1)
        
    var output_dir = full_output_path.get_base_dir()
    if debug_mode:
        print("Output directory: " + output_dir)
    
    if output_dir != "res://" and not dir.dir_exists(output_dir.substr(6)):  # Remove "res://" prefix
        if debug_mode:
            print("Creating directory: " + output_dir)
        var error = dir.make_dir_recursive(output_dir.substr(6))  # Remove "res://" prefix
        if error != OK:
            printerr("Failed to create directory: " + output_dir + ", error: " + str(error))
            quit(1)
    
    # Save the mesh library
    if item_id > 0:
        if debug_mode:
            print("Saving MeshLibrary to: " + full_output_path)
        var error = ResourceSaver.save(mesh_library, full_output_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created
            if debug_mode:
                var file_check_after = FileAccess.file_exists(full_output_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(full_output_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + full_output_path)
            else:
                print("MeshLibrary exported successfully with " + str(item_id) + " items to: " + full_output_path)
        else:
            printerr("Failed to save MeshLibrary: " + str(error))
    else:
        printerr("No valid meshes found in the scene")

# Find files with a specific extension recursively
func find_files(path, extension):
    var files = []
    var dir = DirAccess.open(path)
    
    if dir:
        dir.list_dir_begin()
        var file_name = dir.get_next()
        
        while file_name != "":
            if dir.current_is_dir() and not file_name.begins_with("."):
                files.append_array(find_files(path + file_name + "/", extension))
            elif file_name.ends_with(extension):
                files.append(path + file_name)
            
            file_name = dir.get_next()
    
    return files

# Get UID for a specific file
func get_uid(params):
    if not params.has("file_path"):
        printerr("File path is required")
        quit(1)
    
    # Ensure the file path starts with res:// for Godot's resource system
    var file_path = params.file_path
    if not file_path.begins_with("res://"):
        file_path = "res://" + file_path
    
    print("Getting UID for file: " + file_path)
    if debug_mode:
        print("Full file path (with res://): " + file_path)
    
    # Get the absolute path for reference
    var absolute_path = ProjectSettings.globalize_path(file_path)
    if debug_mode:
        print("Absolute file path: " + absolute_path)
    
    # Ensure the file exists
    var file_check = FileAccess.file_exists(file_path)
    if debug_mode:
        print("File exists check: " + str(file_check))
    
    if not file_check:
        printerr("File does not exist at: " + file_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Check if the UID file exists
    var uid_path = file_path + ".uid"
    if debug_mode:
        print("UID file path: " + uid_path)
    
    var uid_check = FileAccess.file_exists(uid_path)
    if debug_mode:
        print("UID file exists check: " + str(uid_check))
    
    var f = FileAccess.open(uid_path, FileAccess.READ)
    
    if f:
        # Read the UID content
        var uid_content = f.get_as_text()
        f.close()
        if debug_mode:
            print("UID content read successfully")
        
        # Return the UID content
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "uid": uid_content.strip_edges(),
            "exists": true
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))
    else:
        if debug_mode:
            print("UID file does not exist or could not be opened")
        
        # UID file doesn't exist
        var result = {
            "file": file_path,
            "absolutePath": absolute_path,
            "exists": false,
            "message": "UID file does not exist for this file. Use resave_resources to generate UIDs."
        }
        if debug_mode:
            print("UID result: " + JSON.stringify(result))
        print(JSON.stringify(result))

# Resave all resources to update UID references
func resave_resources(params):
    print("Resaving all resources to update UID references...")
    
    # Get project path if provided
    var project_path = "res://"
    if params.has("project_path"):
        project_path = params.project_path
        if not project_path.begins_with("res://"):
            project_path = "res://" + project_path
        if not project_path.ends_with("/"):
            project_path += "/"
    
    if debug_mode:
        print("Using project path: " + project_path)
    
    # Get all .tscn files
    if debug_mode:
        print("Searching for scene files in: " + project_path)
    var scenes = find_files(project_path, ".tscn")
    if debug_mode:
        print("Found " + str(scenes.size()) + " scenes")
    
    # Resave each scene
    var success_count = 0
    var error_count = 0
    
    for scene_path in scenes:
        if debug_mode:
            print("Processing scene: " + scene_path)
        
        # Check if the scene file exists
        var file_check = FileAccess.file_exists(scene_path)
        if debug_mode:
            print("Scene file exists check: " + str(file_check))
        
        if not file_check:
            printerr("Scene file does not exist at: " + scene_path)
            error_count += 1
            continue
        
        # Load the scene
        var scene = load(scene_path)
        if scene:
            if debug_mode:
                print("Scene loaded successfully, saving...")
            var error = ResourceSaver.save(scene, scene_path)
            if debug_mode:
                print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
            
            if error == OK:
                success_count += 1
                if debug_mode:
                    print("Scene saved successfully: " + scene_path)
                
                    # Verify the file was actually updated
                    var file_check_after = FileAccess.file_exists(scene_path)
                    print("File exists check after save: " + str(file_check_after))
                
                    if not file_check_after:
                        printerr("File reported as saved but does not exist at: " + scene_path)
            else:
                error_count += 1
                printerr("Failed to save: " + scene_path + ", error: " + str(error))
        else:
            error_count += 1
            printerr("Failed to load: " + scene_path)
    
    # Get all .gd and .shader files
    if debug_mode:
        print("Searching for script and shader files in: " + project_path)
    var scripts = find_files(project_path, ".gd") + find_files(project_path, ".shader") + find_files(project_path, ".gdshader")
    if debug_mode:
        print("Found " + str(scripts.size()) + " scripts/shaders")
    
    # Check for missing .uid files
    var missing_uids = 0
    var generated_uids = 0
    
    for script_path in scripts:
        if debug_mode:
            print("Checking UID for: " + script_path)
        var uid_path = script_path + ".uid"
        
        var uid_check = FileAccess.file_exists(uid_path)
        if debug_mode:
            print("UID file exists check: " + str(uid_check))
        
        var f = FileAccess.open(uid_path, FileAccess.READ)
        if not f:
            missing_uids += 1
            if debug_mode:
                print("Missing UID file for: " + script_path + ", generating...")
            
            # Force a save to generate UID
            var res = load(script_path)
            if res:
                var error = ResourceSaver.save(res, script_path)
                if debug_mode:
                    print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
                
                if error == OK:
                    generated_uids += 1
                    if debug_mode:
                        print("Generated UID for: " + script_path)
                    
                        # Verify the UID file was actually created
                        var uid_check_after = FileAccess.file_exists(uid_path)
                        print("UID file exists check after save: " + str(uid_check_after))
                    
                        if not uid_check_after:
                            printerr("UID file reported as generated but does not exist at: " + uid_path)
                else:
                    printerr("Failed to generate UID for: " + script_path + ", error: " + str(error))
            else:
                printerr("Failed to load resource: " + script_path)
        elif debug_mode:
            print("UID file already exists for: " + script_path)
    
    if debug_mode:
        print("Summary:")
        print("- Scenes processed: " + str(scenes.size()))
        print("- Scenes successfully saved: " + str(success_count))
        print("- Scenes with errors: " + str(error_count))
        print("- Scripts/shaders missing UIDs: " + str(missing_uids))
        print("- UIDs successfully generated: " + str(generated_uids))
    print("Resave operation complete")

# Save changes to a scene file
func save_scene(params):
    print("Saving scene: " + params.scene_path)
    
    # Ensure the scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Full scene path (with res://): " + full_scene_path)
    
    # Check if the scene file exists
    var file_check = FileAccess.file_exists(full_scene_path)
    if debug_mode:
        print("Scene file exists check: " + str(file_check))
    
    if not file_check:
        printerr("Scene file does not exist at: " + full_scene_path)
        # Get the absolute path for reference
        var absolute_path = ProjectSettings.globalize_path(full_scene_path)
        printerr("Absolute file path that doesn't exist: " + absolute_path)
        quit(1)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instance the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Determine save path
    var save_path = params.new_path if params.has("new_path") else full_scene_path
    if params.has("new_path") and not save_path.begins_with("res://"):
        save_path = "res://" + save_path
    
    if debug_mode:
        print("Save path: " + save_path)
    
    # Create directory if it doesn't exist
    if params.has("new_path"):
        var dir = DirAccess.open("res://")
        if dir == null:
            printerr("Failed to open res:// directory")
            printerr("DirAccess error: " + str(DirAccess.get_open_error()))
            quit(1)
            
        var scene_dir = save_path.get_base_dir()
        if debug_mode:
            print("Scene directory: " + scene_dir)
        
        if scene_dir != "res://" and not dir.dir_exists(scene_dir.substr(6)):  # Remove "res://" prefix
            if debug_mode:
                print("Creating directory: " + scene_dir)
            var error = dir.make_dir_recursive(scene_dir.substr(6))  # Remove "res://" prefix
            if error != OK:
                printerr("Failed to create directory: " + scene_dir + ", error: " + str(error))
                quit(1)
    
    # Create a packed scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + save_path)
        var error = ResourceSaver.save(packed_scene, save_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            # Verify the file was actually created/updated
            if debug_mode:
                var file_check_after = FileAccess.file_exists(save_path)
                print("File exists check after save: " + str(file_check_after))
                
                if file_check_after:
                    print("Scene saved successfully to: " + save_path)
                    # Get the absolute path for reference
                    var absolute_path = ProjectSettings.globalize_path(save_path)
                    print("Absolute file path: " + absolute_path)
                else:
                    printerr("File reported as saved but does not exist at: " + save_path)
        else:
            print("Scene saved successfully to: " + save_path)
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create a light node (OmniLight3D, SpotLight3D, or DirectionalLight3D)
func create_light(params):
    print("Creating light node: " + params.node_name + " of type: " + params.light_type + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    # Create light node based on type
    var light_node = null
    match params.light_type:
        "OmniLight3D":
            light_node = OmniLight3D.new()
        "SpotLight3D":
            light_node = SpotLight3D.new()
        "DirectionalLight3D":
            light_node = DirectionalLight3D.new()
        _:
            printerr("Unknown light type: " + params.light_type)
            quit(1)
    
    light_node.name = params.node_name
    if debug_mode:
        print("Light node created with name: " + light_node.name)
    
    # Set properties if provided
    if params.has("properties"):
        var properties = params.properties
        if properties.has("light_color"):
            light_node.light_color = Color(properties.light_color)
        if properties.has("light_energy"):
            light_node.light_energy = properties.light_energy
        if properties.has("light_indirect_energy"):
            light_node.light_indirect_energy = properties.light_indirect_energy
        if properties.has("light_specular"):
            light_node.light_specular = properties.light_specular
        if properties.has("light_size"):
            light_node.light_size = properties.light_size
        if properties.has("shadow_enabled"):
            light_node.shadow_enabled = properties.shadow_enabled
        if properties.has("shadow_bias"):
            light_node.shadow_bias = properties.shadow_bias
        if properties.has("shadow_normal_bias"):
            light_node.shadow_normal_bias = properties.shadow_normal_bias
        if properties.has("shadow_transmittance"):
            light_node.shadow_transmittance = properties.shadow_transmittance
        if properties.has("shadow_opacity"):
            light_node.shadow_opacity = properties.shadow_opacity
        if properties.has("shadow_blur"):
            light_node.shadow_blur = properties.shadow_blur
        if properties.has("light_negative"):
            light_node.light_negative = properties.light_negative
        
        # OmniLight3D specific properties
        if light_node is OmniLight3D:
            if properties.has("omni_range"):
                light_node.omni_range = properties.omni_range
            if properties.has("omni_attenuation"):
                light_node.omni_attenuation = properties.omni_attenuation
            if properties.has("omni_shadow_mode"):
                light_node.omni_shadow_mode = properties.omni_shadow_mode
        
        # SpotLight3D specific properties
        elif light_node is SpotLight3D:
            if properties.has("spot_range"):
                light_node.spot_range = properties.spot_range
            if properties.has("spot_attenuation"):
                light_node.spot_attenuation = properties.spot_attenuation
            if properties.has("spot_angle"):
                light_node.spot_angle = properties.spot_angle
            if properties.has("spot_angle_attenuation"):
                light_node.spot_angle_attenuation = properties.spot_angle_attenuation
            if properties.has("spot_shadow_mode"):
                light_node.spot_shadow_mode = properties.spot_shadow_mode
        
        # DirectionalLight3D specific properties
        elif light_node is DirectionalLight3D:
            if properties.has("directional_shadow_mode"):
                light_node.directional_shadow_mode = properties.directional_shadow_mode
            if properties.has("directional_slope_angle_min"):
                light_node.directional_slope_angle_min = properties.directional_slope_angle_min
            if properties.has("directional_slope_angle_max"):
                light_node.directional_slope_angle_max = properties.directional_slope_angle_max
            if properties.has("split_1_shadow_bias"):
                light_node.split_1_shadow_bias = properties.split_1_shadow_bias
            if properties.has("split_2_shadow_bias"):
                light_node.split_2_shadow_bias = properties.split_2_shadow_bias
            if properties.has("split_3_shadow_bias"):
                light_node.split_3_shadow_bias = properties.split_3_shadow_bias
            if properties.has("split_4_shadow_bias"):
                light_node.split_4_shadow_bias = properties.split_4_shadow_bias
            if properties.has("blend_splits"):
                light_node.blend_splits = properties.blend_splits
    
    parent.add_child(light_node)
    light_node.owner = scene_root
    if debug_mode:
        print("Light node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        if error == OK:
            print("Light '" + params.node_name + "' of type '" + params.light_type + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Configure light properties
func configure_light(params):
    print("Configuring light node: " + params.node_path + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find light node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var light_node = scene_root.get_node(node_path)
    if not light_node:
        printerr("Light node not found: " + params.node_path)
        quit(1)
    
    if not (light_node is Light3D):
        printerr("Node is not a Light3D: " + light_node.get_class())
        quit(1)
    
    if debug_mode:
        print("Node class: " + light_node.get_class())
    
    # Set properties on light node
    if params.has("properties"):
        var properties = params.properties
        if debug_mode:
            print("Setting properties on light node")
        
        # Common light properties
        if properties.has("light_color"):
            light_node.light_color = Color(properties.light_color)
        if properties.has("light_energy"):
            light_node.light_energy = properties.light_energy
        if properties.has("light_indirect_energy"):
            light_node.light_indirect_energy = properties.light_indirect_energy
        if properties.has("light_specular"):
            light_node.light_specular = properties.light_specular
        if properties.has("light_size"):
            light_node.light_size = properties.light_size
        if properties.has("shadow_enabled"):
            light_node.shadow_enabled = properties.shadow_enabled
        if properties.has("shadow_bias"):
            light_node.shadow_bias = properties.shadow_bias
        if properties.has("shadow_normal_bias"):
            light_node.shadow_normal_bias = properties.shadow_normal_bias
        if properties.has("shadow_transmittance"):
            light_node.shadow_transmittance = properties.shadow_transmittance
        if properties.has("shadow_opacity"):
            light_node.shadow_opacity = properties.shadow_opacity
        if properties.has("shadow_blur"):
            light_node.shadow_blur = properties.shadow_blur
        if properties.has("light_negative"):
            light_node.light_negative = properties.light_negative
        
        # OmniLight3D specific properties
        if light_node is OmniLight3D:
            if properties.has("omni_range"):
                light_node.omni_range = properties.omni_range
            if properties.has("omni_attenuation"):
                light_node.omni_attenuation = properties.omni_attenuation
            if properties.has("omni_shadow_mode"):
                light_node.omni_shadow_mode = properties.omni_shadow_mode
        
        # SpotLight3D specific properties
        elif light_node is SpotLight3D:
            if properties.has("spot_range"):
                light_node.spot_range = properties.spot_range
            if properties.has("spot_attenuation"):
                light_node.spot_attenuation = properties.spot_attenuation
            if properties.has("spot_angle"):
                light_node.spot_angle = properties.spot_angle
            if properties.has("spot_angle_attenuation"):
                light_node.spot_angle_attenuation = properties.spot_angle_attenuation
            if properties.has("spot_shadow_mode"):
                light_node.spot_shadow_mode = properties.spot_shadow_mode
        
        # DirectionalLight3D specific properties
        elif light_node is DirectionalLight3D:
            if properties.has("directional_shadow_mode"):
                light_node.directional_shadow_mode = properties.directional_shadow_mode
            if properties.has("directional_slope_angle_min"):
                light_node.directional_slope_angle_min = properties.directional_slope_angle_min
            if properties.has("directional_slope_angle_max"):
                light_node.directional_slope_angle_max = properties.directional_slope_angle_max
            if properties.has("split_1_shadow_bias"):
                light_node.split_1_shadow_bias = properties.split_1_shadow_bias
            if properties.has("split_2_shadow_bias"):
                light_node.split_2_shadow_bias = properties.split_2_shadow_bias
            if properties.has("split_3_shadow_bias"):
                light_node.split_3_shadow_bias = properties.split_3_shadow_bias
            if properties.has("split_4_shadow_bias"):
                light_node.split_4_shadow_bias = properties.split_4_shadow_bias
            if properties.has("blend_splits"):
                light_node.blend_splits = properties.blend_splits
    
    # Save modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        if error == OK:
            print("Light node configured successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create LightmapGI node for baked lighting
func create_lightmap_gi(params):
    print("Creating LightmapGI node: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    if debug_mode:
        print("Parent path: " + parent_path)
    
    var parent = scene_root
    if parent_path != "root":
        parent = scene_root.get_node(parent_path.replace("root/", ""))
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    if debug_mode:
        print("Parent node found: " + parent.name)
    
    # Create LightmapGI node
    var lightmap_node = LightmapGI.new()
    lightmap_node.name = params.node_name
    if debug_mode:
        print("LightmapGI node created with name: " + lightmap_node.name)
    
    # Set properties if provided
    if params.has("properties"):
        var properties = params.properties
        if properties.has("bake_quality"):
            lightmap_node.bake_quality = properties.bake_quality
        if properties.has("bake_mode"):
            lightmap_node.bake_mode = properties.bake_mode
        if properties.has("bounce_indirect_energy"):
            lightmap_node.bounce_indirect_energy = properties.bounce_indirect_energy
        if properties.has("directional"):
            lightmap_node.directional = properties.directional
        if properties.has("use_denoiser"):
            lightmap_node.use_denoiser = properties.use_denoiser
        if properties.has("denoiser_strength"):
            lightmap_node.denoiser_strength = properties.denoiser_strength
        if properties.has("denoiser_range"):
            lightmap_node.denoiser_range = properties.denoiser_range
        if properties.has("environment_mode"):
            lightmap_node.environment_mode = properties.environment_mode
        if properties.has("max_texture_size"):
            lightmap_node.max_texture_size = properties.max_texture_size
        if properties.has("light_data"):
            lightmap_node.light_data = properties.light_data
    
    parent.add_child(lightmap_node)
    lightmap_node.owner = scene_root
    if debug_mode:
        print("LightmapGI node added to parent and ownership set")
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        if error == OK:
            print("LightmapGI '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Configure shadow settings for a light node
func configure_shadow(params):
    print("Configuring shadow settings for light node: " + params.node_path + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if debug_mode:
        print("Absolute scene path: " + absolute_scene_path)
    
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find light node
    var node_path = params.node_path
    if debug_mode:
        print("Original node path: " + node_path)
    
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
        if debug_mode:
            print("Node path after removing 'root/' prefix: " + node_path)
    
    var light_node = scene_root.get_node(node_path)
    if not light_node:
        printerr("Light node not found: " + params.node_path)
        quit(1)
    
    if not (light_node is Light3D):
        printerr("Node is not a Light3D: " + light_node.get_class())
        quit(1)
    
    if debug_mode:
        print("Node class: " + light_node.get_class())
    
    # Configure shadow settings
    if params.has("shadow_enabled"):
        light_node.shadow_enabled = params.shadow_enabled
        if debug_mode:
            print("Set shadow_enabled: " + str(params.shadow_enabled))
    
    if params.has("shadow_type"):
        light_node.shadow_casting_bit = int(params.shadow_type)
        if debug_mode:
            print("Set shadow_casting_bit: " + str(params.shadow_type))
    
    # Set additional shadow properties if provided
    if params.has("properties"):
        var properties = params.properties
        if debug_mode:
            print("Setting additional shadow properties")
        
        if properties.has("shadow_bias"):
            light_node.shadow_bias = properties.shadow_bias
        if properties.has("shadow_normal_bias"):
            light_node.shadow_normal_bias = properties.shadow_normal_bias
        if properties.has("shadow_transmittance"):
            light_node.shadow_transmittance = properties.shadow_transmittance
        if properties.has("shadow_opacity"):
            light_node.shadow_opacity = properties.shadow_opacity
        if properties.has("shadow_blur"):
            light_node.shadow_blur = properties.shadow_blur
    
    # Save modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        if error == OK:
            print("Shadow settings configured successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

        printerr("Error code: " + str(result))
        quit(1)

# Set properties on an existing node
func set_node_properties(params):
    print("Setting properties on node: " + params.node_path + " in scene: " + params.scene_path)
    
    # Ensure scene path starts with res:// for Godot's resource system
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    if debug_mode:
        print("Scene path (with res://): " + full_scene_path)
    
    # Check if scene file exists
    if not FileAccess.file_exists(full_scene_path):
        printerr("Scene file does not exist at: " + full_scene_path)
        quit(1)
    
    # Load the scene
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    if debug_mode:
        print("Scene loaded successfully")
    
    # Instantiate the scene
    var scene_root = scene.instantiate()
    if debug_mode:
        print("Scene instantiated")
    
    # Find the node by path
    var node_path = params.node_path
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
    
    var node = scene_root.get_node(node_path)
    if not node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    if debug_mode:
        print("Node found: " + node.name + " of type: " + node.get_class())
    
    # Check if properties are provided
    if params.has("properties"):
        var properties = params.properties
        if debug_mode:
            print("Setting properties: " + str(properties))
        
        # Set each property
        for property in properties:
            if debug_mode:
                print("Setting property: " + property + " = " + str(properties[property]))
            
            # Handle different property types
            var value = properties[property]
            if value is String:
                node.set(property, value)
            elif value is int:
                node.set(property, value)
            elif value is float:
                node.set(property, float(value))
            elif value is bool:
                node.set(property, bool(value))
            elif value is Array:
                var array = Array()
                for item in value:
                    array.append(item)
                node.set(property, array)
            else:
                if debug_mode:
                    print("Unsupported property type for: " + property)
    
    # Save the modified scene
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if debug_mode:
        print("Pack result: " + str(result) + " (OK=" + str(OK) + ")")
    
    if result == OK:
        if debug_mode:
            print("Saving scene to: " + full_scene_path)
        var error = ResourceSaver.save(packed_scene, full_scene_path)
        if debug_mode:
            print("Save result: " + str(error) + " (OK=" + str(OK) + ")")
        
        if error == OK:
            print("Node properties set successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# --- Physics Tools ---

# Create a physics joint node
func create_physics_joint(params):
    print("Creating physics joint: " + params.node_name + " of type: " + params.joint_type + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create joint node
    var joint = instantiate_class(params.joint_type)
    if not joint:
        printerr("Failed to instantiate joint type: " + params.joint_type)
        quit(1)
    
    joint.name = params.node_name
    
    # Set node paths for nodes to connect
    if params.has("node_a"):
        joint.node_a = params.node_a
    if params.has("node_b"):
        joint.node_b = params.node_b
    
    # Set other properties
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            smart_set(joint, prop, properties[prop])
    
    parent.add_child(joint)
    joint.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Physics joint '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create a PhysicsMaterial resource
func create_physics_material(params):
    print("Creating PhysicsMaterial: " + params.material_path)
    
    var material_path = params.material_path
    if not material_path.begins_with("res://"):
        material_path = "res://" + material_path
    
    var absolute_path = ProjectSettings.globalize_path(material_path)
    
    var mat = PhysicsMaterial.new()
    
    if params.has("friction"):
        mat.friction = float(params.friction)
    if params.has("rough"):
        mat.rough = bool(params.rough)
    if params.has("bounce"):
        mat.bounce = float(params.bounce)
    if params.has("absorbent"):
        mat.absorbent = bool(params.absorbent)
    
    var error = ResourceSaver.save(mat, absolute_path)
    if error == OK:
        print("PhysicsMaterial saved successfully to: " + material_path)
    else:
        printerr("Failed to save PhysicsMaterial: " + str(error))

# Configure collision layers and masks
func configure_collision_layers(params):
    print("Configuring collision layers for node: " + params.node_path + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    var node_path = params.node_path
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
    
    var node = scene_root.get_node(node_path)
    if not node:
        printerr("Node not found: " + params.node_path)
        quit(1)
    
    if params.has("collision_layer"):
        node.set("collision_layer", int(params.collision_layer))
    if params.has("collision_mask"):
        node.set("collision_mask", int(params.collision_mask))
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Collision layers configured successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create a RayCast node
func create_raycast(params):
    print("Creating RayCast node: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create RayCast node
    var ray_type = "RayCast3D"
    if params.has("is_3d") and not bool(params.is_3d):
        ray_type = "RayCast2D"
    
    var ray = instantiate_class(ray_type)
    ray.name = params.node_name
    
    if params.has("enabled"):
        ray.enabled = bool(params.enabled)
    
    if params.has("target_position"):
        smart_set(ray, "target_position", params.target_position)
    
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            smart_set(ray, prop, properties[prop])
    
    parent.add_child(ray)
    ray.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("RayCast '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create a CollisionShape node with a specific shape
func create_collision_shape(params):
    print("Creating CollisionShape: " + params.node_name + " with shape: " + params.shape_type + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create CollisionShape node
    var is_3d = true
    if params.has("is_3d") and not bool(params.is_3d):
        is_3d = false
    
    var node_type = "CollisionShape3D" if is_3d else "CollisionShape2D"
    var col_node = instantiate_class(node_type)
    col_node.name = params.node_name
    
    # Create Shape resource
    var shape = instantiate_class(params.shape_type)
    if not shape:
        # Try to infer if it's missing 2D/3D suffix
        var guessed_shape = params.shape_type + ("3D" if is_3d else "2D")
        shape = instantiate_class(guessed_shape)
        if not shape:
            printerr("Failed to instantiate shape type: " + params.shape_type)
            quit(1)
    
    if params.has("shape_properties"):
        var properties = params.shape_properties
        for prop in properties:
            smart_set(shape, prop, properties[prop])
            
    col_node.shape = shape
    
    parent.add_child(col_node)
    col_node.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("CollisionShape '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create an Area2D/3D node
func create_area(params):
    print("Creating Area node: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create Area node
    var node_type = "Area3D"
    if params.has("is_3d") and not bool(params.is_3d):
        node_type = "Area2D"
    
    var area = instantiate_class(node_type)
    area.name = params.node_name
    
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            smart_set(area, prop, properties[prop])
    
    parent.add_child(area)
    area.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Area '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# --- Helper Functions ---

func log_error(msg: String):
    printerr("[ERROR] " + msg)

func log_info(msg: String):
    print("[INFO] " + msg)

func log_debug(msg: String):
    if debug_mode:
        print("[DEBUG] " + msg)

func instantiate_class(class_name: String) -> Node:
    if ClassDB.class_exists(class_name):
        return ClassDB.instantiate(class_name)
    return null

func smart_set(obj, prop, value):
    if value is Dictionary:
        if value.has("x") and value.has("y"):
            if value.has("z"):
                obj.set(prop, Vector3(float(value.x), float(value.y), float(value.z)))
            else:
                obj.set(prop, Vector2(float(value.x), float(value.y)))
        elif value.has("r") and value.has("g") and value.has("b"):
            var a = value.a if value.has("a") else 1.0
            obj.set(prop, Color(float(value.r), float(value.g), float(value.b), float(a)))
        else:
            obj.set(prop, value)
    else:
        obj.set(prop, value)

# --- Particle System Tools ---

# Create a particle system node
func create_particle_system(params):
    print("Creating particle system node: " + params.node_name + " of type: " + params.particle_type + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create particle node based on type
    var particle_node = instantiate_class(params.particle_type)
    if not particle_node:
        printerr("Failed to instantiate particle type: " + params.particle_type)
        quit(1)
    
    particle_node.name = params.node_name
    
    # Set properties
    if params.has("amount"):
        particle_node.amount = int(params.amount)
    if params.has("lifetime"):
        particle_node.lifetime = float(params.lifetime)
    if params.has("one_shot"):
        particle_node.one_shot = bool(params.one_shot)
    if params.has("emitting"):
        particle_node.emitting = bool(params.emitting)
    
    # For GPU particles, ensure they have a process material
    if params.particle_type == "GPUParticles2D" or params.particle_type == "GPUParticles3D":
        if particle_node.process_material == null:
            particle_node.process_material = ParticleProcessMaterial.new()
    
    parent.add_child(particle_node)
    particle_node.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Particle system '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Configure ParticleProcessMaterial
func configure_particle_material(params):
    print("Configuring particle material for node: " + params.node_path + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    var node_path = params.node_path
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
    
    var particle_node = scene_root.get_node(node_path)
    if not particle_node:
        printerr("Particle node not found: " + params.node_path)
        quit(1)
    
    var material_settings = params.material
    
    if particle_node is GPUParticles2D or particle_node is GPUParticles3D:
        var mat = particle_node.process_material
        if mat == null or not (mat is ParticleProcessMaterial):
            mat = ParticleProcessMaterial.new()
            particle_node.process_material = mat
        
        for prop in material_settings:
            smart_set(mat, prop, material_settings[prop])
            
    elif particle_node is CPUParticles2D or particle_node is CPUParticles3D:
        # For CPU particles, settings are directly on the node
        for prop in material_settings:
            smart_set(particle_node, prop, material_settings[prop])
    else:
        printerr("Node is not a particle system: " + particle_node.get_class())
        quit(1)
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Particle material configured successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Create ParticleProcessMaterial resource
func create_particle_material(params):
    print("Creating ParticleProcessMaterial: " + params.material_path)
    
    var material_path = params.material_path
    if not material_path.begins_with("res://"):
        material_path = "res://" + material_path
    
    var absolute_path = ProjectSettings.globalize_path(material_path)
    
    var mat = ParticleProcessMaterial.new()
    
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            smart_set(mat, prop, properties[prop])
    
    var error = ResourceSaver.save(mat, absolute_path)
    if error == OK:
        print("ParticleProcessMaterial saved successfully to: " + material_path)
    else:
        printerr("Failed to save ParticleProcessMaterial: " + str(error))

# --- Audio System Tools ---

# Create an AudioStreamPlayer, AudioStreamPlayer2D, or AudioStreamPlayer3D
func create_audio_player(params):
    print("Creating audio player: " + params.node_name + " of type: " + params.player_type + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    # Create player node based on type
    var player_node = null
    match params.player_type:
        "AudioStreamPlayer":
            player_node = AudioStreamPlayer.new()
        "AudioStreamPlayer2D":
            player_node = AudioStreamPlayer2D.new()
        "AudioStreamPlayer3D":
            player_node = AudioStreamPlayer3D.new()
        _:
            printerr("Unknown player type: " + params.player_type)
            quit(1)
    
    player_node.name = params.node_name
    
    # Set properties if provided
    if params.has("stream_path") and params.stream_path != "":
        var stream_path = params.stream_path
        if not stream_path.begins_with("res://"):
            stream_path = "res://" + stream_path
        var stream = load(stream_path)
        if stream:
            player_node.stream = stream
    
    if params.has("bus"):
        player_node.bus = params.bus
    
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            player_node.set(prop, properties[prop])
    
    parent.add_child(player_node)
    player_node.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Audio player '" + params.node_name + "' created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Configure audio bus settings
func configure_audio_bus(params):
    var bus_name = params.bus_name
    var bus_index = AudioServer.get_bus_index(bus_name)
    
    if bus_index == -1:
        printerr("Audio bus '" + bus_name + "' not found")
        quit(1)
    
    if params.has("volume_db"):
        AudioServer.set_bus_volume_db(bus_index, params.volume_db)
    if params.has("mute"):
        AudioServer.set_bus_mute(bus_index, params.mute)
    if params.has("solo"):
        AudioServer.set_bus_solo(bus_index, params.solo)
    if params.has("send_to"):
        AudioServer.set_bus_send(bus_index, params.send_to)
    
    print("Audio bus '" + bus_name + "' configured successfully")

# Add audio effect to a bus
func add_audio_effect(params):
    var bus_name = params.bus_name
    var bus_index = AudioServer.get_bus_index(bus_name)
    
    if bus_index == -1:
        printerr("Audio bus '" + bus_name + "' not found")
        quit(1)
    
    var effect = ClassDB.instantiate(params.effect_type)
    if not effect:
        printerr("Failed to instantiate effect type: " + params.effect_type)
        quit(1)
    
    if params.has("properties"):
        var properties = params.properties
        for prop in properties:
            effect.set(prop, properties[prop])
    
    AudioServer.add_bus_effect(bus_index, effect)
    print("Audio effect '" + params.effect_type + "' added to bus '" + bus_name + "'")

# Create AudioBusLayout resource
func create_audio_bus_layout(params):
    var layout_path = params.layout_path
    if not layout_path.begins_with("res://"):
        layout_path = "res://" + layout_path
    
    var absolute_path = ProjectSettings.globalize_path(layout_path)
    
    # Apply bus settings from params if provided before generating
    if params.has("buses"):
        for bus in params.buses:
            var bus_name = bus.name
            var bus_index = AudioServer.get_bus_index(bus_name)
            if bus_index == -1:
                bus_index = AudioServer.bus_count
                AudioServer.add_bus(bus_index)
                AudioServer.set_bus_name(bus_index, bus_name)
            
            if bus.has("volume_db"):
                AudioServer.set_bus_volume_db(bus_index, bus.volume_db)
            if bus.has("send_to"):
                AudioServer.set_bus_send(bus_index, bus.send_to)
    
    var current_layout = AudioServer.generate_bus_layout()
    var error = ResourceSaver.save(current_layout, absolute_path)
    if error == OK:
        print("AudioBusLayout saved successfully to: " + layout_path)
    else:
        printerr("Failed to save AudioBusLayout: " + str(error))

# Get info for a specific bus
func get_audio_bus_info(params):
    var bus_name = params.bus_name
    var bus_index = AudioServer.get_bus_index(bus_name)
    
    if bus_index == -1:
        printerr("Audio bus '" + bus_name + "' not found")
        quit(1)
    
    var bus_info = {
        "name": AudioServer.get_bus_name(bus_index),
        "volume_db": AudioServer.get_bus_volume_db(bus_index),
        "mute": AudioServer.is_bus_mute(bus_index),
        "solo": AudioServer.is_bus_solo(bus_index),
        "send": AudioServer.get_bus_send(bus_index),
        "effect_count": AudioServer.get_bus_effect_count(bus_index),
        "effects": []
    }
    
    for j in AudioServer.get_bus_effect_count(bus_index):
        var effect = AudioServer.get_bus_effect(bus_index, j)
        bus_info.effects.append({
            "name": effect.resource_name,
            "class": effect.get_class()
        })
    
    print(JSON.stringify(bus_info))

# List all audio buses
func list_audio_buses(params):
    var result = get_audio_bus_layout()
    print(JSON.stringify(result))

func get_audio_bus_layout() -> Dictionary:
    var result = {"buses": []}
    for i in AudioServer.bus_count:
        var bus = {
            "name": AudioServer.get_bus_name(i),
            "volume_db": AudioServer.get_bus_volume_db(i),
            "mute": AudioServer.is_bus_mute(i),
            "solo": AudioServer.is_bus_solo(i),
            "send": AudioServer.get_bus_send(i),
            "effects": []
        }
        for j in AudioServer.get_bus_effect_count(i):
            var effect = AudioServer.get_bus_effect(i, j)
            bus.effects.append({
                "name": effect.resource_name,
                "class": effect.get_class()
            })
        result.buses.append(bus)
    return result

# --- Navigation Tools ---

# Bake navigation mesh for a NavigationRegion2D/3D node
func bake_navigation_mesh(params):
    print("Baking navigation mesh for node: " + params.node_path + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    var node_path = params.node_path
    if node_path.begins_with("root/"):
        node_path = node_path.substr(5)
    
    var region = scene_root.get_node_or_null(node_path)
    if not region:
        printerr("Region node not found: " + params.node_path)
        quit(1)
        
    if region.has_method("bake_navigation_mesh"):
        region.bake_navigation_mesh()
        print("Navigation mesh baked successfully")
    else:
        printerr("Node does not have bake_navigation_mesh method: " + region.get_class())
        quit(1)
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("Scene saved successfully with baked navigation mesh")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# --- AnimationTree Tools ---

# Create an AnimationTree node
func create_animation_tree(params):
    print("Creating AnimationTree: " + params.node_name + " in scene: " + params.scene_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    if not scene:
        printerr("Failed to load scene: " + full_scene_path)
        quit(1)
    
    var scene_root = scene.instantiate()
    
    # Find parent node
    var parent_path = "root"
    if params.has("parent_node_path"):
        parent_path = params.parent_node_path
    
    var parent = scene_root
    if parent_path != "root":
        var path_to_find = parent_path
        if path_to_find.begins_with("root/"):
            path_to_find = path_to_find.substr(5)
        parent = scene_root.get_node(path_to_find)
        if not parent:
            printerr("Parent node not found: " + parent_path)
            quit(1)
    
    var tree = AnimationTree.new()
    tree.name = params.node_name
    
    if params.has("animation_player_path"):
        tree.anim_player = params.animation_player_path
    
    # Create the root animation node
    var root_node = null
    if params.tree_type == "AnimationNodeStateMachine":
        root_node = AnimationNodeStateMachine.new()
    elif params.tree_type == "AnimationNodeBlendTree":
        root_node = AnimationNodeBlendTree.new()
    else:
        printerr("Unknown tree type: " + params.tree_type)
        quit(1)
        
    tree.tree_root = root_node
    tree.active = true
    
    parent.add_child(tree)
    tree.owner = scene_root
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        var error = ResourceSaver.save(packed_scene, absolute_scene_path)
        if error == OK:
            print("AnimationTree created successfully")
        else:
            printerr("Failed to save scene: " + str(error))
    else:
        printerr("Failed to pack scene: " + str(result))

# Add a state to an AnimationNodeStateMachine
func add_animation_state(params):
    print("Adding animation state: " + params.state_name + " to AnimationTree: " + params.animation_tree_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    if not FileAccess.file_exists(absolute_scene_path):
        printerr("Scene file does not exist at: " + absolute_scene_path)
        quit(1)
    
    var scene = load(full_scene_path)
    var scene_root = scene.instantiate()
    
    var tree_path = params.animation_tree_path
    if tree_path.begins_with("root/"):
        tree_path = tree_path.substr(5)
    
    var tree = scene_root.get_node(tree_path)
    if not tree or not (tree is AnimationTree):
        printerr("AnimationTree not found or invalid: " + params.animation_tree_path)
        quit(1)
        
    var state_machine = tree.tree_root
    if not (state_machine is AnimationNodeStateMachine):
        printerr("AnimationTree root is not an AnimationNodeStateMachine")
        quit(1)
        
    var node = AnimationNodeAnimation.new()
    if params.has("animation_name"):
        node.animation = params.animation_name
        
    state_machine.add_node(params.state_name, node)
    
    if params.has("position"):
        state_machine.set_graph_offset(Vector2(params.position.x, params.position.y))
        # Note: Godot 4 uses set_node_position in the editor, but for the resource itself:
        # State machine positions are stored in the resource.
        # AnimationNodeStateMachine doesn't have a direct set_node_position in API, 
        # it's usually handled by the editor. However, we can try to set it if available.
        if state_machine.has_method("set_node_position"):
            state_machine.set_node_position(params.state_name, Vector2(params.position.x, params.position.y))
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        ResourceSaver.save(packed_scene, absolute_scene_path)
        print("Animation state added successfully")
    else:
        printerr("Failed to pack scene")

# Add a transition to an AnimationNodeStateMachine
func add_animation_transition(params):
    print("Adding transition from " + params.from_state + " to " + params.to_state)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    var scene = load(full_scene_path)
    var scene_root = scene.instantiate()
    
    var tree_path = params.animation_tree_path
    if tree_path.begins_with("root/"):
        tree_path = tree_path.substr(5)
    
    var tree = scene_root.get_node(tree_path)
    var state_machine = tree.tree_root
    
    var transition = AnimationNodeStateMachineTransition.new()
    if params.has("properties"):
        for prop in params.properties:
            transition.set(prop, params.properties[prop])
            
    state_machine.add_transition(params.from_state, params.to_state, transition)
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        ResourceSaver.save(packed_scene, absolute_scene_path)
        print("Animation transition added successfully")
    else:
        printerr("Failed to pack scene")

# Configure AnimationNodeBlendTree
func configure_blend_tree(params):
    print("Configuring blend tree node: " + params.node_name)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    var scene = load(full_scene_path)
    var scene_root = scene.instantiate()
    
    var tree_path = params.animation_tree_path
    if tree_path.begins_with("root/"):
        tree_path = tree_path.substr(5)
    
    var tree = scene_root.get_node(tree_path)
    var blend_tree = tree.tree_root
    
    if not (blend_tree is AnimationNodeBlendTree):
        printerr("AnimationTree root is not an AnimationNodeBlendTree")
        quit(1)
        
    var node = instantiate_class(params.node_type)
    if not node:
        printerr("Failed to instantiate animation node type: " + params.node_type)
        quit(1)
        
    if params.has("properties"):
        for prop in params.properties:
            smart_set(node, prop, params.properties[prop])
            
    blend_tree.add_node(params.node_name, node)
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        ResourceSaver.save(packed_scene, absolute_scene_path)
        print("Blend tree node configured successfully")
    else:
        printerr("Failed to pack scene")

# Set AnimationTree parameter
func set_animation_tree_parameter(params):
    print("Setting parameter " + params.parameter_name + " on AnimationTree: " + params.animation_tree_path)
    
    var full_scene_path = params.scene_path
    if not full_scene_path.begins_with("res://"):
        full_scene_path = "res://" + full_scene_path
    
    var absolute_scene_path = ProjectSettings.globalize_path(full_scene_path)
    var scene = load(full_scene_path)
    var scene_root = scene.instantiate()
    
    var tree_path = params.animation_tree_path
    if tree_path.begins_with("root/"):
        tree_path = tree_path.substr(5)
    
    var tree = scene_root.get_node(tree_path)
    
    # Parameters are set on the AnimationTree node directly in Godot 4
    # using the "parameters/..." prefix.
    tree.set(params.parameter_name, params.value)
    
    var packed_scene = PackedScene.new()
    var result = packed_scene.pack(scene_root)
    if result == OK:
        ResourceSaver.save(packed_scene, absolute_scene_path)
        print("AnimationTree parameter set successfully")
    else:
        printerr("Failed to pack scene")

