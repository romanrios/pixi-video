// 4. Harmonic Waves
// Multiple organic sine waves with progressive phase shifts and dynamic rainbow gradient strokes.

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
