export const PRESETS_DATA = [
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

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x0a0f1d });
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
    .fill({ color: 0x3b82f6 })
    .stroke({ width: 3, color: 0x93c5fd });
rect.position.set(60, 90);
app.stage.addChild(rect);
addLabel("rect()", 115, 185);

// 2. ROUNDED RECTANGLE
const roundRect = new PIXI.Graphics();
roundRect.roundRect(0, 0, 110, 80, 16)
         .fill({ color: 0x8b5cf6 })
         .stroke({ width: 3, color: 0xc4b5fd });
roundRect.position.set(220, 90);
app.stage.addChild(roundRect);
addLabel("roundRect()", 275, 185);

// 3. CIRCLE
const circle = new PIXI.Graphics();
circle.circle(0, 0, 45)
      .fill({ color: 0xec4899 })
      .stroke({ width: 3, color: 0xfbcfe8 });
circle.position.set(430, 130);
app.stage.addChild(circle);
addLabel("circle()", 430, 185);

// 4. ELLIPSE
const ellipse = new PIXI.Graphics();
ellipse.ellipse(0, 0, 55, 35)
       .fill({ color: 0x14b8a6 })
       .stroke({ width: 3, color: 0x99f6e4 });
ellipse.position.set(585, 130);
app.stage.addChild(ellipse);
addLabel("ellipse()", 585, 185);

// 5. STAR
const star = new PIXI.Graphics();
// star(centerX, centerY, points, outerRadius, innerRadius)
star.star(0, 0, 5, 48, 24)
    .fill({ color: 0xeab308 })
    .stroke({ width: 3, color: 0xfef08a });
star.position.set(115, 270);
app.stage.addChild(star);
addLabel("star()", 115, 330);

// 6. TRIANGLE / POLYGON
const triangle = new PIXI.Graphics();
// poly([x1, y1, x2, y2, x3, y3, ...])
triangle.poly([-45, 40, 0, -45, 45, 40])
        .fill({ color: 0xef4444 })
        .stroke({ width: 3, color: 0xfecaca });
triangle.position.set(275, 270);
app.stage.addChild(triangle);
addLabel("poly()", 275, 330);

// 7. COMPLEX PATH (Heart Shape)
const heart = new PIXI.Graphics();
heart.moveTo(0, 15)
     .bezierCurveTo(-50, -35, -50, 40, 0, 75)
     .bezierCurveTo(50, 40, 50, -35, 0, 15)
     .fill({ color: 0xf43f5e })
     .stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
heart.position.set(430, 225);
app.stage.addChild(heart);
addLabel("bezierCurveTo()", 430, 330);

// 8. RING / DONUT (Holes with cut)
const donut = new PIXI.Graphics();
donut.circle(0, 0, 42).fill(0x06b6d4)
     .circle(0, 0, 22).cut(); // cut() creates a hole!
donut.position.set(585, 270);
app.stage.addChild(donut);
addLabel("circle().cut()", 585, 330);

// Gentle animation to demonstrate that shapes are live display objects
let time = 0;
app.ticker.add(() => {
  time += 0.03;
  star.rotation = time * 0.5;
  heart.scale.set(1 + Math.sin(time * 3) * 0.08);
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
// Learn how to animate display objects using position,
// rotation, scale, and the app.ticker render loop.

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x080b14 });
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
createLabel("1. Rotation (rotation += 0.03)", 140, 205);

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
guide.circle(430, 290, 52)
     .stroke({ width: 1.5, color: 0x334155, alpha: 0.6 });
app.stage.addChildAt(guide, 1);

// ------------------------------------------
// ANIMATION LOOP (Runs every frame)
// ------------------------------------------
let time = 0;

app.ticker.add((ticker) => {
  time += 0.04;

  // 1. Continuous rotation:
  spinner.rotation += 0.03;

  // 2. Back and forth oscillation using Math.sin():
  mover.x = 430 + Math.sin(time) * 90;
  mover.y = 140 + Math.cos(time * 2) * 20;

  // 3. Smooth pulsing scale:
  const scale = 1 + Math.sin(time * 3) * 0.28;
  pulser.scale.set(scale);

  // 4. Circular orbit path:
  orbiter.x = 430 + Math.cos(time * 1.5) * 52;
  orbiter.y = 290 + Math.sin(time * 1.5) * 52;

  // Dynamic hue cycling:
  const hue = (time * 40) % 360;
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
// Learn how to update positions using velocity vectors (vx, vy)
// and bounce shapes off canvas boundaries with gravity.

const width = app.screen.width;
const height = app.screen.height;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x050814 });
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

// Ball colors and configurations
const BALL_CONFIGS = [
  { color: 0x38bdf8, radius: 32, vx: 4.5, vy: -2 },
  { color: 0xa855f7, radius: 26, vx: -3.8, vy: 3 },
  { color: 0xec4899, radius: 22, vx: 5.2, vy: 4 },
  { color: 0x10b981, radius: 28, vx: -4.2, vy: -5 },
  { color: 0xf59e0b, radius: 35, vx: 3.2, vy: 2 },
];

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

const gravity = 0.25;
const bounce = 0.82; // Bouncing energy retention

app.ticker.add((ticker) => {
  balls.forEach((ball) => {
    // 1. Apply gravity to vertical velocity
    ball.vy += gravity;

    // 2. Update position by velocity
    ball.gfx.x += ball.vx;
    ball.gfx.y += ball.vy;

    // 3. Collision with FLOOR
    if (ball.gfx.y + ball.radius > height - 10) {
      ball.gfx.y = height - 10 - ball.radius;
      ball.vy = -ball.vy * bounce;
    }

    // 4. Collision with CEILING
    if (ball.gfx.y - ball.radius < 90) {
      ball.gfx.y = 90 + ball.radius;
      ball.vy = -ball.vy * bounce;
    }

    // 5. Collision with RIGHT WALL
    if (ball.gfx.x + ball.radius > width - 10) {
      ball.gfx.x = width - 10 - ball.radius;
      ball.vx = -ball.vx * bounce;
    }

    // 6. Collision with LEFT WALL
    if (ball.gfx.x - ball.radius < 10) {
      ball.gfx.x = 10 + ball.radius;
      ball.vx = -ball.vx * bounce;
    }

    // Subtle squash & stretch effect based on vertical speed
    const stretch = 1 + Math.min(0.25, Math.abs(ball.vy) * 0.02);
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

const width = app.screen.width;
const height = app.screen.height;
const cx = width / 2;
const cy = height / 2;

// Background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x050711 });
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
orbitRings.circle(cx, cy, 140).stroke({ width: 1.5, color: 0x1e293b });
orbitRings.circle(cx, cy, 230).stroke({ width: 1.5, color: 0x1e293b });
app.stage.addChild(orbitRings);

// 1. ROOT SOLAR SYSTEM CONTAINER (Centered on screen)
const solarSystem = new PIXI.Container();
solarSystem.position.set(cx, cy);
app.stage.addChild(solarSystem);

// 2. THE SUN (Child of solarSystem, at local position 0, 0)
const sun = new PIXI.Graphics();
sun.circle(0, 0, 48)
   .fill({ color: 0xf59e0b })
   .stroke({ width: 6, color: 0xfde68a, alpha: 0.8 });
solarSystem.addChild(sun);

// Sun corona glow pulse
const sunGlow = new PIXI.Graphics();
sunGlow.circle(0, 0, 62).fill({ color: 0xffaa00, alpha: 0.2 });
solarSystem.addChildAt(sunGlow, 0);

// 3. EARTH SYSTEM CONTAINER (Child of solarSystem)
const earthSystem = new PIXI.Container();
solarSystem.addChild(earthSystem);

// Earth body (140px away from the Sun in local space)
const earth = new PIXI.Graphics();
earth.circle(0, 0, 22)
     .fill({ color: 0x38bdf8 })
     .stroke({ width: 2, color: 0xffffff });
earth.position.set(140, 0);
earthSystem.addChild(earth);

// 4. MOON SYSTEM CONTAINER (Child of Earth!)
// Notice: Moon is placed inside earth, so it orbits Earth automatically!
const moonOrbit = new PIXI.Container();
earth.addChild(moonOrbit);

const moon = new PIXI.Graphics();
moon.circle(0, 0, 7)
    .fill({ color: 0xe2e8f0 });
moon.position.set(38, 0);
moonOrbit.addChild(moon);

// Moon orbit guide
const moonGuide = new PIXI.Graphics();
moonGuide.circle(0, 0, 38).stroke({ width: 1, color: 0x475569, alpha: 0.4 });
earth.addChildAt(moonGuide, 0);

// 5. MARS (Inner solar system planet)
const marsSystem = new PIXI.Container();
solarSystem.addChild(marsSystem);

const mars = new PIXI.Graphics();
mars.circle(0, 0, 16)
    .fill({ color: 0xef4444 })
    .stroke({ width: 2, color: 0xfca5a5 });
mars.position.set(230, 0);
marsSystem.addChild(mars);

// ANIMATION LOOP
let time = 0;
app.ticker.add((ticker) => {
  time += 0.02;

  // Pulse sun glow
  sunGlow.scale.set(1 + Math.sin(time * 3) * 0.08);

  // Rotate Earth system around the Sun
  earthSystem.rotation = time * 0.9;

  // Rotate Moon around Earth
  moonOrbit.rotation = time * 3.5;

  // Rotate Mars around the Sun at different speed
  marsSystem.rotation = time * 0.55;
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

const width = app.screen.width;
const height = app.screen.height;

// Dark background container
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x070913 });
app.stage.addChild(bg);

const trails = new PIXI.Graphics();
app.stage.addChild(trails);

// 300 particles with kinetic properties
const NUM_PARTICLES = 300;
const particles = [];

for (let i = 0; i < NUM_PARTICLES; i++) {
  particles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    history: [],
    hue: (i / NUM_PARTICLES) * 360,
    speed: 2 + Math.random() * 2,
    seed: Math.random() * 100
  });
}

// Periodic function to ensure seamless looping over time
function fieldAngle(x, y, t) {
  const scale = 0.005;
  return Math.sin(x * scale + Math.cos(t)) * Math.cos(y * scale + Math.sin(t)) * Math.PI * 2;
}

let time = 0;

// Frame-by-frame update function
// When exporting video, 'time' advances with mathematical precision with zero frame drops.
app.ticker.add((ticker) => {
  time += 0.035;

  // Subtle trail fade effect
  bg.clear();
  bg.rect(0, 0, width, height).fill({ color: 0x070913, alpha: 0.18 });

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

    const col = PIXI.Color.shared.setValue({ h: (p.hue + time * 30) % 360, s: 90, v: 95 }).toNumber();

    trails.moveTo(prevX, prevY)
          .lineTo(p.x, p.y)
          .stroke({ width: 2, color: col, alpha: 0.85 });
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

const cx = app.screen.width / 2;
const cy = app.screen.height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let t = 0;

app.ticker.add((ticker) => {
  t += 0.025;
  gfx.clear();

  const rings = 6;
  const petals = 12;

  for (let r = 1; r <= rings; r++) {
    const radius = r * 38 + Math.sin(t + r * 0.4) * 15;
    const color = PIXI.Color.shared.setValue({ 
      h: (r * 45 + t * 40) % 360, 
      s: 85, 
      l: 60 
    }).toNumber();

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 + (r % 2 === 0 ? t * 0.5 : -t * 0.5);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const circleR = 10 + Math.sin(t * 2 + i) * 6;

      gfx.circle(x, y, circleR)
         .stroke({ width: 2.5, color, alpha: 0.9 })
         .fill({ color: 0xffffff, alpha: 0.1 });
    }
  }

  // Pulsing central star core
  gfx.star(cx, cy, 8, 30 + Math.sin(t * 3) * 8, 15)
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

const width = app.screen.width;
const height = app.screen.height;
const cx = width / 2;
const cy = height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let zOffset = 0;

app.ticker.add((ticker) => {
  zOffset = (zOffset + 0.04) % 1;
  gfx.clear();

  // Simulated gradient background
  gfx.rect(0, 0, width, height).fill({ color: 0x050510 });

  // Retro neon sun on horizon
  gfx.circle(cx, cy - 20, 90).fill({ color: 0xff007f });
  // Sun horizon cut lines
  for (let s = 0; s < 6; s++) {
    gfx.rect(cx - 95, cy - 20 + s * 14, 190, 4).fill({ color: 0x050510 });
  }

  // Perspective floor grid
  const lines = 16;
  for (let i = 0; i < lines; i++) {
    const z = (i / lines + zOffset) % 1;
    const y = cy + (1 / (1 - z * 0.85) - 1) * 35;
    if (y > height || y < cy) continue;

    const alpha = Math.min(1, (y - cy) / (height - cy));
    gfx.moveTo(0, y)
       .lineTo(width, y)
       .stroke({ width: 2, color: 0x00ffff, alpha });
  }

  // Vanishing point radial rays
  for (let x = -width; x <= width * 2; x += 60) {
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
const width = app.screen.width;
const height = app.screen.height;
const cy = height / 2;

const gfx = new PIXI.Graphics();
app.stage.addChild(gfx);

let phase = 0;

app.ticker.add((ticker) => {
  phase += 0.03;
  gfx.clear();

  const waveCount = 5;
  for (let w = 0; w < waveCount; w++) {
    const amp = 40 + w * 22;
    const freq = 0.008 + w * 0.003;
    const speed = phase * (1 + w * 0.3);

    const hue = (w * 50 + phase * 20) % 360;
    const color = PIXI.Color.shared.setValue({ h: hue, s: 95, l: 55 }).toNumber();

    gfx.moveTo(0, cy);

    for (let x = 0; x <= width; x += 8) {
      const y = cy + Math.sin(x * freq + speed) * Math.cos(x * 0.003 + phase * 0.5) * amp;
      gfx.lineTo(x, y);
    }

    gfx.stroke({ width: 3.5, color, alpha: 0.85 });
  }
});
`,
  },
  {
    id: "official-bunnies-preset",
    title: "Official PixiJS: Bunnies Grid",
    description: "Official PixiJS playground style with ES module imports, Assets.load, Application init, and animated rotating grid.",
    code: `import { Application, Assets, Container, Sprite } from 'pixi.js';

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: '#1099bb', resizeTo: window });

  // Append the application canvas to the document body
  document.body.appendChild(app.canvas);

  // Create and add a container to the stage
  const container = new Container();

  app.stage.addChild(container);

  // Load the bunny texture
  const texture = await Assets.load('https://pixijs.com/assets/bunny.png');

  // Create a 5x5 grid of bunnies in the container
  for (let i = 0; i < 25; i++) {
    const bunny = new Sprite(texture);

    bunny.x = (i % 5) * 40;
    bunny.y = Math.floor(i / 5) * 40;
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
    container.rotation -= 0.01 * time.deltaTime;
  });
})();
`,
  },
];
