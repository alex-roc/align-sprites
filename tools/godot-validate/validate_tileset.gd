extends SceneTree
# Headless checker for align-sprites terrain TileSets (blob47 / dual16).
# Usage: godot --headless --path tools/godot-validate --script res://validate_tileset.gd -- <res .tres> <res expected.json> [...]
# expected.json: {name, tile_size, texture:{w,h}, mode, terrains, tiles:[{c,r,terrain_set,terrain,bits:{name:int}}],
#   paint?:[[x,y]], expected?:[[x,y,col,row]]}  (paint/expected = functional blob test through TileMapLayer)

const NEIGHBORS := {
	"right_side": TileSet.CELL_NEIGHBOR_RIGHT_SIDE,
	"bottom_right_corner": TileSet.CELL_NEIGHBOR_BOTTOM_RIGHT_CORNER,
	"bottom_side": TileSet.CELL_NEIGHBOR_BOTTOM_SIDE,
	"bottom_left_corner": TileSet.CELL_NEIGHBOR_BOTTOM_LEFT_CORNER,
	"left_side": TileSet.CELL_NEIGHBOR_LEFT_SIDE,
	"top_left_corner": TileSet.CELL_NEIGHBOR_TOP_LEFT_CORNER,
	"top_side": TileSet.CELL_NEIGHBOR_TOP_SIDE,
	"top_right_corner": TileSet.CELL_NEIGHBOR_TOP_RIGHT_CORNER,
}

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

	var ts = load(tres_path)
	if not (ts is TileSet):
		fail("%s: did not load as TileSet" % tag)
		return
	var T := int(exp["tile_size"])
	check(ts.tile_size == Vector2i(T, T), "%s: tile_size %s != %d" % [tag, ts.tile_size, T])
	check(ts.get_terrain_sets_count() == 1, "%s: terrain sets %d != 1" % [tag, ts.get_terrain_sets_count()])
	if ts.get_terrain_sets_count() < 1:
		return
	check(int(ts.get_terrain_set_mode(0)) == int(exp["mode"]), "%s: terrain mode %d != %d" % [tag, ts.get_terrain_set_mode(0), exp["mode"]])
	check(ts.get_terrains_count(0) == int(exp["terrains"]), "%s: terrains %d != %d" % [tag, ts.get_terrains_count(0), exp["terrains"]])

	var src = ts.get_source(0)
	if not (src is TileSetAtlasSource):
		fail("%s: source 0 is not a TileSetAtlasSource" % tag)
		return
	check(src.texture != null, "%s: no texture" % tag)
	if src.texture != null:
		check(src.texture.get_width() == int(exp["texture"]["w"]) and src.texture.get_height() == int(exp["texture"]["h"]), "%s: texture size %s" % [tag, src.texture.get_size()])
	check(src.texture_region_size == Vector2i(T, T), "%s: region size %s" % [tag, src.texture_region_size])
	check(src.get_tiles_count() == exp["tiles"].size(), "%s: tiles %d != %d" % [tag, src.get_tiles_count(), exp["tiles"].size()])

	var bad_bits := 0
	for t in exp["tiles"]:
		var coords := Vector2i(int(t["c"]), int(t["r"]))
		if not src.has_tile(coords):
			fail("%s: missing tile %s" % [tag, coords])
			continue
		var td: TileData = src.get_tile_data(coords, 0)
		if td.terrain_set != int(t["terrain_set"]) or td.terrain != int(t["terrain"]):
			fail("%s: tile %s terrain_set/terrain %d/%d != %d/%d" % [tag, coords, td.terrain_set, td.terrain, t["terrain_set"], t["terrain"]])
		if td.terrain_set < 0:
			continue
		for name in NEIGHBORS:
			var nb: int = NEIGHBORS[name]
			if not td.is_valid_terrain_peering_bit(nb):
				check(not t["bits"].has(name), "%s: tile %s bit %s not valid in this mode" % [tag, coords, name])
				continue
			var want := int(t["bits"][name]) if t["bits"].has(name) else -1
			if td.get_terrain_peering_bit(nb) != want:
				bad_bits += 1
				fail("%s: tile %s bit %s = %d != %d" % [tag, coords, name, td.get_terrain_peering_bit(nb), want])
	if bad_bits == 0:
		print("%s: %d tiles, terrain bits OK" % [tag, exp["tiles"].size()])

	if exp.has("paint"):
		functional(tag, ts, exp)


# Paint the cells with the terrain solver and check which atlas tile each one gets.
func functional(tag: String, ts: TileSet, exp: Dictionary) -> void:
	var layer := TileMapLayer.new()
	layer.tile_set = ts
	root.add_child(layer)
	var cells: Array[Vector2i] = []
	for p in exp["paint"]:
		cells.append(Vector2i(int(p[0]), int(p[1])))
	layer.set_cells_terrain_connect(cells, 0, 0)
	var wrong := 0
	for e in exp["expected"]:
		var pos := Vector2i(int(e[0]), int(e[1]))
		var want := Vector2i(int(e[2]), int(e[3]))
		var got := layer.get_cell_atlas_coords(pos)
		if got != want:
			wrong += 1
			printerr("  cell %s: solver chose %s, expected %s" % [pos, got, want])
	check(wrong == 0, "%s: terrain solver picked %d/%d unexpected tiles" % [tag, wrong, exp["expected"].size()])
	if wrong == 0:
		print("%s: terrain solver picked the expected tile for all %d cells" % [tag, exp["expected"].size()])
	# Cells outside the painted set must stay empty.
	var stray := 0
	for pos in layer.get_used_cells():
		if not cells.has(pos):
			stray += 1
	check(stray == 0, "%s: %d cells outside the painted set" % [tag, stray])
	layer.queue_free()
