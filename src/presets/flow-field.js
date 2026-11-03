// 1. Flow Field Loop (Generative)
// Designed for seamless looping animations and deterministic MP4 recording.

const width = app.screen.width;
const height = app.screen.height;

// Main background
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x070913 });
app.stage.addChild(bg);

const trails = new PIXI.Graphics();
app.stage.addChild(trails);

// 300 kinetic particles
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

// Periodic flow angle ensuring smooth continuous motion
function fieldAngle(x, y, t) {
  const scale = 0.005;
  return Math.sin(x * scale + Math.cos(t)) * Math.cos(y * scale + Math.sin(t)) * Math.PI * 2;
}

let time = 0;

// Per-frame tick handler (advances deterministically during MP4 export)
app.ticker.add((ticker) => {
  time += 0.035;

  // Gentle fade trail
  bg.clear();
  bg.rect(0, 0, width, height).fill({ color: 0x070913, alpha: 0.18 });

  trails.clear();

  particles.forEach((p) => {
    const angle = fieldAngle(p.x, p.y, time) + p.seed * 0.01;
    p.x += Math.cos(angle) * p.speed;
    p.y += Math.sin(angle) * p.speed;

    // Wrap-around screen bounds
    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    // Draw particle head
    const r = (Math.sin(time + p.seed) * 0.5 + 0.5) * 255;
    const g = (Math.cos(time * 0.7 + p.seed) * 0.5 + 0.5) * 200 + 55;
    const b = 255;
    const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);

    trails.circle(p.x, p.y, 1.8).fill({ color, alpha: 0.85 });
  });
});
