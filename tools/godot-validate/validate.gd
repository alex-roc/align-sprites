extends SceneTree
# Headless checker for align-sprites Godot exports.
# Usage: godot --headless --path tools/godot-validate --script res://validate.gd -- <res .tres> <res expected.json> [...]
# expected.json: {cell:{w,h}, texture:{w,h}, anims:[{name,frames,speed,loop}], scene:{path,node,offset:[x,y],texture_filter,animation}}

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
		fail("expected pairs of <res .tres> <res expected.json>")
	for i in range(0, args.size() - 1, 2):
		validate_pair(args[i], args[i + 1])
	if failures > 0:
		printerr("VALIDATE: %d failure(s)" % failures)
		quit(1)
		return
	print("VALIDATE OK")
	quit(0)


func validate_pair(tres_path: String, json_path: String) -> void:
	var f := FileAccess.open(json_path, FileAccess.READ)
	if f == null:
		fail("cannot read " + json_path)
		return
	var exp = JSON.parse_string(f.get_as_text())
	if typeof(exp) != TYPE_DICTIONARY:
		fail("bad JSON " + json_path)
		return

	var sf = load(tres_path)
	if not (sf is SpriteFrames):
		fail("%s did not load as SpriteFrames" % tres_path)
		return

	var names: Array = []
	for n in sf.get_animation_names():
		names.append(String(n))
	var want_names: Array = []
	for a in exp["anims"]:
		want_names.append(a["name"])
	names.sort()
	want_names.sort()
	check(names == want_names, "animation names %s != %s" % [names, want_names])

	var cw: int = int(exp["cell"]["w"])
	var ch: int = int(exp["cell"]["h"])
	var tw: int = int(exp["texture"]["w"])
	var th: int = int(exp["texture"]["h"])
	for a in exp["anims"]:
		var n := StringName(a["name"])
		if not sf.has_animation(n):
			continue
		check(sf.get_frame_count(n) == int(a["frames"]), "%s: frame count %d != %d" % [n, sf.get_frame_count(n), int(a["frames"])])
		check(is_equal_approx(sf.get_animation_speed(n), float(a["speed"])), "%s: speed %s != %s" % [n, sf.get_animation_speed(n), a["speed"]])
		check(sf.get_animation_loop(n) == bool(a["loop"]), "%s: loop mismatch" % n)
		for k in range(sf.get_frame_count(n)):
			var tex = sf.get_frame_texture(n, k)
			if not (tex is AtlasTexture):
				fail("%s[%d] is not an AtlasTexture" % [n, k])
				continue
			var r: Rect2 = tex.region
			check(r.size == Vector2(cw, ch), "%s[%d] region size %s != %dx%d" % [n, k, r.size, cw, ch])
			check(r.position.x >= 0 and r.position.y >= 0 and r.end.x <= tw and r.end.y <= th, "%s[%d] region %s outside %dx%d texture" % [n, k, r, tw, th])
			check(tex.atlas != null and tex.atlas.get_width() == tw and tex.atlas.get_height() == th, "%s[%d] atlas texture missing or wrong size" % [n, k])

	# Scene
	var sc: Dictionary = exp["scene"]
	var packed = load(sc["path"])
	if not (packed is PackedScene):
		fail("%s did not load as PackedScene" % sc["path"])
		return
	var node = packed.instantiate()
	check(node is AnimatedSprite2D, "scene root is %s, not AnimatedSprite2D" % node.get_class())
	if node is AnimatedSprite2D:
		check(String(node.name) == String(sc["node"]), "node name %s != %s" % [node.name, sc["node"]])
		var off: Vector2 = node.offset
		var want_off := Vector2(float(sc["offset"][0]), float(sc["offset"][1]))
		check(off == want_off, "offset %s != %s" % [off, want_off])
		check(node.centered == false, "centered should be false")
		check(int(node.texture_filter) == int(sc["texture_filter"]), "texture_filter %d != %d" % [int(node.texture_filter), int(sc["texture_filter"])])
		check(node.sprite_frames != null, "sprite_frames not set")
		check(String(node.animation) == String(sc["animation"]), "animation %s != %s" % [node.animation, sc["animation"]])
		check(node.autoplay == String(sc["animation"]), "autoplay %s != %s" % [node.autoplay, sc["animation"]])
	node.free()
