export const EXAMPLES = {
  "flow-field": `// 1. Campo de Flujo Generativo (Flow Field Loop)
// Diseñado para crear bucles hipnóticos perfectos para video MP4.

const width = app.screen.width;
const height = app.screen.height;

// Contenedor principal con fondo oscuro
const bg = new PIXI.Graphics();
bg.rect(0, 0, width, height).fill({ color: 0x070913 });
app.stage.addChild(bg);

const trails = new PIXI.Graphics();
app.stage.addChild(trails);

// 300 partículas con propiedades cinéticas
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

// Función periódica para garantizar un loop continuo en el tiempo
function fieldAngle(x, y, t) {
  const scale = 0.005;
  return Math.sin(x * scale + Math.cos(t)) * Math.cos(y * scale + Math.sin(t)) * Math.PI * 2;
}

let time = 0;

// Registrar función de actualización cuadro a cuadro
// Si exportas video, la variable 'time' avanzará con precisión matemática sin perder frames.
app.ticker.add((ticker) => {
  time += 0.035;

  // Atenuación suave para dejar estela
  bg.clear();
  bg.rect(0, 0, width, height).fill({ color: 0x070913, alpha: 0.18 });

  trails.clear();

  particles.forEach((p) => {
    const angle = fieldAngle(p.x, p.y, time) + p.seed * 0.01;
    let prevX = p.x;
    let prevY = p.y;

    p.x += Math.cos(angle) * p.speed;
    p.y += Math.sin(angle) * p.speed;

    // Conectar bordes (wrap around)
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

  "sacred-geometry": `// 2. Geometría Sagrada & Mandalas Cinemáticos
// Formas armónicas basadas en trigonometría y simetría radial.

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

  // Núcleo central pulsante
  gfx.star(cx, cy, 8, 30 + Math.sin(t * 3) * 8, 15)
     .fill({ color: 0xffe600 })
     .stroke({ width: 3, color: 0xff5500 });
});
`,

  "cyber-grid": `// 3. Tunel Ciberpunk / Synthwave 3D
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
`,

  "audio-waves": `// 4. Ondas Armónicas & Ruido Orgánico
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
`
};
