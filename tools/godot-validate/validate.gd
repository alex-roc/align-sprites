extends SceneTree
# Headless checker for align-sprites Godot exports.
# Usage: godot --headless --path tools/godot-validate --script res://validate.gd -- <res .tres> <res expected.json> [...]
# expected.json: {cell:{w,h}, texture:{w,h}, anims:[{name,frames,speed,loop}], scene:{path,node,offset:[x,y],texture_filter,animation}}
# "body": {path,node,shape_size:[w,h],shape_position:[x,y]} checks <name>_body.tscn (CharacterBody2D + sprite + CollisionShape2D).
# scene.centered tells whether the sprite is centred on the node (effects) or drawn from its top-left corner (feet).
# With "static": true the export is a Sprite2D scene (no SpriteFrames): only the scene and its texture are checked.

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

	if exp.get("static", false):
		validate_static(exp)
		validate_body(exp, Sprite2D)
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
		check(node.centered == bool(sc["centered"]), "centered should be %s" % sc["centered"])
		check(int(node.texture_filter) == int(sc["texture_filter"]), "texture_filter %d != %d" % [int(node.texture_filter), int(sc["texture_filter"])])
		check(node.sprite_frames != null, "sprite_frames not set")
		check(String(node.animation) == String(sc["animation"]), "animation %s != %s" % [node.animation, sc["animation"]])
		check(node.autoplay == String(sc["animation"]), "autoplay %s != %s" % [node.autoplay, sc["animation"]])
	node.free()
	validate_body(exp, AnimatedSprite2D)


func validate_static(exp: Dictionary) -> void:
	var sc: Dictionary = exp["scene"]
	var packed = load(sc["path"])
	if not (packed is PackedScene):
		fail("%s did not load as PackedScene" % sc["path"])
		return
	var node = packed.instantiate()
	check(node is Sprite2D, "scene root is %s, not Sprite2D" % node.get_class())
	if node is Sprite2D:
		check(String(node.name) == String(sc["node"]), "node name %s != %s" % [node.name, sc["node"]])
		var want_off := Vector2(float(sc["offset"][0]), float(sc["offset"][1]))
		check(node.offset == want_off, "offset %s != %s" % [node.offset, want_off])
		check(node.centered == bool(sc["centered"]), "centered should be %s" % sc["centered"])
		check(int(node.texture_filter) == int(sc["texture_filter"]), "texture_filter %d != %d" % [int(node.texture_filter), int(sc["texture_filter"])])
		check(node.texture != null, "texture not set")
		if node.texture != null:
			check(node.texture.get_width() == int(exp["texture"]["w"]) and node.texture.get_height() == int(exp["texture"]["h"]), "texture size %s != %sx%s" % [node.texture.get_size(), exp["texture"]["w"], exp["texture"]["h"]])
	node.free()


# <name>_body.tscn: CharacterBody2D root, the sprite (same placement as the plain scene) and a rectangle shape.
func validate_body(exp: Dictionary, sprite_class) -> void:
	if not exp.has("body"):
		return
	var b: Dictionary = exp["body"]
	var sc: Dictionary = exp["scene"]
	var packed = load(b["path"])
	if not (packed is PackedScene):
		fail("%s did not load as PackedScene" % b["path"])
		return
	var node = packed.instantiate()
	check(node is CharacterBody2D, "%s root is %s, not CharacterBody2D" % [b["path"], node.get_class()])
	check(String(node.name) == String(b["node"]), "body node name %s != %s" % [node.name, b["node"]])
	var sprite = null
	var col = null
	for c in node.get_children():
		if is_instance_of(c, sprite_class):
			sprite = c
		elif c is CollisionShape2D:
			col = c
	check(sprite != null, "%s has no %s child" % [b["path"], sprite_class])
	check(col != null, "%s has no CollisionShape2D child" % b["path"])
	if sprite != null:
		check(sprite.centered == bool(sc["centered"]), "body sprite centered should be %s" % sc["centered"])
		var want_off := Vector2(float(sc["offset"][0]), float(sc["offset"][1]))
		check(sprite.offset == want_off, "body sprite offset %s != %s" % [sprite.offset, want_off])
		check(int(sprite.texture_filter) == int(sc["texture_filter"]), "body sprite texture_filter mismatch")
		if sprite is AnimatedSprite2D:
			check(sprite.sprite_frames != null, "body sprite_frames not set")
			check(String(sprite.animation) == String(sc["animation"]), "body animation %s != %s" % [sprite.animation, sc["animation"]])
		else:
			check(sprite.texture != null, "body texture not set")
	if col != null:
		check(col.shape is RectangleShape2D, "collision shape is %s, not RectangleShape2D" % col.shape)
		if col.shape is RectangleShape2D:
			var want_size := Vector2(float(b["shape_size"][0]), float(b["shape_size"][1]))
			check(col.shape.size.is_equal_approx(want_size), "shape size %s != %s" % [col.shape.size, want_size])
		var want_pos := Vector2(float(b["shape_position"][0]), float(b["shape_position"][1]))
		check(col.position.is_equal_approx(want_pos), "shape position %s != %s" % [col.position, want_pos])
	node.free()
