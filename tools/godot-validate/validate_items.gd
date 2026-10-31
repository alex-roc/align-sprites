extends SceneTree
# Headless checker for align-sprites items atlases (one AtlasTexture .tres per item).
# Usage: godot --headless --path tools/godot-validate --script res://validate_items.gd -- <res .tres> <res expected.json> [...]
# expected.json: {name, cell, atlas:{w,h}, region:{x,y,w,h}, opaque}  (opaque = number of non-transparent pixels in the cell)

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
	var tag: String = exp["name"]

	var tex = load(tres_path)
	if not (tex is AtlasTexture):
		fail("%s: did not load as AtlasTexture" % tag)
		return
	check(tex.atlas != null, "%s: no atlas texture" % tag)
	if tex.atlas == null:
		return
	check(tex.atlas.get_width() == int(exp["atlas"]["w"]) and tex.atlas.get_height() == int(exp["atlas"]["h"]), "%s: atlas size %s" % [tag, tex.atlas.get_size()])
	var r: Dictionary = exp["region"]
	var want := Rect2(r["x"], r["y"], r["w"], r["h"])
	check(tex.region == want, "%s: region %s != %s" % [tag, tex.region, want])
	var cell := int(exp["cell"])
	check(tex.get_width() == cell and tex.get_height() == cell, "%s: texture size %s != %d" % [tag, tex.get_size(), cell])
	var img: Image = tex.get_image()
	if img == null:
		fail("%s: no image" % tag)
		return
	check(img.get_width() == cell and img.get_height() == cell, "%s: image size %dx%d" % [tag, img.get_width(), img.get_height()])
	var opaque := 0
	for y in img.get_height():
		for x in img.get_width():
			if img.get_pixel(x, y).a > 0.0:
				opaque += 1
	check(opaque == int(exp["opaque"]), "%s: %d opaque px != %d (wrong region or texture)" % [tag, opaque, exp["opaque"]])
