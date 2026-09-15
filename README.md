# PROJECT COIL — Classic Snake

PROJECT COIL is now built around the classic Nokia-era Snake loop: discrete grid movement, four directions, one food target, growth, increasing speed, and unforgiving wall/self collision.

## Current playable build

The repository root is the canonical web playtest.

Implemented:

- 20×28 logical grid
- Four-direction movement with instant grid turns
- Swipe controls on the playfield
- On-screen D-pad for mobile/tablet
- Arrow-key and WASD desktop controls
- Food spawning only on free cells
- Growth by one cell per food
- Wall and self collision
- Increasing speed every 5 foods
- Level-scaled score
- Local best-score persistence
- Pause/resume and automatic pause when the app loses focus
- Small retro square-wave sound cues
- Haptic feedback where the browser/device supports it
- Responsive portrait-first LCD presentation with landscape tablet layout

## Play

Open `index.html` directly on desktop, or host the repository as a static site for mobile/tablet play.

The intended GitHub Pages URL is:

`https://mehmetyildiz03.github.io/project-coil/`

## Product direction

The design target is not a modern `.io` snake game. It is:

> Nokia-era Snake clarity and tension, rebuilt as a polished modern mobile/tablet game.

The classic game loop stays simple. New systems should be added as separate modes or presentation layers rather than making the core rules noisy.

## Next milestones

### C1 — Core feel
- Tune grid size, initial tick speed, acceleration curve and swipe threshold on real phones/tablets.
- Validate buffered turns at high speed.
- Improve pixel-perfect LCD rendering across aspect ratios.

### C2 — Classic polish
- Better retro audio set.
- Optional LCD persistence/ghosting effect.
- Game-start countdown and score feedback.
- Settings for sound, haptics and control preference.

### C3 — Modes
- Classic: walls kill.
- Endless: edge wraps to the opposite side.
- Maze: fixed obstacles and passages.
- Challenge: target score/length/time objectives.

### C4 — Native Godot build

The existing `godot/` directory came from the older free-steering P0 prototype and is not the canonical gameplay implementation anymore. It will be replaced by the same grid rules after the browser feel is approved.

## Rule

Do not add skins, progression, seasons, multiplayer or monetization until the classic Snake movement is excellent on an actual phone.
