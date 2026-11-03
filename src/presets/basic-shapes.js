// ==========================================
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

