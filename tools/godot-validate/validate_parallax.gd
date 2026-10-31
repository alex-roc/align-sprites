extends SceneTree
# Headless checker for align-sprites parallax scenes (Parallax2D, Godot >= 4.3).
# Usage: godot --headless --path tools/godot-validate --script res://validate_parallax.gd -- <res .tscn> <res expected.json> [...]
# expected.json: {root, layers:[{node, scroll_scale:[x,y], repeat_size:[x,y], texture:{w,h}, filter}]}
# The scene is instantiated, added to the tree and processed for a few frames (a Parallax2D with a Camera2D).

var failures := 0


func fail(msg: String) -> void:
	failures += 1
	printerr("VALIDATE FAIL: " + msg)


func check(cond: bool, msg: String) -> void:
	if not cond:
		fail(msg)


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() == 0 or args.size() % 2 != 0:
		fail("expected pairs of <res .tscn> <res expected.json>")
	for i in range(0, args.size() - 1, 2):
		await validate_pair(args[i], args[i + 1])
	if failures > 0:
		printerr("VALIDATE: %d failure(s)" % failures)
		quit(1)
		return
	print("VALIDATE OK")
	quit(0)


func validate_pair(scene_path: String, json_path: String) -> void:
	var f := FileAccess.open(json_path, FileAccess.READ)
	if f == null:
		fail("cannot read " + json_path)
		return
	var exp = JSON.parse_string(f.get_as_text())
	if typeof(exp) != TYPE_DICTIONARY:
		fail("bad JSON " + json_path)
		return
	var packed = load(scene_path)
	if not (packed is PackedScene):
		fail("%s did not load as PackedScene" % scene_path)
		return
	var scene: Node = packed.instantiate()
	check(scene is Node2D, "scene root is %s, not Node2D" % scene.get_class())
	check(scene.name == exp["root"], "root name %s, expected %s" % [scene.name, exp["root"]])
	var layers: Array = exp["layers"]
	check(scene.get_child_count() == layers.size(), "%d children, expected %d" % [scene.get_child_count(), layers.size()])

	# A camera and a few frames, so the Parallax2D nodes really run.
	var cam := Camera2D.new()
	root.add_child(scene)
	root.add_child(cam)
	for i in 3:
		cam.position.x += 40.0
		await process_frame

	for want in layers:
		var p: Node = scene.get_node_or_null(want["node"])
		if p == null:
			fail("missing node %s" % want["node"])
			continue
		check(p is Parallax2D, "%s is %s, not Parallax2D" % [want["node"], p.get_class()])
		if not (p is Parallax2D):
			continue
		var ss: Vector2 = p.scroll_scale
		check(is_equal_approx(ss.x, want["scroll_scale"][0]) and is_equal_approx(ss.y, want["scroll_scale"][1]),
			"%s scroll_scale %s, expected %s" % [want["node"], ss, want["scroll_scale"]])
		var rs: Vector2 = p.repeat_size
		check(is_equal_approx(rs.x, want["repeat_size"][0]) and is_equal_approx(rs.y, want["repeat_size"][1]),
			"%s repeat_size %s, expected %s" % [want["node"], rs, want["repeat_size"]])
		var spr: Node = p.get_node_or_null("Sprite2D")
		check(spr is Sprite2D, "%s has no Sprite2D child" % want["node"])
		if not (spr is Sprite2D):
			continue
		check(not spr.centered, "%s Sprite2D is centered" % want["node"])
		check(spr.texture != null, "%s Sprite2D has no texture" % want["node"])
		if spr.texture != null:
			check(spr.texture.get_width() == int(want["texture"]["w"]) and spr.texture.get_height() == int(want["texture"]["h"]),
				"%s texture is %dx%d, expected %dx%d" % [want["node"], spr.texture.get_width(), spr.texture.get_height(), want["texture"]["w"], want["texture"]["h"]])
			# The layer repeats exactly once per texture width.
			check(int(rs.x) == spr.texture.get_width(), "%s repeat_size.x %d differs from the texture width %d" % [want["node"], int(rs.x), spr.texture.get_width()])
		var filter: int = CanvasItem.TEXTURE_FILTER_NEAREST if want["filter"] == "nearest" else CanvasItem.TEXTURE_FILTER_PARENT_NODE
		check(spr.texture_filter == filter, "%s texture_filter %d, expected %s" % [want["node"], spr.texture_filter, want["filter"]])
	scene.queue_free()
	cam.queue_free()
