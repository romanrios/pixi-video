// 1. Campo de Flujo Generativo (Flow Field Loop)
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

