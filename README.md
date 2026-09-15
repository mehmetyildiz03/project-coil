# PROJECT COIL — P0 Feel Lab

This package contains the first playable foundation for the mobile/tablet snake game.

## What is implemented

- 360° continuous steering
- Dynamic invisible joystick: touch/click anywhere, drag to steer
- Smoothing-limited turning instead of instant snapping
- Path-history body model with a tapering tail
- Camera follow + gradual zoom-out as the snake grows
- Food collection, score and growth
- Self-collision after the snake is long enough
- Arena-edge death
- Fast tap/R restart
- Landscape-first responsive browser playtest
- Matching Godot 4.x project foundation

## Fastest playtest

Open `index.html` in a desktop browser. It also supports touch/pointer input on mobile/tablet when hosted as a static site.

## Godot

Open `godot/project.godot` in a current Godot 4.x stable build and run the project.

The project deliberately uses no external art assets yet. P0 is about movement feel and input quality, not content.

## P0 acceptance checklist

1. Steering should feel predictable with one finger.
2. Releasing the finger must keep the current heading.
3. Tiny finger movement inside the dead-zone must not cause jitter.
4. Large direction changes should curve rather than snap.
5. The body should follow the travelled path without accordion stretching.
6. Camera zoom must never jump.
7. Death must have an obvious cause.
8. Restart should be effectively immediate.

## Next milestone

Do not add progression systems until the feel is approved. Next work should tune speed/turn radius/camera, then add Flow (near-miss + risk) and adaptive mutation telemetry.

## GitHub Pages

The playable web build is served from the repository root (`index.html`).
