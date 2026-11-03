// ==========================================
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

