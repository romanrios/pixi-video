// ==========================================
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

