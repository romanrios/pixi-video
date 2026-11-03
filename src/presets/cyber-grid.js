// 3. Tunel Ciberpunk / Synthwave 3D
// Simulación de perspectiva y velocidad generativa 2.5D.

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

  // Fondo gradiente simulado
  gfx.rect(0, 0, width, height).fill({ color: 0x050510 });

  // Sol de neón retro en el horizonte
  gfx.circle(cx, cy - 20, 90).fill({ color: 0xff007f });
  // Rejilla de corte en el sol
  for (let s = 0; s < 6; s++) {
    gfx.rect(cx - 95, cy - 20 + s * 14, 190, 4).fill({ color: 0x050510 });
  }

  // Cuadrícula en perspectiva (Suelo)
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

  // Líneas radiales hacia el punto de fuga
  for (let x = -width; x <= width * 2; x += 60) {
    gfx.moveTo(cx, cy)
       .lineTo(x, height)
       .stroke({ width: 1.5, color: 0x00e5ff, alpha: 0.6 });
  }
});

