// 2. Sacred Geometry & Mandalas
// Harmonic shapes driven by trigonometry, radial symmetry, and vibrant color oscillation.

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
