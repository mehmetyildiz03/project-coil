extends Node2D

const ARENA_RECT := Rect2(-1300.0, -800.0, 2600.0, 1600.0)
const FOOD_COUNT := 52
const FOOD_PICKUP_RADIUS := 24.0
const FOOD_GROWTH := 26.0
const INPUT_DEAD_ZONE := 24.0

@onready var snake = $Snake
@onready var camera = $Camera2D
@onready var hud_layer = $HUD

var rng := RandomNumberGenerator.new()
var foods := []
var score := 0
var eaten := 0
var run_time := 0.0
var active_pointer := false
var pointer_origin := Vector2.ZERO
var pointer_current := Vector2.ZERO
var death_reason := ""

var score_label: Label
var length_label: Label
var hint_label: Label
var death_panel: ColorRect
var death_title: Label
var death_subtitle: Label

func _ready():
	rng.seed = 473829
	snake.died.connect(_on_snake_died)
	_build_hud()
	reset_run()

func reset_run():
	score = 0
	eaten = 0
	run_time = 0.0
	death_reason = ""
	active_pointer = false
	snake.reset(Vector2.ZERO)
	camera.position = Vector2.ZERO
	camera.zoom = Vector2.ONE * 1.04
	foods.clear()
	for i in range(FOOD_COUNT):
		_spawn_food()
	death_panel.visible = false
	hint_label.visible = true
	_update_hud()
	queue_redraw()

func _process(delta):
	if snake.alive:
		run_time += delta
		snake.step(delta)
		_check_food_pickups()
		_check_arena_collision()
		_update_camera(delta)
		_update_hud()
	queue_redraw()

func _update_camera(delta: float):
	var target = snake.get_head_position()
	var follow_alpha = 1.0 - exp(-6.4 * delta)
	camera.position = camera.position.lerp(target, follow_alpha)

	var extra_length = max(0.0, snake.get_body_length() - 285.0)
	var target_zoom_scalar = clamp(1.04 - extra_length / 1900.0 * 0.24, 0.78, 1.04)
	var zoom_alpha = 1.0 - exp(-2.0 * delta)
	var target_zoom = Vector2.ONE * target_zoom_scalar
	camera.zoom = camera.zoom.lerp(target_zoom, zoom_alpha)

func _check_food_pickups():
	var head = snake.get_head_position()
	for i in range(foods.size() - 1, -1, -1):
		var food = foods[i]
		if head.distance_to(food["position"]) <= FOOD_PICKUP_RADIUS:
			foods.remove_at(i)
			snake.add_length(FOOD_GROWTH)
			eaten += 1
			score += 10 + int(eaten / 5) * 2
			_spawn_food()
			hint_label.visible = false

func _check_arena_collision():
	var p = snake.get_head_position()
	var margin = snake.get_head_radius()
	if p.x < ARENA_RECT.position.x + margin or p.x > ARENA_RECT.end.x - margin \
	or p.y < ARENA_RECT.position.y + margin or p.y > ARENA_RECT.end.y - margin:
		snake.kill("ARENA EDGE")

func _spawn_food():
	var pos := Vector2.ZERO
	for attempt in range(30):
		pos = Vector2(
			rng.randf_range(ARENA_RECT.position.x + 70.0, ARENA_RECT.end.x - 70.0),
			rng.randf_range(ARENA_RECT.position.y + 70.0, ARENA_RECT.end.y - 70.0)
		)
		if pos.distance_to(snake.get_head_position()) > 170.0:
			break
	var rare = rng.randf() < 0.08
	foods.append({
		"position": pos,
		"rare": rare,
		"phase": rng.randf_range(0.0, TAU)
	})

func _unhandled_input(event):
	if event is InputEventScreenTouch:
		if event.pressed:
			if not snake.alive:
				reset_run()
				return
			active_pointer = true
			pointer_origin = event.position
			pointer_current = event.position
		else:
			active_pointer = false
			snake.clear_steer()
		queue_redraw()
		return

	if event is InputEventScreenDrag and active_pointer and snake.alive:
		pointer_current = event.position
		_apply_pointer_steering()
		queue_redraw()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			if not snake.alive:
				reset_run()
				return
			active_pointer = true
			pointer_origin = event.position
			pointer_current = event.position
		else:
			active_pointer = false
			snake.clear_steer()
		queue_redraw()
		return

	if event is InputEventMouseMotion and active_pointer and snake.alive:
		pointer_current = event.position
		_apply_pointer_steering()
		queue_redraw()

	if event.is_action_pressed("restart"):
		reset_run()

func _apply_pointer_steering():
	var delta = pointer_current - pointer_origin
	if delta.length() >= INPUT_DEAD_ZONE:
		snake.set_steer_direction(delta.normalized())
	else:
		snake.clear_steer()

func _on_snake_died(reason):
	death_reason = reason
	active_pointer = false
	snake.clear_steer()
	death_title.text = reason
	death_subtitle.text = "Score %d   •   Length %d\nTap anywhere or press R to restart" % [score, int(snake.get_body_length())]
	death_panel.visible = true

func _build_hud():
	score_label = Label.new()
	score_label.position = Vector2(30, 22)
	score_label.add_theme_font_size_override("font_size", 24)
	score_label.modulate = Color(0.88, 0.98, 0.95, 0.96)
	hud_layer.add_child(score_label)

	length_label = Label.new()
	length_label.position = Vector2(30, 54)
	length_label.add_theme_font_size_override("font_size", 15)
	length_label.modulate = Color(0.55, 0.72, 0.69, 0.9)
	hud_layer.add_child(length_label)

	hint_label = Label.new()
	hint_label.text = "Touch + drag anywhere to steer"
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.anchor_left = 0.5
	hint_label.anchor_right = 0.5
	hint_label.offset_left = -180
	hint_label.offset_right = 180
	hint_label.offset_top = 28
	hint_label.offset_bottom = 60
	hint_label.add_theme_font_size_override("font_size", 16)
	hint_label.modulate = Color(0.65, 0.82, 0.78, 0.85)
	hud_layer.add_child(hint_label)

	death_panel = ColorRect.new()
	death_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	death_panel.color = Color(0.008, 0.014, 0.018, 0.80)
	death_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_layer.add_child(death_panel)

	death_title = Label.new()
	death_title.anchor_left = 0.5
	death_title.anchor_right = 0.5
	death_title.anchor_top = 0.5
	death_title.anchor_bottom = 0.5
	death_title.offset_left = -260
	death_title.offset_right = 260
	death_title.offset_top = -72
	death_title.offset_bottom = -18
	death_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	death_title.add_theme_font_size_override("font_size", 34)
	death_title.modulate = Color(0.90, 1.0, 0.97, 1.0)
	death_panel.add_child(death_title)

	death_subtitle = Label.new()
	death_subtitle.anchor_left = 0.5
	death_subtitle.anchor_right = 0.5
	death_subtitle.anchor_top = 0.5
	death_subtitle.anchor_bottom = 0.5
	death_subtitle.offset_left = -310
	death_subtitle.offset_right = 310
	death_subtitle.offset_top = -8
	death_subtitle.offset_bottom = 78
	death_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	death_subtitle.add_theme_font_size_override("font_size", 16)
	death_subtitle.modulate = Color(0.59, 0.76, 0.72, 0.96)
	death_panel.add_child(death_subtitle)

func _update_hud():
	score_label.text = "%06d" % score
	length_label.text = "LENGTH  %d    •    %0.1fs" % [int(snake.get_body_length()), run_time]

func _draw():
	# Arena background bands.
	draw_rect(ARENA_RECT, Color(0.022, 0.034, 0.041, 1.0), true)
	var grid_color = Color(0.10, 0.22, 0.22, 0.16)
	var spacing = 100
	var x = int(ARENA_RECT.position.x)
	while x <= int(ARENA_RECT.end.x):
		draw_line(Vector2(x, ARENA_RECT.position.y), Vector2(x, ARENA_RECT.end.y), grid_color, 1.0)
		x += spacing
	var y = int(ARENA_RECT.position.y)
	while y <= int(ARENA_RECT.end.y):
		draw_line(Vector2(ARENA_RECT.position.x, y), Vector2(ARENA_RECT.end.x, y), grid_color, 1.0)
		y += spacing

	# Strong readable boundary.
	draw_rect(ARENA_RECT, Color(0.17, 0.92, 0.70, 0.34), false, 5.0)

	var now = Time.get_ticks_msec() / 1000.0
	for food in foods:
		var p = food["position"]
		var pulse = 1.0 + 0.12 * sin(now * 3.0 + food["phase"])
		if food["rare"]:
			draw_circle(p, 15.0 * pulse, Color(0.72, 0.44, 1.0, 0.10))
			draw_circle(p, 8.0 * pulse, Color(0.77, 0.55, 1.0, 0.92))
			draw_circle(p, 2.6, Color(0.98, 0.92, 1.0, 1.0))
		else:
			draw_circle(p, 10.0 * pulse, Color(0.19, 0.95, 0.72, 0.08))
			draw_circle(p, 5.5 * pulse, Color(0.31, 0.98, 0.74, 0.84))

	# Invisible joystick visual appears only while actively steering.
	if active_pointer and snake.alive:
		var delta = pointer_current - pointer_origin
		var knob_delta = delta.limit_length(62.0)
		draw_circle(pointer_origin, 44.0, Color(0.60, 1.0, 0.88, 0.055), false, 2.0)
		draw_circle(pointer_origin + knob_delta, 14.0, Color(0.58, 1.0, 0.85, 0.18))
