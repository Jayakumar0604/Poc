# Cheese Chase — Game Design Document (GDD) & Future Improvement Plan

**Project Name:** Cheese Chase  
**Document Version:** 1.0.0  
**Target Platform:** Web (Desktop & Mobile Browser / WebGL)  
**Engine & Tech Stack:** React 19, `@react-three/fiber` (Three.js 0.185), `@react-three/postprocessing`, Tailwind CSS  
**Genre:** 3D Endless Runner / Cartoon Arcade  
**Author:** Game Design & Systems Architecture Team  

---

## Executive Summary

**Cheese Chase** is an agile, cartoon-styled 3D endless runner set from the micro-perspective of a plucky mouse navigating a perilous home kitchen environment. Players sprint across a 3-lane track, dodging household hazards, collecting golden cheese wedges, and utilizing high-impact power-ups to evade a relentless feline predator.

This document analyzes the current codebase, details the technical and gameplay architecture, and outlines an expansion roadmap designed to elevate core game feel, deepen meta-progression, and boost long-term player retention.

---

## 1. Current Features & Mechanics

### 1.1 Core Game Loop
The core loop adheres to classic endless runner mechanics built on high-replayability bite-sized sessions:

```
[Main Menu / Difficulty Selection]
             │
             ▼
    [Run Initialization]
             │
             ▼
  [Sprint, Dodge & Collect] ◄───┐
             │                  │ Dynamic Speed Scaling
             ├── Pick up Power-Ups (Rocket, Milk, Magnet)
             │                  │
             ├── Take Hit 1 ────┘ (Cat Closes In, 8s Recovery Window)
             │
             ▼
  [Take Hit 2 / Mouse Trap]
             │
             ▼
     [Game Over Screen] ───► [Save High Score to LocalStorage]
             │
             ▼
      [Instant Restart]
```

- **Session Pacing:** Runs scale continuously from initial base speed up to maximum difficulty cap (`speed += delta * 0.4`).
- **Persistence:** Best run distances are saved to browser local storage (`endless-runner-high-score`).
- **Session Reset:** Zero-delay replayability with instant scene recycling without unmounting WebGL canvases.

---

### 1.2 Lane System & Player Controls

The playfield is divided into three fixed parallel lanes with a spacing constant of `LANE_STEP = 2.4`:

| Lane | Coordinate ($X$) | Description |
| :--- | :--- | :--- |
| **Left Lane** | $-2.4$ | Outer Left Track |
| **Center Lane** | $0.0$ | Default Starting Track |
| **Right Lane** | $+2.4$ | Outer Right Track |

#### Kinematic & Animation Controls
- **Lane Switching (`A` / `D` or `←` / `→`):**
  - Smooth lateral interpolation: `MathUtils.lerp(currentX, targetX, delta * 16)`.
  - **Dynamic Banking & Yaw:** Calculates lateral velocity delta $\Delta x = X_{target} - X_{current}$ to bank body into turns (`bankZ = -dx * 0.35`) and rotate nose along track direction (`yawY = dx * 0.2`).
- **Jump (`Space` or `↑`):**
  - Initial upward impulse `velocity = 12.0`, downward gravity constant $g = -30.0 \, \text{units/s}^2$.
  - Dynamic airborne squash & stretch: Body scales inversely to vertical velocity ($\text{stretch} \in [0.85, 1.3]$), tilting nose along arc trajectory.
  - Landing impact: Triggers body compression (`landSquash = 0.72`), radial shockwave ring (`emitLandShockwave`), and dust puff motes.
- **Duck / Slide (`S` or `↓`):**
  - Low-profile torpedo belly slide: Mouse body squashes vertically (`scale.y = 0.45`, `scale.z = 1.4`), lowering collision height to `GROUND_Y + 0.1` to pass beneath overhead bridges.
  - Generates rapid high-frequency dust clouds along track floor.
- **Locomotion & Tail Whip:**
  - Gallop stride frequency is timed to running speed (`Math.sin(t * 18)`), dynamically driving ear flutter, paw glide, and multi-harmonic tail whip (`tailRef.rotation.z` and `rotation.x`).

---

### 1.3 Damage & Cat Predator Pursuit System

The player is pursued by a low-poly animated Cat model (`CatModel.jsx`) with realistic bounding predator strides:

1. **Two-Hit Buffer:**
   - **Hit 1 (Warning State):** Taking an impact from a non-lethal obstacle (Yarn, Vacuum, Book Hurdle) increments `hits = 1`, plays `playFirstHitSound()`, advances the cat from behind (`z + 1.1` $\to$ `z + 0.85`), triggers a crimson pursuit aura (`CatChaseAura`), and grants a 1.5-second damage cooldown.
   - **Recovery Window:** If the player survives for 8.0 consecutive seconds without taking another hit, the hit counter resets (`hits = 0`), and the cat retreats to background distance.
   - **Hit 2 (Lethal State):** Taking a second hit while the cat is close triggers an instant capture animation: the cat pounces directly onto the mouse (`z + 0.3`), plays `playGameOverSound()`, and halts the run.
2. **Instant Death Hazard:**
   - Hitting a **Mouse Trap** bypasses the two-hit buffer completely, triggering instant defeat and snapping the trap shut with metallic spark particles.

---

### 1.4 Dynamic Obstacle Spawning Architecture

Obstacles are dynamically pooled across an array of 9 continuous track items, recycled as they pass behind the camera (`z > 5` $\to$ `z = player.z - 80`):

```
                                 [TRACK RUNNER AXIS -Z]
[Player: Z=0] ───► [Active Track: Z = -10 to -75] ───► [Spawn Horizon: Z = -80]
                                                               │
                                          ┌────────────────────┴────────────────────┐
                                          ▼                                         ▼
                               [Moving & Ground Types]                   [Overhead Clearance Types]
                                • Mousetrap (Instant Kill)                • Table Bridge (Slide Under)
                                • Rolling Yarn Ball                       • Pencil & Ruler Bridge
                                • Patrol Vacuum Robot (Roomba)            • Composite Book Arch
                                • Ground Book Hurdle (Jump Over)
```

#### Obstacle Catalogue & Collision Behaviors

| Obstacle Type | Placement | Evasion Method | Mechanics & Collision Behavior |
| :--- | :--- | :--- | :--- |
| **Mousetrap** | Ground | Jump / Switch Lane | High-lethal threat. Triggers instant defeat. Emits metallic sparks and pine wood splinters. |
| **Yarn Ball** | Ground | Jump / Switch Lane | Rotates with gyroscopic spin. Causes 1 hit; emits multi-colored wool fuzz particles (`#f43f5e`, `#06b6d4`, `#f59e0b`). |
| **Vacuum Robot (Roomba)** | Ground (Patrol) | Jump / Switch Lane | Autonomous obstacle sweeping laterally across lanes at $3.2 \, \text{units/s}$, rebounding off lane boundaries ($\pm 2.4$). |
| **Book Hurdle** | Ground | Jump | Low-profile book hurdle lying flat across the lane. Emits paper debris motes upon impact. |
| **Table Bridge** | Overhead | Duck / Slide | Large kitchen dining table structure with 4 tall legs. Requires low slide profile. |
| **Pencil & Ruler Bridge** | Overhead | Duck / Slide | Composite obstacle made of two upright yellow pencils supporting an overhead wooden ruler bar. |

- **Swept Bounding-Box Tunneling Prevention:**
  Collision detection sweeps obstacle bounding boxes backward along the travel vector per frame:
  $$\text{Box}_{\min}.z = \text{Box}_{\min}.z - v_{\text{run}} \cdot \Delta t$$
  This mathematical sweep ensures that fast-moving objects cannot clip or tunnel through the player between discrete frames.

---

### 1.5 Collectibles (Cheese System)

Cheese serves as both instantaneous score booster and foundational in-game currency:

- **Regular Swiss Cheese:**
  - Rendered via cached low-poly GLTF geometry with custom roughness and metallic textures.
  - Hover animation: Sinusoidal floating height `y = y_0 + sin(t * 3.5 + id) * 0.08` with dual-axis axial spin.
  - Value: **5 points** on ground, **10 points** in flight mode.
- **Super Golden Cheese:**
  - Guaranteed spawn on every 11th cheese piece (`coinsSpawned % 11 === 10`).
  - Pulsates dynamically in scale (`1 + sin(t * 6) * 0.08`).
  - Value: **20 points** on ground, **25 points** in flight mode.
  - Collection burst: Emits 32 multi-spectral sparkle motes (`#ffd700`, `#ff6080`, `#00f0ff`, `#ffffff`) with central golden dust puff.

---

## 2. Power-Ups System

Cheese Chase features three distinctive power-ups spawned via weighted algorithmic distribution (`obstacle: 60%`, `cheese: 26%`, `milk: 7%`, `magnet: 4%`, `rocket: 3%`):

```
       [POWER-UP ARSENAL]
  ┌────────────┼────────────┐
  ▼            ▼            ▼
[Rocket]     [Milk]      [Magnet]
Flight Mode  Shield      Attractor
(10s)        (5s)        (8s)
```

### 2.1 Rocket / Flight Mode (Duration: 10.0s)

The centerpiece power-up transforms the gameplay loop from ground evasion into high-altitude flight:

1. **Kinematics & Takeoff Progression:**
   - Player elevates smoothly from `GROUND_Y + 0.2` to `FLIGHT_Y = GROUND_Y + 3.0` via exponential lerp.
   - Altitude progress $h_{\text{prog}} \in [0, 1]$ drives pitch takeoff tilt (`rotation.x = -0.34`), aerodynamic compression (`scale = [0.88, 0.82, 1.22]`), and cruising slipstream bobbing.
   - Landing descent features aerodynamic flare tilt followed by ground touchdown shockwave (`emitLandShockwave`).
2. **Dynamic Dual-Level Cheese Spawning:**
   - Stale ground cheese is cleared immediately upon pickup.
   - Spawns an **Airborne Cheese Highway** at altitude `y = FLIGHT_Y + 0.1` aligned directly with the flight corridor.
   - Simultaneously spawns a secondary **Ground Cheese Line** in an alternate lane.
   - **Height-Isolated Collision Law:** Airborne player can *only* collect airborne items; ground cheese cannot be collected while flying, maintaining risk/reward trade-offs.
3. **Speed Sensation & Audio-Visual Juice:**
   - **Camera Transformation:** Field of View expands dynamically from $55^\circ$ to $66^\circ$, and camera pulls back to $[0, 4.8, 8.2]$ for an expansive bird's-eye view.
   - **Multi-Layered Rocket Exhaust (`RocketThrust`):** Emits a white-hot plasma core, turbulent orange/yellow flame plume, billowing dissipating smoke, and high-speed spark droplets with dynamic point light flicker.
   - **Aerodynamic Warp Streaks (`FlightSpeedStreaks`):** 40 procedural GPU line segments rushing past the camera.
   - **Screen Edge Wind Canvas (`WindSpeedOverlay`):** 28 procedural radial streak lines with peripheral vignette fading in smoothly along the viewport edges.
4. **Temporary Invincibility:**
   - While in flight, ground obstacle collision checks are bypassed (`flightModeRef.current || rocketActive`).

---

### 2.2 Milk Shield (Duration: 5.0s)

A defensive restorative booster themed around cartoon cat-and-mouse tropes:

- **Functionality:** Grants 5.0 seconds of absolute invulnerability to all obstacle collisions.
- **Visuals:** Emits creamy white splash droplet particles (`emitImpactBurst` with milk type) and activates a prominent bouncing HUD badge (`🥛 MILK POWER: 5s`).
- **Audio:** Plays dedicated slurping audio SFX (`playMilkSound()`).

---

### 2.3 Cheese Magnet (Duration: 8.0s)

An attraction field designed to maximize cheese collection across all three lanes:

- **Functionality:** Scans all active cheese items within a 45.0 unit sphere (`dist < 45`).
- **Attraction Physics:**
  $$\vec{v}_{\text{pull}} = \min\left(42, \max\left(18, 22 + (30 - \text{dist}) \cdot 1.1\right)\right) \cdot \frac{\vec{P}_{\text{player}} - \vec{P}_{\text{cheese}}}{\|\vec{P}_{\text{player}} - \vec{P}_{\text{cheese}}\|}$$
  As cheese nears the mouse, pull velocity accelerates non-linearly, snapping into collection with an energetic spin and trailing cyan spark motes (`emitMagnetTrail`).
- **Visuals:** Orbiting cyan magnetic flux particles (`MagnetFluxParticles`) rotate in an elliptical aura around the mouse's back.
- **Audio:** Plays energetic electromagnetic hum SFX (`playMagnetSound()`).

---

## 3. Technical Architecture & Optimizations

```
                           [APPLICATION ARCHITECTURE]
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  [React Three Fiber Canvas]    [Audio Pool Manager]    [Graphics Quality Manager]
   • Three.js r185 Scene         • Web Audio / HTML5     • Real-time Shadow Toggle
   • InstancedMesh Particles     • SFX Pool (Size: 6)    • DPR Resolution Scaler
   • Swept Box3 Collisions       • Round-Robin Cycling   • GLTF Shadow Traversal
   • Postprocessing (SSAO)       • Autoplay Unlocking    • Particle Throttling
```

### 3.1 Audio Management System (`audioManager.js`)
- **Sound Pool Architecture:** High-frequency, overlapping sound effects (such as `jump` and `butter` / cheese collection) utilize pre-allocated audio element pools (`SFX_POOL_SIZE = 6`).
- **Round-Robin Index Cycling:**
  ```javascript
  const pool = soundPools[name];
  const index = poolIndices[name];
  poolIndices[name] = (index + 1) % pool.length;
  sound.currentTime = 0;
  sound.play();
  ```
  Prevents audio clipping or cutting off when multiple cheese pieces are collected in rapid succession.
- **Autoplay Lifecycle:** Seamlessly unlocks Web Audio context on the first user interaction (`startAudio()`).
- **State Persistence:** Sound preferences are synchronized with `localStorage ('sound-enabled')`.

---

### 3.2 Graphics Quality Toggle (High vs. Performance)
The game includes a real-time graphics manager (`GraphicsQualityManager.jsx`) that reconfigures the renderer without remounting the scene or dropping game state:

| Feature / System | High Quality Mode | Performance (Low) Mode |
| :--- | :--- | :--- |
| **Shadow Mapping** | Enabled (`PCFSoftShadowMap`, 2048x2048 map) | **Disabled** (`gl.shadowMap.enabled = false`) |
| **Mesh Shadow Flags** | `castShadow = true`, `receiveShadow = true` | `castShadow = false`, `receiveShadow = false` |
| **Dynamic PointLights** | Active on Table Lamps, Rocket Exhaust, Cat Aura | **Disabled** (Ambient & simple Directional only) |
| **Particle Systems** | High-density GPU `InstancedMesh` + Emitters | **Disabled** (`particleEmitter.setEnabled(false)`) |
| **Device Pixel Ratio** | Dynamic scaling up to $\min(\text{DPR}, 1.5)$ | Locked to $1.0$ |
| **Post-Processing** | Screen-Space Ambient Occlusion (SSAO) enabled | **Bypassed completely** |
| **GLTF Model Traversal**| Static single traversal on load | Dynamic interval traversal to strip shadows |

---

### 3.3 Object Pooling & `InstancedMesh` Particle System
To eliminate garbage collection stutters and maintain a rock-solid 60 FPS, all runtime visual effects utilize a pre-allocated object pool system in `particleEmitter.js`:

- **Pool Allocations:**
  - Sparkles Pool: **180 instances** (`SPARKLE_POOL_SIZE = 180`)
  - Dust Motes Pool: **140 instances** (`DUST_POOL_SIZE = 140`)
  - Debris Fragments Pool: **130 instances** (`DEBRIS_POOL_SIZE = 130`)
- **Zero Runtime Allocations:** Single pre-allocated scratch math primitives (`_matrix`, `_position`, `_quaternion`, `_scale`) are reused across all 450 instances.
- **GPU Instancing:** Rendered in a single draw call per particle category via `<instancedMesh>` with direct buffer matrix transforms (`setMatrixAt`) and per-instance vertex coloring (`setColorAt`). Frustum culling is explicitly disabled (`frustumCulled = false`) to bypass bounding sphere recalculations.

---

### 3.4 Lighting & Thematic Environmental Rendering
The environment supports dynamic day/night atmospheric transitions:

- **Day Theme:**
  - Sky Background: `#87CEEB` (Sky Blue) with atmospheric fog blending ($[15, 60]$ range).
  - Hemisphere Light: Sky `#dff4ff`, Ground `#8b5a3c`, Intensity $0.65$.
  - Directional Sun: `#ffd39a` warm sunlight, intensity $1.25$, with directional shadow frustum ($[-12, 12]$).
- **Night Theme:**
  - Sky Background: `#0B0C10` (Midnight Navy) with deep night fog.
  - Hemisphere Light: Sky `#24345f`, Ground `#120d16`, Intensity $0.35$.
  - Dynamic Table Lamps (`LampModel.jsx`): Emits warm point light illumination (`color: #ffab36`, intensity 14, decay 2) through textured amber lantern glass (`emissiveIntensity: 2.8`).

---

## 4. Proposed New Gameplay Mechanics (Mouse vs. Environment)

To transform Cheese Chase from an arcade prototype into a high-retention commercial title, the following 10 mechanics are proposed:

```
                          [10 NEW GAMEPLAY MECHANICS]
  ┌────────────────────────────────────┼────────────────────────────────────┐
  ▼                                    ▼                                    ▼
[META-PROGRESSION]            [HAZARDS & DYNAMICS]                 [SPECIAL SYSTEMS]
1. In-Game Pantry Shop         3. Kitchen Chef Threat              7. Mouse Hole Shortcuts
2. Unlockable Mouse Skins      5. Kitchen Biome Hazards            8. Companion Critter Assist
4. Daily Missions & Bounties   6. Fever Mode / Sugar Rush          9. Cat Boss Showdowns
                                                                   10. Daily Streak Wheel
```

---

### Mechanic 1: In-Game Pantry Shop & Permanent Upgrades
- **Concept:** Provide a long-term progression sink for collected cheese.
- **Gameplay Design:**
  - Upgrade **Magnet Radius** (Levels 1–5: $+10\%$ radius per tier).
  - Upgrade **Rocket Fuel Duration** (Levels 1–5: $+1.5\text{s}$ per tier).
  - Upgrade **Milk Fortification** (Levels 1–5: grants temporary speed boost upon invulnerability expiry).
  - Purchase **Second Chance Cracker**: Consume 500 Cheese to survive one lethal mouse trap hit per run.
- **Retention Impact:** High. Gives every run tangible value even if the high score is not beaten.

---

### Mechanic 2: Unlockable Mouse Skins & Cosmetics
- **Concept:** Visual player expression and vanity rewards unlocked via cheese or milestone achievements.
- **Proposed Roster:**
  - *Chef Mouse:* Wears a tiny chef hat, leaves powdered flour footstep particles.
  - *Ninja Mouse:* Midnight black coat with red headband; belly slide turns into a smoke puff dash.
  - *Cyber Rodent:* Neon wireframe textures, jet engine audio, electronic collection chimes.
  - *Golden Mouse:* Unlocked at 25,000 total cheese collected; permanently emits golden sparkle trails.

---

### Mechanic 3: Secondary Dynamic Threat — The Kitchen Chef
- **Concept:** Elevate environmental tension by introducing human presence above the floor.
- **Gameplay Design:**
  - When the score reaches 1,500m, warning shadow decals appear across 2 adjacent lanes.
  - The towering Kitchen Chef slams a giant **Spatula** or **Rolling Pin** onto the floor after a 1.2-second telegraph, forcing an urgent lane switch.
  - Creates multi-layered depth: player must track both the ground-level Cat behind and the overhead human threat above.

---

### Mechanic 4: Daily Missions & Objective Bounties
- **Concept:** Procedurally generated daily challenge cards refreshing every 24 hours.
- **Objective Examples:**
  - *"Gluttonous Sprint":* Collect 200 Cheese in a single session.
  - *"Limbo Master":* Slide under 8 Table or Pencil bridges in one run.
  - *"High Altitude":* Activate Flight Mode 3 times in a single run.
  - *"Narrow Escape":* Survive for 30 seconds with 1 hit active.
- **Reward:** Cheese Bundles and Golden Cracker tokens for premium cosmetics.

---

### Mechanic 5: Environmental Kitchen Biomes & Dynamic Hazards
- **Concept:** Seamless environmental transitions that modify track physics and player handling.
- **Biomes:**
  - **The Butter Spill:** Slick yellow puddle covering a lane. Stepping on it provides a momentary $+30\%$ speed surge but disables lateral lane switching for 1.2 seconds.
  - **The Hot Stove Plate:** High-heat glowing metal grate; stepping on it causes immediate damage unless jumped over.
  - **The Leaky Sink Zone:** Water droplets fall rhythmically, splashing the screen and creating puddles that induce temporary camera wobble.

---

### Mechanic 6: "Sugar Rush" Cheese Combo Multiplier
- **Concept:** Reward skilled, aggressive line collection with a dynamic fever state.
- **Gameplay Design:**
  - Collecting cheese wedges within $1.0\text{s}$ of each other builds a **Combo Gauge** ($2\times \to 3\times \to 5\times$).
  - Filling the gauge activates **Sugar Rush** for 4.0 seconds: screen saturates with rainbow hues, background music speeds up by $+15\%$, and the mouse automatically vacuums cheese in adjacent lanes.

---

### Mechanic 7: Mouse Hole Wall Shortcuts (Secret Sub-Levels)
- **Concept:** Interactive micro-zones that reward sharp reflexes with safe passage.
- **Gameplay Design:**
  - Occasionally, a glowing baseboard mouse hole appears in the far-left or far-right wall.
  - Dashing into it shifts the camera into a fast 2.5D profile view inside the kitchen walls: a zero-obstacle bonus zone filled with stacked cheese blocks and copper pipes before re-emerging onto the main track.

---

### Mechanic 8: Companion Critter Assist System
- **Concept:** Unlockable passive companions following the mouse.
- **Companion Types:**
  - *Barnaby the Cockroach:* Scouts 15 meters ahead, projecting green holographic halos over safe lanes.
  - *Pip the House Sparrow:* Swoops in to drop a mini milk carton if the player remains at 1 hit for over 15 seconds.
  - *Fritz the Firefly:* Provides $+50\%$ brighter illumination and highlights hidden cheese in Night mode.

---

### Mechanic 9: Boss Encounters — The Catnip Showdown
- **Concept:** Transform milestone score thresholds into dramatic set-piece encounters.
- **Gameplay Design:**
  - Every 3,000m, the screen letterboxes into a cinematic boss sequence.
  - The Cat leaps ahead of the player, swiping giant paws across individual lanes.
  - Green **Catnip Bundles** spawn in lanes: maneuvering into them launches catnip at the cat, stunning it and returning to normal runner gameplay with a massive score bonus.

---

### Mechanic 10: Daily Login Streak Wheel & Cheese Vault
- **Concept:** A proven mobile/web retention hook encouraging daily engagement.
- **Gameplay Design:**
  - Daily login rewards on a 7-day progressive ladder (Day 1: 100 Cheese $\to$ Day 7: Exclusive Chef Hat accessory).
  - Daily "Cheese Wheel" spin providing random consumable boosters (Headstart Rocket, Double Cheese Buff).

---

## 5. Game Feel & Visual Polish Recommendations ("Juice")

"Juice" is the non-functional audiovisual feedback that makes game interactions feel satisfying, tactile, and rewarding:

```
                            [THE JUICE BLUEPRINT]
  ┌───────────────────────┬───────────────────────┬───────────────────────┐
  ▼                       ▼                       ▼                       ▼
[Camera Dynamics]       [Hit Stop & Time]       [Post-Processing]       [Auditory Polish]
• Directional Trauma    • 45ms Impact Freeze    • UnrealBloom Glow      • Pentatonic Scaling
• Velocity FOV Warp     • Slow-Mo Near Miss     • Chromatic Aberration  • 3D Spatial Audio
• Land Impact Bounce    • Screen Flash Vignette • Red Danger Vignette   • Low-Pass Muffle
```

### 5.1 Camera Dynamics & Screen Trauma
- **Perlin Noise Camera Shake:** Implement a decoupled trauma variable $\text{Trauma} \in [0, 1]$:
  $$\text{Offset}_x = \text{Trauma}^2 \cdot \text{Noise}(t \cdot f_x), \quad \text{Angle}_z = \text{Trauma}^2 \cdot \text{Noise}(t \cdot f_z)$$
  - *Lethal Trap Snap:* Severe trauma ($0.8$), rapid decay.
  - *Yarn/Book Impact:* Medium trauma ($0.45$).
  - *Landing from Jump:* Low subtle trauma ($0.15$).
- **Near-Miss Camera Jolt:** Passing within $0.2$ units of an obstacle without colliding triggers a subtle $2^\circ$ lateral camera twitch and swoosh SFX to reward razor-thin evasions.

---

### 5.2 Hit-Stop & Time Dilation (Micro-Pause)
- **Impact Freeze:** When taking damage from an obstacle or snapping a mousetrap, freeze scene rendering for **40 to 60 milliseconds** before playing the ragdoll/stumble animation.
- This microscopic pause gives collisions physical weight, signaling to the player's brain that significant kinetic force was transferred.

---

### 5.3 Post-Processing Pipeline Upgrades
Building upon the existing `@react-three/postprocessing` integration:
- **Selective UnrealBloom:** Add bloom exclusively to emissive elements (amber lanterns, rocket exhaust plasma, golden cheese sparkles) to make power-ups feel radiant.
- **Chromatic Aberration & Barrel Distortion:** During Flight Mode or Sugar Rush, apply dynamic lens edge separation to emphasize hypersonic velocity.
- **Pulsing Low-Health Vignette:** When `playerStats.hits === 1`, pulse a subtle deep crimson vignette around the viewport border in sync with a rhythmic heartbeat.

---

### 5.4 Auditory Polish & Musical Progression
- **Pentatonic Cheese Collection Scaling:** Consecutive cheese pickups collected within $1.2\text{s}$ of each other should dynamically pitch-shift upward along a major pentatonic scale ($C_5 \to D_5 \to E_5 \to G_5 \to A_5 \to C_6$).
  - Reaching the 6th note triggers a satisfying harmonic chime.
- **3D Positional Audio:** Convert looping obstacle sounds (the rhythmic hum of the Vacuum Robot, the ticking spring of the Mousetrap) to 3D spatialized Web Audio nodes, panning dynamically as they approach and pass the player.
- **Low-Pass Filter on Warning State:** When running with 1 hit remaining, run background music through a $600\text{Hz}$ low-pass filter with an accentuated sub-bass heartbeat to amplify physiological tension.

---

### 5.5 Dynamic Difficulty Pacing Curve

```
Speed & Hazard Density
  ▲
  │              Peak Intensity       Peak Intensity
  │                  /───\                /───\
  │    Rest Zone    /     \  Rest Zone   /     \
  │     ┌─────┐    /       \  ┌─────┐   /       \
  │    /       \  /         \/       \ /         \
  │───/         \/                    V           \───► Time (Distance)
```

- **Pacing Rhythm (Tension & Relief):** Rather than a monotonic linear ramp, implement a sinusoidal sawtooth difficulty curve:
  - **Intensity Wave (45 seconds):** Speed increases, obstacle spacing narrows from $5.5$ to $4.2$ units, moving Roombas spawn frequently.
  - **Relief Corridor (12 seconds):** Obstacles temporarily cease, spawning a scenic straightaway with floating cheese lines and power-ups, allowing the player to exhale and celebrate their survival before the next intensity surge.

---

## 6. Implementation Priority Matrix

| Phase | Category | Feature / Task | Complexity | Impact | Target Milestone |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **P1** | Game Feel | Camera Shake & Impact Hit-Stop | Low | **Very High** | v1.1.0 |
| **P1** | Audio | Pentatonic Cheese Pitch Scaling | Low | **High** | v1.1.0 |
| **P1** | Progression | In-Game Cheese Bank & Persistent Upgrades | Medium | **Very High** | v1.2.0 |
| **P2** | Gameplay | "Sugar Rush" Cheese Combo Multiplier | Medium | **High** | v1.2.0 |
| **P2** | Cosmetics | 4 Unlockable Character Skins | Medium | **High** | v1.3.0 |
| **P2** | Visuals | Post-Processing Bloom & Chromatic Warp | Low | **Medium** | v1.3.0 |
| **P3** | Hazards | Secondary Threat: Kitchen Chef Spatula | High | **High** | v1.4.0 |
| **P3** | Hazards | Kitchen Biomes (Butter & Hot Stove) | Medium | **Medium** | v1.4.0 |
| **P4** | Retention | Daily Objectives & Login Streak Wheel | Medium | **High** | v1.5.0 |
| **P4** | Boss | Cat Boss Showdown Set-piece | High | **Very High** | v2.0.0 |

---

## 7. Conclusion & Next Steps

The current *Cheese Chase* codebase represents an exceptionally solid technical foundation: high-performance instanced rendering, zero-allocation particle math, swept collision safety, responsive controls, and thoughtful graphics scaling are already production-grade.

By executing the roadmap outlined in this document—beginning with tactile **Game Feel & Audio Polish** (P1), expanding into a rewarding **Pantry Upgrade Meta-Loop** (P1–P2), and culminating in dynamic **Chef & Boss Encounters** (P3–P4)—*Cheese Chase* will deliver a competitive, highly addictive commercial web gaming experience.
