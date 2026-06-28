# Hands Cat's Cradle (双手翻绳) Simulation V2.0 (Enhanced Edition)

This is an optimized, feature-rich version of the Cat's Cradle hand-tracking simulator. It leverages MediaPipe Hands, CSS glassmorphism, dynamic Web Audio synthesizers, and Verlet integration physics to deliver a premium interactive art experience.

## New Features in V2.0

1. **Shape Challenge Mode (形状挑战)**:
   - Match ghost blueprints of traditional configurations (`星星阵`, `金井翻绳`, `花局`).
   - Earn level completions with fireworks particles and musical chord progression rewards.

2. **Interactive Physics (拨弹与剪断)**:
   - **Plucking**: Swipe your fingers through the strings to pluck them, triggering vibrations and synth notes.
   - **Cutting**: Toggling the cutting mode and pinching or using a scissor gesture (closing index and middle fingers) splits the strings, making them drop and fade.

3. **Dynamic Chord Pad Synthesizer (背景和弦声垫)**:
   - Synthesizes background drones that transition chords smoothly.
   - Responds to the distance between your hands—moving them apart filters the sound to be brighter and richer.
   - Timbre options include: *Space Harp (Sine)*, *Warm Wave (Triangle)*, *Retro digital (Square)*.

4. **Visual Themes & Particles (全息主题与动态粒子)**:
   - Four distinct cyberpunk themes (Neon Cyan/Pink, Aurora Violet/Green, Solar Lava Red/Orange, Bioluminescent Ocean Blue/Teal).
   - Theme-specific particles: Twinkling 4-point stars, falling cherry blossoms, and cascading matrix code streams.
   - Holographic skeleton visual styles (translucent palm polygons and double fingertip ring halos).

5. **Physics Engine Presets (物理引擎预设)**:
   - Quick settings for gravity and elasticity: *Earth Normal*, *Zero-G Float*, *Deep Ocean*, *High Elastic Net*.

6. **MediaRecorder Video Capturing (录制与截图)**:
   - Record and save up to 10 seconds of your performance directly to a high-quality `.webm` video file.
   - Capture snapshots of your patterns.

## How to Run

Modern browsers block webcam and Web Audio APIs unless served over `localhost` or HTTPS.

1. **Start a local HTTP server** at the root `cats_cradle/` directory:
   - **Python**: `python -m http.server 8000`
   - **Node.js**: `npx http-server -p 8000`

2. **Open your browser**:
   - Navigate to [http://localhost:8000/enhanced/](http://localhost:8000/enhanced/)

3. **Interact**:
   - Allow camera access.
   - **Click anywhere on the screen** to start/enable audio synthesis.
   - Have fun weaving cyber strings!
