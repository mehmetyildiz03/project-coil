extends Node2D

signal died(reason)

const BASE_SPEED := 235.0
const TURN_RATE := 4.8
const PATH_SAMPLE_SPACING := 4.0
const BODY_SAMPLE_SPACING := 11.0
const HEAD_RADIUS := 16.0
const BODY_RADIUS := 13.0
const SELF_COLLISION_SKIP_DISTANCE := 105.0
const INITIAL_LENGTH := 285.0

var alive := true
var heading := 0.0
var head_position := Vector2.ZERO
var body_length := INITIAL_LENGTH
var target_direction := Vector2.ZERO
var has_steer_target := false
var path_points := []
var sampled_body := []
var speed_multiplier := 1.0

func _ready():
	reset(Vector2.ZERO)

func reset(start_position: Vector2):
	alive = true
	heading = 0.0
	head_position = start_position
	body_length = INITIAL_LENGTH
	target_direction = Vector2.ZERO
	has_steer_target = false
	speed_multiplier = 1.0
	path_points.clear()
	for i in range(90):
		path_points.append(start_position - Vector2(i * PATH_SAMPLE_SPACING, 0.0))
	_rebuild_sampled_body()
	queue_redraw()

func set_steer_direction(direction: Vector2):
	if direction.length_squared() < 0.0001:
		return
	target_direction = direction.normalized()
	has_steer_target = true

func clear_steer():
	has_steer_target = false

func add_length(amount: float):
	body_length += amount

func get_head_position() -> Vector2:
	return head_position

func get_head_radius() -> float:
	return HEAD_RADIUS

func get_body_length() -> float:
	return body_length

func step(delta: float):
	if not alive:
		return

	if has_steer_target:
		var desired_angle = target_direction.angle()
		var angle_delta = wrapf(desired_angle - heading, -PI, PI)
		var max_turn = TURN_RATE * delta
		heading += clamp(angle_delta, -max_turn, max_turn)

	var forward = Vector2.RIGHT.rotated(heading)
	head_position += forward * BASE_SPEED * speed_multiplier * delta
	_record_path_point()
	_rebuild_sampled_body()
	_check_self_collision()
	queue_redraw()

func _record_path_point():
	if path_points.is_empty():
		path_points.append(head_position)
		return

	if head_position.distance_to(path_points[0]) >= PATH_SAMPLE_SPACING:
		path_points.push_front(head_position)
		_trim_path()
	else:
		path_points[0] = head_position

func _trim_path():
	var keep_distance = body_length + 180.0
	var distance_sum = 0.0
	var keep_count = path_points.size()
	for i in range(1, path_points.size()):
		distance_sum += path_points[i - 1].distance_to(path_points[i])
		if distance_sum > keep_distance:
			keep_count = i + 1
			break
	if keep_count < path_points.size():
		path_points.resize(keep_count)

func _rebuild_sampled_body():
	sampled_body.clear()
	if path_points.is_empty():
		return

	sampled_body.append(head_position)
	var next_distance = BODY_SAMPLE_SPACING
	var walked = 0.0
	for i in range(1, path_points.size()):
		var a = path_points[i - 1]
		var b = path_points[i]
		var segment_length = a.distance_to(b)
		if segment_length <= 0.001:
			continue
		while walked + segment_length >= next_distance and next_distance <= body_length:
			var t = (next_distance - walked) / segment_length
			sampled_body.append(a.lerp(b, t))
			next_distance += BODY_SAMPLE_SPACING
		walked += segment_length
		if walked > body_length:
			break

func _check_self_collision():
	if body_length < 390.0 or sampled_body.size() < 14:
		return

	var distance_from_head = 0.0
	for i in range(1, sampled_body.size()):
		distance_from_head += sampled_body[i - 1].distance_to(sampled_body[i])
		if distance_from_head < SELF_COLLISION_SKIP_DISTANCE:
			continue
		var radius_scale = _radius_scale_for_index(i)
		var collision_radius = HEAD_RADIUS + BODY_RADIUS * radius_scale - 5.0
		if head_position.distance_to(sampled_body[i]) < collision_radius:
			kill("SELF COLLISION")
			return

func kill(reason: String):
	if not alive:
		return
	alive = false
	emit_signal("died", reason)
	queue_redraw()

func _radius_scale_for_index(index: int) -> float:
	if sampled_body.size() <= 1:
		return 1.0
	var t = float(index) / float(sampled_body.size() - 1)
	return lerp(1.0, 0.36, pow(t, 1.8))

func _draw():
	if sampled_body.is_empty():
		return

	# Soft outer glow / silhouette.
	var packed := PackedVector2Array()
	for point in sampled_body:
		packed.append(point)
	if packed.size() >= 2:
		draw_polyline(packed, Color(0.12, 0.95, 0.76, 0.12), 34.0, true)
		draw_polyline(packed, Color(0.12, 0.93, 0.73, 0.42), 25.0, true)

	for i in range(sampled_body.size() - 1, -1, -1):
		var scale = _radius_scale_for_index(i)
		var radius = BODY_RADIUS * scale
		var energy = 0.72 + 0.28 * (1.0 - float(i) / max(1.0, float(sampled_body.size() - 1)))
		var color = Color(0.10, energy, 0.64, 1.0)
		draw_circle(sampled_body[i], radius, color)
		if i % 3 == 0:
			draw_circle(sampled_body[i], radius * 0.46, Color(0.42, 1.0, 0.84, 0.16))

	# Head and simple directional eyes.
	draw_circle(head_position, HEAD_RADIUS + 2.0, Color(0.20, 1.0, 0.78, 0.22))
	draw_circle(head_position, HEAD_RADIUS, Color(0.10, 0.96, 0.70, 1.0))
	var forward = Vector2.RIGHT.rotated(heading)
	var side = forward.rotated(PI * 0.5)
	var eye_base = head_position + forward * 7.0
	for sign_value in [-1.0, 1.0]:
		var eye_position = eye_base + side * 5.2 * sign_value
		draw_circle(eye_position, 2.8, Color(0.02, 0.05, 0.055, 1.0))
		draw_circle(eye_position + forward * 0.8, 1.1, Color(0.84, 1.0, 0.96, 0.9))
