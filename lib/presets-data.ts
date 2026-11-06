import type { PresetSeed } from "@/types/preset";

export const PRESETS_DATA: PresetSeed[] = [
  {
    id: "basic-shapes-preset",
    title: "Basic Shapes (Drawing 101)",
    description: "Learn how to draw rectangles, circles, stars, polygons, and text in PixiJS v8.",
    code: `// ==========================================
// PixiJS v8 Basics: Drawing Vector Shapes
// ==========================================
// In PixiJS v8, drawing follows a "shape-then-fill/stroke" pattern:
// 1. Define the shape geometry (rect, circle, star, etc.)
// 2. Call .fill(...) and/or .stroke(...)

// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Change these values to customize colors, stroke thickness, and animations!
const BG_COLOR = 0x0a0f1d;
const STROKE_WIDTH = 3;
const RECT_COLOR = 0x3b82f6;       // Blue
const ROUND_RECT_COLOR = 0x8b5cf6; // Purple
const CIRCLE_COLOR = 0xec4899;     // Pink
const ELLIPSE_COLOR = 0x14b8a6;    // Teal
const STAR_COLOR = 0xeab308;       // Yellow
const TRIANGLE_COLOR = 0xef4444;   // Red
const HEART_COLOR = 0xf43f5e;      // Rose
const DONUT_COLOR = 0x06b6d4;      // Cyan
const STAR_ROTATION_SPEED = 0.5;   // Star rotation multiplier
const HEART_PULSE_SPEED = 3.0;     // Heart pulse frequency
const HEART_PULSE_AMOUNT = 0.08;   // Pulse scale expansion

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: BG_COLOR });
app.stage.addChild(bg);

// Title text
const title = new PIXI.Text({
  text: "PixiJS v8: Basic Shapes Gallery",
  style: {
    fontFamily: "Arial, sans-serif",
    fontSize: 22,
    fontWeight: "bold",
    fill: 0xf8fafc,
  },
});
title.position.set(30, 25);
app.stage.addChild(title);

// Helper function to create label text under each shape
function addLabel(text, x, y) {
  const label = new PIXI.Text({
    text,
    style: {
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0x94a3b8,
    },
  });
  label.anchor.set(0.5, 0);
  label.position.set(x, y);
  app.stage.addChild(label);
}

// 1. RECTANGLE
const rect = new PIXI.Graphics();
rect.rect(0, 0, 110, 80)
    .fill({ color: RECT_COLOR })
    .stroke({ width: STROKE_WIDTH, color: 0x93c5fd });
rect.position.set(60, 90);
app.stage.addChild(rect);
addLabel("rect()", 115, 185);

// 2. ROUNDED RECTANGLE
const roundRect = new PIXI.Graphics();
roundRect.roundRect(0, 0, 110, 80, 16)
         .fill({ color: ROUND_RECT_COLOR })
         .stroke({ width: STROKE_WIDTH, color: 0xc4b5fd });
roundRect.position.set(220, 90);
app.stage.addChild(roundRect);
addLabel("roundRect()", 275, 185);

// 3. CIRCLE
const circle = new PIXI.Graphics();
circle.circle(0, 0, 45)
      .fill({ color: CIRCLE_COLOR })
      .stroke({ width: STROKE_WIDTH, color: 0xfbcfe8 });
circle.position.set(430, 130);
app.stage.addChild(circle);
addLabel("circle()", 430, 185);

// 4. ELLIPSE
const ellipse = new PIXI.Graphics();
ellipse.ellipse(0, 0, 55, 35)
       .fill({ color: ELLIPSE_COLOR })
       .stroke({ width: STROKE_WIDTH, color: 0x99f6e4 });
ellipse.position.set(585, 130);
app.stage.addChild(ellipse);
addLabel("ellipse()", 585, 185);

// 5. STAR
const star = new PIXI.Graphics();
// star(centerX, centerY, points, outerRadius, innerRadius)
star.star(0, 0, 5, 48, 24)
    .fill({ color: STAR_COLOR })
    .stroke({ width: STROKE_WIDTH, color: 0xfef08a });
star.position.set(115, 270);
app.stage.addChild(star);
addLabel("star()", 115, 330);

// 6. TRIANGLE / POLYGON
const triangle = new PIXI.Graphics();
// poly([x1, y1, x2, y2, x3, y3, ...])
triangle.poly([-45, 40, 0, -45, 45, 40])
        .fill({ color: TRIANGLE_COLOR })
        .stroke({ width: STROKE_WIDTH, color: 0xfecaca });
triangle.position.set(275, 270);
app.stage.addChild(triangle);
addLabel("poly()", 275, 330);

// 7. COMPLEX PATH (Heart Shape)
const heart = new PIXI.Graphics();
heart.moveTo(0, 15)
     .bezierCurveTo(-50, -35, -50, 40, 0, 75)
     .bezierCurveTo(50, 40, 50, -35, 0, 15)
     .fill({ color: HEART_COLOR })
     .stroke({ width: STROKE_WIDTH, color: 0xffffff, alpha: 0.8 });
heart.position.set(430, 225);
app.stage.addChild(heart);
addLabel("bezierCurveTo()", 430, 330);

// 8. RING / DONUT (Holes with cut)
const donut = new PIXI.Graphics();
donut.circle(0, 0, 42).fill(DONUT_COLOR)
     .circle(0, 0, 22).cut(); // cut() creates a hole!
donut.position.set(585, 270);
app.stage.addChild(donut);
addLabel("circle().cut()", 585, 330);

// Gentle animation to demonstrate that shapes are live display objects
let time = 0;
app.ticker.add(() => {
  time += 0.03;
  star.rotation = time * STAR_ROTATION_SPEED;
  heart.scale.set(1 + Math.sin(time * HEART_PULSE_SPEED) * HEART_PULSE_AMOUNT);
});
`,
  },
  {
    id: "moving-shapes-preset",
    title: "Movement & Motion (Animation 101)",
    description: "Learn how to move, rotate, pulse, and oscillate shapes using position, rotation, and app.ticker.",
    code: `// ==========================================
// PixiJS v8 Basics: Motion & Transforms
// ==========================================
// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Tweak these variables to change movement speeds, amplitudes, and colors!
const BG_COLOR = 0x080b14;
const ROTATION_SPEED = 0.03;      // Spinner rotation speed per frame
const OSCILLATE_SPEED = 1.0;      // Mover horizontal wave frequency
const OSCILLATE_AMP_X = 90;       // Horizontal travel distance in pixels
const OSCILLATE_AMP_Y = 20;       // Vertical wobble distance in pixels
const PULSE_SPEED = 3.0;          // Star pulse frequency
const PULSE_AMOUNT = 0.28;        // Scale pulse expansion ratio (0.28 = +28%)
const ORBIT_RADIUS = 52;          // Distance of orbiter from center
const ORBIT_SPEED = 1.5;          // Speed of circular revolution
const COLOR_CYCLE_SPEED = 40;     // Hue cycling speed (degrees/sec)

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: BG_COLOR });
app.stage.addChild(bg);

// Title text
const title = new PIXI.Text({
  text: "PixiJS v8: Movement & Transforms",
  style: {
    fontFamily: "Arial, sans-serif",
    fontSize: 20,
    fontWeight: "bold",
    fill: 0xf1f5f9,
  },
});
title.position.set(30, 25);
app.stage.addChild(title);

function createLabel(text, x, y) {
  const label = new PIXI.Text({
    text,
    style: { fontFamily: "monospace", fontSize: 13, fill: 0x64748b },
  });
  label.anchor.set(0.5, 0);
  label.position.set(x, y);
  app.stage.addChild(label);
  return label;
}

// ------------------------------------------
// 1. ROTATING SHAPE (Rotating around center)
// ------------------------------------------
// TIP: Draw centered around (0, 0) so it rotates cleanly around its center!
const spinner = new PIXI.Graphics();
spinner.roundRect(-45, -45, 90, 90, 16)
       .fill({ color: 0x6366f1 })
       .stroke({ width: 3, color: 0xa5b4fc });
spinner.position.set(140, 140);
app.stage.addChild(spinner);
createLabel("1. Rotation (rotation += speed)", 140, 205);

// ------------------------------------------
// 2. OSCILLATING / WAVING (x & y motion)
// ------------------------------------------
const mover = new PIXI.Graphics();
mover.circle(0, 0, 32)
     .fill({ color: 0x06b6d4 })
     .stroke({ width: 3, color: 0x67e8f9 });
mover.position.set(430, 140);
app.stage.addChild(mover);
createLabel("2. Oscillation (Math.sin)", 430, 205);

// ------------------------------------------
// 3. PULSING SCALE (scale.set(s))
// ------------------------------------------
const pulser = new PIXI.Graphics();
pulser.star(0, 0, 6, 45, 22)
      .fill({ color: 0xf59e0b })
      .stroke({ width: 3, color: 0xfde68a });
pulser.position.set(140, 290);
app.stage.addChild(pulser);
createLabel("3. Scaling (scale.set)", 140, 355);

// ------------------------------------------
// 4. CIRCULAR ORBIT PATH & COLOR SHIFT
// ------------------------------------------
const orbiter = new PIXI.Graphics();
orbiter.circle(0, 0, 28)
       .fill({ color: 0xec4899 })
       .stroke({ width: 3, color: 0xffffff });
orbiter.position.set(430, 290);
app.stage.addChild(orbiter);
createLabel("4. Circular Path & Color", 430, 355);

// Orbit guide ring
const guide = new PIXI.Graphics();
guide.circle(430, 290, ORBIT_RADIUS)
     .stroke({ width: 1.5, color: 0x334155, alpha: 0.6 });
app.stage.addChildAt(guide, 1);

// ------------------------------------------
// ANIMATION LOOP (Runs every frame)
// ------------------------------------------
let time = 0;

app.ticker.add((ticker) => {
  time += 0.04;

  // 1. Continuous rotation:
  spinner.rotation += ROTATION_SPEED;

  // 2. Back and forth oscillation using Math.sin():
  mover.x = 430 + Math.sin(time * OSCILLATE_SPEED) * OSCILLATE_AMP_X;
  mover.y = 140 + Math.cos(time * 2 * OSCILLATE_SPEED) * OSCILLATE_AMP_Y;

  // 3. Smooth pulsing scale:
  const scale = 1 + Math.sin(time * PULSE_SPEED) * PULSE_AMOUNT;
  pulser.scale.set(scale);

  // 4. Circular orbit path:
  orbiter.x = 430 + Math.cos(time * ORBIT_SPEED) * ORBIT_RADIUS;
  orbiter.y = 290 + Math.sin(time * ORBIT_SPEED) * ORBIT_RADIUS;

  // Dynamic hue cycling:
  const hue = (time * COLOR_CYCLE_SPEED) % 360;
  orbiter.tint = PIXI.Color.shared.setValue({ h: hue, s: 90, l: 60 }).toNumber();
});
`,
  },
  {
    id: "bouncing-balls-preset",
    title: "Bouncing Balls (Physics & Collisions)",
    description: "Learn how to use velocity vectors (vx, vy), gravity, and boundary collision detection.",
    code: `// ==========================================
// PixiJS v8 Basics: Velocity & Bounds Bounce
// ==========================================
// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Adjust gravity, restitution (bounciness), and ball properties!
const BG_COLOR = 0x050814;
const GRAVITY = 0.25;             // Downward acceleration per frame (0 = zero-g)
const BOUNCE_DAMPING = 0.82;      // Energy retained on impact (1.0 = elastic bounce)
const SQUASH_FACTOR = 0.02;       // Squash & stretch deformation factor

// Array of ball initial properties (color, size, initial velocities)
const BALL_CONFIGS = [
  { color: 0x38bdf8, radius: 32, vx: 4.5, vy: -2 },
  { color: 0xa855f7, radius: 26, vx: -3.8, vy: 3 },
  { color: 0xec4899, radius: 22, vx: 5.2, vy: 4 },
  { color: 0x10b981, radius: 28, vx: -4.2, vy: -5 },
  { color: 0xf59e0b, radius: 35, vx: 3.2, vy: 2 },
];

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: BG_COLOR });
app.stage.addChild(bg);

// Title text
const title = new PIXI.Text({
  text: "PixiJS v8: Physics & Boundary Bounce",
  style: {
    fontFamily: "Arial, sans-serif",
    fontSize: 20,
    fontWeight: "bold",
    fill: 0xf8fafc,
  },
});
title.position.set(30, 25);
app.stage.addChild(title);

const subtitle = new PIXI.Text({
  text: "Shapes detect canvas edges and reverse velocity with bounce damping",
  style: { fontFamily: "monospace", fontSize: 12, fill: 0x64748b },
});
subtitle.position.set(30, 55);
app.stage.addChild(subtitle);

const balls = [];

BALL_CONFIGS.forEach((cfg, i) => {
  const gfx = new PIXI.Graphics();
  gfx.circle(0, 0, cfg.radius)
     .fill({ color: cfg.color })
     .stroke({ width: 3, color: 0xffffff, alpha: 0.9 });

  gfx.position.set(
    width * 0.18 + (i * width * 0.16),
    height * 0.3 + (i * 20)
  );

  app.stage.addChild(gfx);

  balls.push({
    gfx,
    radius: cfg.radius,
    vx: cfg.vx,
    vy: cfg.vy,
  });
});

app.ticker.add((ticker) => {
  balls.forEach((ball) => {
    // 1. Apply gravity to vertical velocity
    ball.vy += GRAVITY;

    // 2. Update position by velocity
    ball.gfx.x += ball.vx;
    ball.gfx.y += ball.vy;

    // 3. Collision with FLOOR
    if (ball.gfx.y + ball.radius > height - 10) {
      ball.gfx.y = height - 10 - ball.radius;
      ball.vy = -ball.vy * BOUNCE_DAMPING;
    }

    // 4. Collision with CEILING
    if (ball.gfx.y - ball.radius < 90) {
      ball.gfx.y = 90 + ball.radius;
      ball.vy = -ball.vy * BOUNCE_DAMPING;
    }

    // 5. Collision with RIGHT WALL
    if (ball.gfx.x + ball.radius > width - 10) {
      ball.gfx.x = width - 10 - ball.radius;
      ball.vx = -ball.vx * BOUNCE_DAMPING;
    }

    // 6. Collision with LEFT WALL
    if (ball.gfx.x - ball.radius < 10) {
      ball.gfx.x = 10 + ball.radius;
      ball.vx = -ball.vx * BOUNCE_DAMPING;
    }

    // Subtle squash & stretch effect based on vertical speed
    const stretch = 1 + Math.min(0.25, Math.abs(ball.vy) * SQUASH_FACTOR);
    ball.gfx.scale.set(1 / stretch, stretch);
  });
});
`,
  },
  {
    id: "containers-hierarchy-preset",
    title: "Containers & Hierarchy (Solar System)",
    description: "Learn how PIXI.Container groups children and applies shared position, rotation, and scale.",
    code: `// ==========================================
// PixiJS v8 Basics: Containers & Hierarchy
// ==========================================
// A Container is a group that holds child display objects.
// When you rotate, move, or scale a Container, ALL its
// children transform relative to it!

// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Tweak orbital distances, body sizes, and rotation speeds!
const BG_COLOR = 0x050711;
const SUN_RADIUS = 48;
const SUN_COLOR = 0xf59e0b;
const SUN_PULSE_SPEED = 3.0;

const EARTH_DISTANCE = 140;       // Pixels from Sun
const EARTH_RADIUS = 22;
const EARTH_ORBIT_SPEED = 0.9;    // Speed of Earth around Sun

const MOON_DISTANCE = 38;         // Pixels from Earth
const MOON_RADIUS = 7;
const MOON_ORBIT_SPEED = 3.5;     // Speed of Moon around Earth

const MARS_DISTANCE = 230;        // Pixels from Sun
const MARS_RADIUS = 16;
const MARS_ORBIT_SPEED = 0.55;    // Speed of Mars around Sun

const width = app.screen.width;
const height = app.screen.height;
const cx = width / 2;
const cy = height / 2;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: BG_COLOR });
app.stage.addChild(bg);

// Title text
const title = new PIXI.Text({
  text: "PixiJS v8: Containers & Relative Hierarchy",
  style: {
    fontFamily: "Arial, sans-serif",
    fontSize: 20,
    fontWeight: "bold",
    fill: 0xf8fafc,
  },
});
title.position.set(30, 25);
app.stage.addChild(title);

const subtitle = new PIXI.Text({
  text: "Sun -> Earth Container (orbits Sun) -> Moon (orbits Earth)",
  style: { fontFamily: "monospace", fontSize: 13, fill: 0x64748b },
});
subtitle.position.set(30, 55);
app.stage.addChild(subtitle);

// Orbit guide circles
const orbitRings = new PIXI.Graphics();
orbitRings.circle(cx, cy, EARTH_DISTANCE).stroke({ width: 1.5, color: 0x1e293b });
orbitRings.circle(cx, cy, MARS_DISTANCE).stroke({ width: 1.5, color: 0x1e293b });
app.stage.addChild(orbitRings);

// 1. ROOT SOLAR SYSTEM CONTAINER (Centered on screen)
const solarSystem = new PIXI.Container();
solarSystem.position.set(cx, cy);
app.stage.addChild(solarSystem);

// 2. THE SUN (Child of solarSystem, at local position 0, 0)
const sun = new PIXI.Graphics();
sun.circle(0, 0, SUN_RADIUS)
   .fill({ color: SUN_COLOR })
   .stroke({ width: 6, color: 0xfde68a, alpha: 0.8 });
solarSystem.addChild(sun);

// Sun corona glow pulse
const sunGlow = new PIXI.Graphics();
sunGlow.circle(0, 0, SUN_RADIUS + 14).fill({ color: 0xffaa00, alpha: 0.2 });
solarSystem.addChildAt(sunGlow, 0);

// 3. EARTH SYSTEM CONTAINER (Child of solarSystem)
const earthSystem = new PIXI.Container();
solarSystem.addChild(earthSystem);

// Earth body (EARTH_DISTANCE away from the Sun in local space)
const earth = new PIXI.Graphics();
earth.circle(0, 0, EARTH_RADIUS)
     .fill({ color: 0x38bdf8 })
     .stroke({ width: 2, color: 0xffffff });
earth.position.set(EARTH_DISTANCE, 0);
earthSystem.addChild(earth);

// 4. MOON SYSTEM CONTAINER (Child of Earth!)
// Notice: Moon is placed inside earth, so it orbits Earth automatically!
const moonOrbit = new PIXI.Container();
earth.addChild(moonOrbit);

const moon = new PIXI.Graphics();
moon.circle(0, 0, MOON_RADIUS)
    .fill({ color: 0xe2e8f0 });
moon.position.set(MOON_DISTANCE, 0);
moonOrbit.addChild(moon);

// Moon orbit guide
const moonGuide = new PIXI.Graphics();
moonGuide.circle(0, 0, MOON_DISTANCE).stroke({ width: 1, color: 0x475569, alpha: 0.4 });
earth.addChildAt(moonGuide, 0);

// 5. MARS (Inner solar system planet)
const marsSystem = new PIXI.Container();
solarSystem.addChild(marsSystem);

const mars = new PIXI.Graphics();
mars.circle(0, 0, MARS_RADIUS)
    .fill({ color: 0xef4444 })
    .stroke({ width: 2, color: 0xfca5a5 });
mars.position.set(MARS_DISTANCE, 0);
marsSystem.addChild(mars);

// ANIMATION LOOP
let time = 0;
app.ticker.add((ticker) => {
  time += 0.02;

  // Pulse sun glow
  sunGlow.scale.set(1 + Math.sin(time * SUN_PULSE_SPEED) * 0.08);

  // Rotate Earth system around the Sun
  earthSystem.rotation = time * EARTH_ORBIT_SPEED;

  // Rotate Moon around Earth
  moonOrbit.rotation = time * MOON_ORBIT_SPEED;

  // Rotate Mars around the Sun at different speed
  marsSystem.rotation = time * MARS_ORBIT_SPEED;
});
`,
  },
  {
    id: "flow-field-preset",
    title: "Flow Field (Generative)",
    description: "300 particles with hypnotic trails and continuous temporal loop.",
    code: `// ==========================================
// 5. Generative Flow Field Loop
// ==========================================
// Designed to create hypnotic seamless loops perfect for MP4 video export.

// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Adjust particle count, speed, field curvature, and trail persistence!
const NUM_PARTICLES = 300;        // Total flow particles (try 100 to 800)
const MIN_SPEED = 2.0;            // Minimum particle velocity
const MAX_SPEED = 4.0;            // Maximum particle velocity
const NOISE_SCALE = 0.005;        // Curvature of field vectors (lower = smoother)
const TIME_STEP = 0.035;          // Animation speed per frame
const TRAIL_FADE = 0.18;          // Background opacity per frame (lower = longer trails)
const LINE_WIDTH = 2.0;           // Trail stroke thickness
const COLOR_SPEED = 30;           // Hue shift rate

const width = app.screen.width;
const height = app.screen.height;

// Dark background container
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x070913 });
app.stage.addChild(bg);

const trails = new PIXI.Graphics();
app.stage.addChild(trails);

const particles = [];

for (let i = 0; i < NUM_PARTICLES; i++) {
  particles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    history: [],
    hue: (i / NUM_PARTICLES) * 360,
    speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
    seed: Math.random() * 100
  });
}

// Periodic function to ensure seamless looping over time
function fieldAngle(x, y, t) {
  return Math.sin(x * NOISE_SCALE + Math.cos(t)) * Math.cos(y * NOISE_SCALE + Math.sin(t)) * Math.PI * 2;
}

let time = 0;

// Frame-by-frame update function
// When exporting video, 'time' advances with mathematical precision with zero frame drops.
app.ticker.add((ticker) => {
  time += TIME_STEP;

  // Subtle trail fade effect
  bg.clear();
  bg.rect(0, 0, width, height).fill({ color: 0x070913, alpha: TRAIL_FADE });

  trails.clear();

  particles.forEach((p) => {
    const angle = fieldAngle(p.x, p.y, time) + p.seed * 0.01;
    let prevX = p.x;
    let prevY = p.y;

    p.x += Math.cos(angle) * p.speed;
    p.y += Math.sin(angle) * p.speed;

    // Edge wrapping
    if (p.x < 0) { p.x = width; prevX = p.x; }
    if (p.x > width) { p.x = 0; prevX = p.x; }
    if (p.y < 0) { p.y = height; prevY = p.y; }
    if (p.y > height) { p.y = 0; prevY = p.y; }

    const col = PIXI.Color.shared.setValue({ h: (p.hue + time * COLOR_SPEED) % 360, s: 90, v: 95 }).toNumber();

    trails.moveTo(prevX, prevY)
          .lineTo(p.x, p.y)
          .stroke({ width: LINE_WIDTH, color: col, alpha: 0.85 });
  });
});
`,
  },
  {
    id: "sacred-geometry-preset",
    title: "Sacred Geometry & Mandalas",
    description: "Harmonic forms based on trigonometry and radial symmetry.",
    code: `// ==========================================
// 6. Sacred Geometry & Cinematic Mandalas
// ==========================================
// Harmonic forms based on trigonometry and radial symmetry.

// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Adjust geometry symmetry, petal count, ring spacing, and rotation speed!
const RINGS = 6;                  // Number of concentric geometric rings
const PETALS = 12;                // Nodes/petals per ring (try 6, 8, 16, 24)
const RING_SPACING = 38;          // Distance between rings in pixels
const EXPANSION_PULSE = 15;       // Breathing expansion radius
const SPEED = 0.025;              // Mandala rotation and pulsation speed
const LINE_WIDTH = 2.5;           // Stroke thickness of outer petals
const CORE_POINTS = 8;            // Points of central star core
const CORE_RADIUS = 30;           // Base radius of central star

const cx = app.screen.width / 2;
const cy = app.screen.height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let t = 0;

app.ticker.add((ticker) => {
  t += SPEED;
  gfx.clear();

  for (let r = 1; r <= RINGS; r++) {
    const radius = r * RING_SPACING + Math.sin(t + r * 0.4) * EXPANSION_PULSE;
    const color = PIXI.Color.shared.setValue({ 
      h: (r * 45 + t * 40) % 360, 
      s: 85, 
      l: 60 
    }).toNumber();

    for (let i = 0; i < PETALS; i++) {
      const angle = (i / PETALS) * Math.PI * 2 + (r % 2 === 0 ? t * 0.5 : -t * 0.5);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const circleR = 10 + Math.sin(t * 2 + i) * 6;

      gfx.circle(x, y, circleR)
         .stroke({ width: LINE_WIDTH, color, alpha: 0.9 })
         .fill({ color: 0xffffff, alpha: 0.1 });
    }
  }

  // Pulsing central star core
  gfx.star(cx, cy, CORE_POINTS, CORE_RADIUS + Math.sin(t * 3) * 8, CORE_RADIUS / 2)
     .fill({ color: 0xffe600 })
     .stroke({ width: 3, color: 0xff5500 });
});
`,
  },
  {
    id: "cyber-grid-preset",
    title: "3D Synthwave Tunnel",
    description: "2.5D generative perspective tunnel with retro neon sun and grid.",
    code: `// ==========================================
// 7. Cyberpunk Tunnel / 3D Synthwave
// ==========================================
// 2.5D generative perspective and velocity simulation.

// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Adjust grid lines, travel speed, sun size, and neon colors!
const TUNNEL_SPEED = 0.04;        // Speed of forward grid motion
const GRID_LINES = 16;            // Number of horizontal horizon lines
const GRID_COLOR = 0x00ffff;      // Neon cyan floor grid
const RAY_SPACING = 60;           // Step between vanishing point rays
const SUN_RADIUS = 90;            // Radius of retro neon sun
const SUN_COLOR = 0xff007f;       // Hot neon pink/magenta sun
const SUN_SLATS = 6;              // Number of horizon cut slits across sun
const BG_COLOR = 0x050510;        // Deep space night sky

const width = app.screen.width;
const height = app.screen.height;
const cx = width / 2;
const cy = height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let zOffset = 0;

app.ticker.add((ticker) => {
  zOffset = (zOffset + TUNNEL_SPEED) % 1;
  gfx.clear();

  // Simulated gradient background
  gfx.rect(0, 0, width, height).fill({ color: BG_COLOR });

  // Retro neon sun on horizon
  gfx.circle(cx, cy - 20, SUN_RADIUS).fill({ color: SUN_COLOR });
  // Sun horizon cut lines
  for (let s = 0; s < SUN_SLATS; s++) {
    gfx.rect(cx - (SUN_RADIUS + 5), cy - 20 + s * 14, (SUN_RADIUS + 5) * 2, 4).fill({ color: BG_COLOR });
  }

  // Perspective floor grid
  for (let i = 0; i < GRID_LINES; i++) {
    const z = (i / GRID_LINES + zOffset) % 1;
    const y = cy + (1 / (1 - z * 0.85) - 1) * 35;
    if (y > height || y < cy) continue;

    const alpha = Math.min(1, (y - cy) / (height - cy));
    gfx.moveTo(0, y)
       .lineTo(width, y)
       .stroke({ width: 2, color: GRID_COLOR, alpha });
  }

  // Vanishing point radial rays
  for (let x = -width; x <= width * 2; x += RAY_SPACING) {
    gfx.moveTo(cx, cy)
       .lineTo(x, height)
       .stroke({ width: 1.5, color: 0x00e5ff, alpha: 0.6 });
  }
});
`,
  },
  {
    id: "audio-waves-preset",
    title: "Harmonic Waves",
    description: "Dynamic sine frequency curves with shifting color gradients.",
    code: `// ==========================================
// 8. Harmonic Waves & Organic Noise
// ==========================================
// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Adjust wave count, amplitude, frequency, and oscillation speed!
const WAVE_COUNT = 5;             // Number of layered harmonic waves
const BASE_AMPLITUDE = 40;        // Wave height in pixels
const AMP_INCREMENT = 22;         // Additional height per wave layer
const BASE_FREQUENCY = 0.008;     // Tightness of horizontal sine oscillations
const SPEED = 0.03;               // Flow animation speed per frame
const LINE_WIDTH = 3.5;           // Wave line thickness
const STEP_X = 8;                 // Resolution step across width (lower = smoother)
const COLOR_SPEED = 20;           // Color hue shift rate

const width = app.screen.width;
const height = app.screen.height;
const cy = height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let phase = 0;

app.ticker.add((ticker) => {
  phase += SPEED;
  gfx.clear();

  for (let w = 0; w < WAVE_COUNT; w++) {
    const amp = BASE_AMPLITUDE + w * AMP_INCREMENT;
    const freq = BASE_FREQUENCY + w * 0.003;
    const speed = phase * (1 + w * 0.3);

    const hue = (w * 50 + phase * COLOR_SPEED) % 360;
    const color = PIXI.Color.shared.setValue({ h: hue, s: 95, l: 55 }).toNumber();

    gfx.moveTo(0, cy);

    for (let x = 0; x <= width; x += STEP_X) {
      const y = cy + Math.sin(x * freq + speed) * Math.cos(x * 0.003 + phase * 0.5) * amp;
      gfx.lineTo(x, y);
    }

    gfx.stroke({ width: LINE_WIDTH, color, alpha: 0.85 });
  }
});
`,
  },
  {
    id: "official-bunnies-preset",
    title: "Official PixiJS: Bunnies Grid",
    description: "Official PixiJS playground style with ES module imports, Assets.load, Application init, and animated rotating grid.",
    code: `import { Application, Assets, Container, Sprite } from 'pixi.js';

// ==========================================
// Official PixiJS v8: Bunnies Grid
// ==========================================
// 🎛️ CONFIGURATION & EXPERIMENTATION VALUES:
// Change grid dimensions, spacing, background color, and spin speed!
const GRID_COLS = 5;              // Number of columns in the grid
const GRID_ROWS = 5;              // Number of rows in the grid
const BUNNY_SPACING = 40;         // Distance between bunnies in pixels
const ROTATION_SPEED = 0.01;      // Grid spin speed per frame
const BG_COLOR = '#1099bb';       // Stage background color
const BUNNY_IMAGE_URL = 'https://pixijs.com/assets/bunny.png';

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: BG_COLOR, resizeTo: window });

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

  // Create and add a container to the stage
  const container = new Container();

  app.stage.addChild(container);

  // Load the bunny texture
  const texture = await Assets.load(BUNNY_IMAGE_URL);

  // Create a grid of bunnies in the container
  const totalBunnies = GRID_COLS * GRID_ROWS;
  for (let i = 0; i < totalBunnies; i++) {
    const bunny = new Sprite(texture);

    bunny.x = (i % GRID_COLS) * BUNNY_SPACING;
    bunny.y = Math.floor(i / GRID_COLS) * BUNNY_SPACING;
    container.addChild(bunny);
  }

  // Move the container to the center
  container.x = app.screen.width / 2;
  container.y = app.screen.height / 2;

  // Center the bunny sprites in local container coordinates
  container.pivot.x = container.width / 2;
  container.pivot.y = container.height / 2;

  // Listen for animate update
  app.ticker.add((time) => {
    // Continuously rotate the container!
    // * use delta to create frame-independent transform *
    container.rotation -= ROTATION_SPEED * time.deltaTime;
  });
})();
`,
  },
];
