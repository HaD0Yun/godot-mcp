@tool
extends Node
class_name MCPResourceTools

var _editor_plugin: EditorPlugin = null

func set_editor_plugin(plugin: EditorPlugin) -> void:
	_editor_plugin = plugin


func _ensure_res_path(path: String) -> String:
	if path.begins_with("res://"):
		return path
	if path.begins_with("/"):
		var project_abs := ProjectSettings.globalize_path("res://")
		if path.begins_with(project_abs):
			var rel := path.substr(project_abs.length())
			return "res://" + rel
	return "res://" + path


func _refresh_filesystem() -> void:
	if _editor_plugin:
		EditorInterface.get_resource_filesystem().scan()


func _parse_value(value):
	if typeof(value) == TYPE_DICTIONARY:
		if value.has("type") or value.has("_type"):
			var t = value.get("type", value.get("_type", ""))
			match t:
				"Vector2":
					return Vector2(value.get("x", 0), value.get("y", 0))
				"Vector3":
					return Vector3(value.get("x", 0), value.get("y", 0), value.get("z", 0))
				"Color":
					return Color(value.get("r", 1), value.get("g", 1), value.get("b", 1), value.get("a", 1))
				"Vector2i":
					return Vector2i(value.get("x", 0), value.get("y", 0))
				"Vector3i":
					return Vector3i(value.get("x", 0), value.get("y", 0), value.get("z", 0))
				"Rect2":
					return Rect2(value.get("x", 0), value.get("y", 0), value.get("width", 0), value.get("height", 0))
				"NodePath":
					return NodePath(value.get("path", ""))
	if typeof(value) == TYPE_ARRAY:
		var result := []
		for item in value:
			result.append(_parse_value(item))
		return result
	return value


func _set_resource_properties(resource: Resource, properties) -> void:
	var props = properties
	if typeof(properties) == TYPE_STRING:
		var json := JSON.new()
		if json.parse(properties) == OK:
			props = json.data
		else:
			return
	if typeof(props) != TYPE_DICTIONARY:
		return
	for key in props:
		var val = _parse_value(props[key])
		resource.set(key, val)


func _parse_properties_dict(raw) -> Dictionary:
	if typeof(raw) == TYPE_DICTIONARY:
		return raw
	if typeof(raw) == TYPE_STRING and raw != "":
		var json := JSON.new()
		if json.parse(raw) == OK and typeof(json.data) == TYPE_DICTIONARY:
			return json.data
	return {}


func _load_theme(theme_path: String) -> Theme:
	var loaded = load(theme_path)
	if loaded is Theme:
		return loaded
	return Theme.new()


func _save_scene_root(root: Node, scene_path: String) -> int:
	var packed := PackedScene.new()
	var pack_result := packed.pack(root)
	if pack_result != OK:
		return pack_result
	return ResourceSaver.save(packed, scene_path)


func create_resource(args: Dictionary) -> Dictionary:
	var res_path := _ensure_res_path(str(args.get("resourcePath", "")))
	var resource_type := str(args.get("resourceType", "Resource"))
	if res_path == "res://":
		return {"ok": false, "error": "resourcePath is required"}

	var resource = ClassDB.instantiate(resource_type)
	if resource == null or not (resource is Resource):
		return {"ok": false, "error": "Failed to instantiate resource type", "resourceType": resource_type}

	var script_path := str(args.get("script", ""))
	if script_path != "":
		var script_obj = load(_ensure_res_path(script_path))
		if script_obj:
			resource.set_script(script_obj)

	if args.has("properties"):
		_set_resource_properties(resource, args.get("properties"))

	var save_result := ResourceSaver.save(resource, res_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save resource", "code": save_result}

	_refresh_filesystem()
	return {
		"ok": true,
		"resourcePath": res_path,
		"resourceType": args.get("resourceType")
	}


func modify_resource(args: Dictionary) -> Dictionary:
	var res_path := _ensure_res_path(str(args.get("resourcePath", "")))
	if res_path == "res://":
		return {"ok": false, "error": "resourcePath is required"}

	var resource = load(res_path)
	if resource == null or not (resource is Resource):
		return {"ok": false, "error": "Resource not found", "resourcePath": res_path}

	_set_resource_properties(resource, args.get("properties", ""))
	var save_result := ResourceSaver.save(resource, res_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save resource", "code": save_result}

	_refresh_filesystem()
	return {"ok": true, "resourcePath": res_path}


func create_material(args: Dictionary) -> Dictionary:
	var mat_path := _ensure_res_path(str(args.get("materialPath", "")))
	var material_type := str(args.get("materialType", "StandardMaterial3D"))
	if mat_path == "res://":
		return {"ok": false, "error": "materialPath is required"}

	var material = ClassDB.instantiate(material_type)
	if material == null or not (material is Material):
		return {"ok": false, "error": "Failed to instantiate material type", "materialType": material_type}

	if material is ShaderMaterial:
		var shader_path := str(args.get("shader", ""))
		if shader_path != "":
			var shader_res = load(_ensure_res_path(shader_path))
			if shader_res is Shader:
				(material as ShaderMaterial).shader = shader_res

	if args.has("properties"):
		_set_resource_properties(material, args.get("properties"))

	var save_result := ResourceSaver.save(material, mat_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save material", "code": save_result}

	_refresh_filesystem()
	return {
		"ok": true,
		"materialPath": mat_path,
		"materialType": material_type
	}


func create_shader(args: Dictionary) -> Dictionary:
	var shader_path := _ensure_res_path(str(args.get("shaderPath", "")))
	var shader_type := str(args.get("shaderType", "canvas_item"))
	if shader_path == "res://":
		return {"ok": false, "error": "shaderPath is required"}

	var code := str(args.get("code", ""))
	var template := str(args.get("template", ""))

	if code == "":
		if template != "":
			match template:
				"basic":
					code = "shader_type %s;\n\nvoid fragment() {\n\tCOLOR = vec4(1.0);\n}\n" % shader_type
				"color_shift":
					code = "shader_type %s;\n\nuniform vec4 color_shift : source_color = vec4(0.1, 0.0, 0.2, 0.0);\n\nvoid fragment() {\n\tvec4 base = texture(TEXTURE, UV);\n\tCOLOR = vec4(clamp(base.rgb + color_shift.rgb, 0.0, 1.0), base.a);\n}\n" % shader_type
				"outline":
					code = "shader_type %s;\n\nuniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);\nuniform float outline_width : hint_range(0.0, 8.0) = 1.0;\n\nvoid fragment() {\n\tvec2 px = TEXTURE_PIXEL_SIZE * outline_width;\n\tfloat a = texture(TEXTURE, UV).a;\n\tfloat edge = max(max(texture(TEXTURE, UV + vec2(px.x, 0.0)).a, texture(TEXTURE, UV - vec2(px.x, 0.0)).a), max(texture(TEXTURE, UV + vec2(0.0, px.y)).a, texture(TEXTURE, UV - vec2(0.0, px.y)).a));\n\tvec4 base = texture(TEXTURE, UV);\n\tCOLOR = mix(outline_color * edge, base, a);\n}\n" % shader_type
				_:
					code = "shader_type %s;\n\nvoid fragment() {\n}\n" % shader_type
		else:
			code = "shader_type %s;\n\nvoid fragment() {\n}\n" % shader_type

	var file := FileAccess.open(shader_path, FileAccess.WRITE)
	if file == null:
		return {"ok": false, "error": "Failed to open shader file for writing", "shaderPath": shader_path}
	file.store_string(code)
	file.close()

	_refresh_filesystem()
	return {"ok": true, "shaderPath": shader_path, "shaderType": shader_type}


func create_tileset(args: Dictionary) -> Dictionary:
	var tileset_path := _ensure_res_path(str(args.get("tilesetPath", "")))
	if tileset_path == "res://":
		return {"ok": false, "error": "tilesetPath is required"}

	var tileset := TileSet.new()
	var sources = args.get("sources", [])
	if typeof(sources) != TYPE_ARRAY:
		sources = []

	for source in sources:
		if typeof(source) != TYPE_DICTIONARY:
			continue
		var atlas := TileSetAtlasSource.new()
		var tex_path := _ensure_res_path(str(source.get("texture", "")))
		var tex = load(tex_path)
		if tex == null:
			continue
		atlas.texture = tex

		var tile_size: Dictionary = source.get("tileSize", {})
		atlas.texture_region_size = Vector2i(int(tile_size.get("x", 0)), int(tile_size.get("y", 0)))

		if source.has("separation"):
			var sep: Dictionary = source.get("separation", {})
			atlas.separation = Vector2i(int(sep.get("x", 0)), int(sep.get("y", 0)))

		if source.has("offset"):
			var off: Dictionary = source.get("offset", {})
			atlas.margins = Vector2i(int(off.get("x", 0)), int(off.get("y", 0)))

		tileset.add_source(atlas)

	var save_result := ResourceSaver.save(tileset, tileset_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save TileSet", "code": save_result}

	_refresh_filesystem()
	return {"ok": true, "tilesetPath": tileset_path}


func set_tilemap_cells(args: Dictionary) -> Dictionary:
	var scene_path := _ensure_res_path(str(args.get("scenePath", "")))
	var node_path := str(args.get("tilemapNodePath", ""))
	if scene_path == "res://":
		return {"ok": false, "error": "scenePath is required"}

	var scene_res = load(scene_path)
	if scene_res == null or not (scene_res is PackedScene):
		return {"ok": false, "error": "Scene not found", "scenePath": scene_path}

	var root := (scene_res as PackedScene).instantiate()
	if root == null:
		return {"ok": false, "error": "Failed to instantiate scene"}

	var tilemap: TileMap = null
	if node_path == "." or node_path == "":
		tilemap = root as TileMap
	else:
		tilemap = root.get_node_or_null(node_path) as TileMap

	if tilemap == null:
		root.queue_free()
		return {"ok": false, "error": "TileMap node not found", "tilemapNodePath": node_path}

	var layer := int(args.get("layer", 0))
	var cells = args.get("cells", [])
	if typeof(cells) != TYPE_ARRAY:
		cells = []

	for cell in cells:
		if typeof(cell) != TYPE_DICTIONARY:
			continue
		var coords: Dictionary = cell.get("coords", {})
		var atlas_coords: Dictionary = cell.get("atlasCoords", {})
		tilemap.set_cell(
			layer,
			Vector2i(int(coords.get("x", 0)), int(coords.get("y", 0))),
			int(cell.get("sourceId", -1)),
			Vector2i(int(atlas_coords.get("x", 0)), int(atlas_coords.get("y", 0))),
			int(cell.get("alternativeTile", 0))
		)

	var save_result := _save_scene_root(root, scene_path)
	root.queue_free()
	if save_result != OK:
		return {"ok": false, "error": "Failed to save scene", "code": save_result}

	_refresh_filesystem()
	return {"ok": true, "cellCount": cells.size()}


func set_theme_color(args: Dictionary) -> Dictionary:
	var theme_path := _ensure_res_path(str(args.get("themePath", "")))
	if theme_path == "res://":
		return {"ok": false, "error": "themePath is required"}

	var theme := _load_theme(theme_path)
	var c: Dictionary = args.get("color", {})
	var color := Color(float(c.get("r", 1.0)), float(c.get("g", 1.0)), float(c.get("b", 1.0)), float(c.get("a", 1.0)))
	theme.set_color(str(args.get("colorName", "")), str(args.get("controlType", "")), color)

	var save_result := ResourceSaver.save(theme, theme_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save theme", "code": save_result}

	_refresh_filesystem()
	return {"ok": true}


func set_theme_font_size(args: Dictionary) -> Dictionary:
	var theme_path := _ensure_res_path(str(args.get("themePath", "")))
	if theme_path == "res://":
		return {"ok": false, "error": "themePath is required"}

	var theme := _load_theme(theme_path)
	theme.set_font_size(str(args.get("fontSizeName", "")), str(args.get("controlType", "")), int(args.get("size", 0)))

	var save_result := ResourceSaver.save(theme, theme_path)
	if save_result != OK:
		return {"ok": false, "error": "Failed to save theme", "code": save_result}

	_refresh_filesystem()
	return {"ok": true}


func _get_theme_shader_code(theme: String, effect: String) -> String:
	var base_color := "vec3(0.8, 0.8, 0.8)"
	match theme:
		"medieval":
			base_color = "vec3(0.52, 0.42, 0.30)"
		"cyberpunk":
			base_color = "vec3(0.08, 0.12, 0.22)"
		"nature":
			base_color = "vec3(0.20, 0.44, 0.24)"
		"scifi":
			base_color = "vec3(0.35, 0.55, 0.72)"
		"horror":
			base_color = "vec3(0.12, 0.05, 0.08)"
		"cartoon":
			base_color = "vec3(0.95, 0.65, 0.20)"

	var effect_block := "ALBEDO = base_col;"
	match effect:
		"glow":
			effect_block = "ALBEDO = base_col; EMISSION = base_col * (0.5 + 0.5 * sin(TIME * 2.0));"
		"hologram":
			effect_block = "float scan = sin(UV.y * 120.0 + TIME * 6.0) * 0.5 + 0.5; ALBEDO = base_col * 0.5; EMISSION = base_col * (0.8 + scan); ALPHA = 0.65;"
		"wind_sway":
			effect_block = "ALBEDO = base_col + vec3(0.05 * sin(TIME + UV.x * 10.0));"
		"torch_fire":
			effect_block = "float flicker = 0.8 + 0.2 * sin(TIME * 17.0 + UV.y * 13.0); ALBEDO = base_col * flicker; EMISSION = vec3(1.0, 0.5, 0.1) * (flicker - 0.6);"
		"dissolve":
			effect_block = "float n = fract(sin(dot(UV * 123.4, vec2(12.9898, 78.233))) * 43758.5453); float cut = 0.45 + 0.25 * sin(TIME); ALBEDO = base_col; ALPHA = step(cut, n); EMISSION = vec3(1.0, 0.4, 0.1) * step(cut - 0.03, n) * (1.0 - step(cut + 0.03, n));"
		"outline":
			effect_block = "float e = abs(sin(UV.x * 80.0)) * abs(sin(UV.y * 80.0)); ALBEDO = mix(base_col, vec3(0.0), step(0.85, e));"
		_:
			effect_block = "ALBEDO = base_col;"

	return "shader_type spatial;\nrender_mode cull_back, depth_draw_opaque;\n\nvoid fragment() {\n\tvec3 base_col = %s;\n\t%s\n}\n" % [base_color, effect_block]


func apply_theme_shader(args: Dictionary) -> Dictionary:
	var scene_path := _ensure_res_path(str(args.get("scenePath", "")))
	var node_path := str(args.get("nodePath", ""))
	var theme := str(args.get("theme", "nature"))
	var effect := str(args.get("effect", "none"))
	if scene_path == "res://":
		return {"ok": false, "error": "scenePath is required"}

	var scene_res = load(scene_path)
	if scene_res == null or not (scene_res is PackedScene):
		return {"ok": false, "error": "Scene not found", "scenePath": scene_path}

	var root := (scene_res as PackedScene).instantiate()
	if root == null:
		return {"ok": false, "error": "Failed to instantiate scene"}

	var target: Node = null
	if node_path == "." or node_path == "":
		target = root
	else:
		target = root.get_node_or_null(node_path)

	if target == null:
		root.queue_free()
		return {"ok": false, "error": "Target node not found", "nodePath": node_path}

	var shader := Shader.new()
	shader.code = _get_theme_shader_code(theme, effect)
	var material := ShaderMaterial.new()
	material.shader = shader

	var params := _parse_properties_dict(args.get("shaderParams", ""))
	for key in params:
		material.set_shader_parameter(str(key), _parse_value(params[key]))

	if target is MeshInstance3D:
		(target as MeshInstance3D).material_override = material
	elif target is Sprite2D:
		(target as Sprite2D).material = material
	elif target is Sprite3D:
		(target as Sprite3D).material_override = material
	elif target is CanvasItem:
		(target as CanvasItem).material = material
	elif target is GeometryInstance3D:
		(target as GeometryInstance3D).material_override = material
	else:
		root.queue_free()
		return {"ok": false, "error": "Unsupported node type for material application", "nodePath": node_path}

	var save_result := _save_scene_root(root, scene_path)
	root.queue_free()
	if save_result != OK:
		return {"ok": false, "error": "Failed to save scene", "code": save_result}

	_refresh_filesystem()
	return {"ok": true, "theme": theme, "effect": effect}
