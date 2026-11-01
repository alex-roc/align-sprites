extends SceneTree
# Headless checker for a whole game kit export: every given .tres/.tscn must load (relative ext_resource paths resolve
# inside the kit folder) and a scene must instantiate. Content is checked by the per-feature validators.
# Usage: godot --headless --path tools/godot-validate --script res://validate_kit.gd -- <res path> [...]

var failures := 0


func fail(msg: String) -> void:
	failures += 1
	printerr("VALIDATE FAIL: " + msg)


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() == 0:
		fail("expected at least one <res path>")
	for p in args:
		var res = ResourceLoader.load(p, "", ResourceLoader.CACHE_MODE_IGNORE)
		if res == null:
			fail("%s: did not load" % p)
		elif res is PackedScene:
			var node = res.instantiate()
			if node == null:
				fail("%s: did not instantiate" % p)
			else:
				node.free()
		elif res is Texture2D:
			if res.get_width() <= 0:
				fail("%s: empty texture" % p)
	if failures > 0:
		printerr("VALIDATE: %d failure(s)" % failures)
		quit(1)
		return
	print("VALIDATE OK (%d resources)" % args.size())
	quit(0)
