// ==========================================
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

