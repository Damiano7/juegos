// Kit visual: tipografías, teclas dibujadas, paneles, fondo y texturas.
const FONT_T = 'Bangers, Impact, sans-serif';
const FONT_U = 'Rajdhani, "Arial Narrow", Arial, sans-serif';
const COL = {
  p1: 0xffd23f, p1s: '#ffd23f',
  p2: 0x3fd8ff, p2s: '#3fd8ff',
  ink: 0x0d0820, inkS: '#0d0820',
  panel: 0x1a1036, red: 0xff3d5a, gold: 0xffc93c, white: 0xffffff,
};
// Zona visible del mundo (se actualiza al cambiar el tamaño de la ventana).
const VIEW = { l: 0, r: 960, t: 0, b: 540, zoom: 1 };
const BIG = { x: -1000, y: -700, w: 2960, h: 1940 }; // un rectángulo que tapa cualquier pantalla
const TEXT_RES = 2;

// Ajusta la cámara para llenar toda la ventana sin bandas negras.
function fitCamera(scene, onFit) {
  const fit = () => {
    const w = scene.scale.width, h = scene.scale.height;
    const zoom = Math.min(w / GAME_W, h / GAME_H);
    const cam = scene.cameras.main;
    cam.setSize(w, h);
    cam.setZoom(zoom);
    cam.centerOn(GAME_W / 2, GAME_H / 2);
    const vw = w / zoom, vh = h / zoom;
    Object.assign(VIEW, { l: GAME_W / 2 - vw / 2, r: GAME_W / 2 + vw / 2, t: GAME_H / 2 - vh / 2, b: GAME_H / 2 + vh / 2, zoom });
    if (onFit) onFit();
  };
  fit();
  scene.scale.on('resize', fit);
  scene.events.once('shutdown', () => scene.scale.off('resize', fit));
}
function bigRect(scene, color, alpha) {
  return scene.add.rectangle(BIG.x + BIG.w / 2, BIG.y + BIG.h / 2, BIG.w, BIG.h, color, alpha);
}

const GRAD = {
  gold: ['#fffbe0', '#ffe14d', '#ff9a1f'],
  fire: ['#fff3c4', '#ff9a1f', '#ff3d3d'],
  ice: ['#ffffff', '#9ff0ff', '#3fa9ff'],
  red: ['#ffd0d0', '#ff4d5e', '#b3122e'],
  white: ['#ffffff', '#ffffff', '#c9c2e8'],
};

function applyGradient(t, stops) {
  const ctx = t.context;
  const g = ctx.createLinearGradient(0, t.padding.top || 0, 0, t.height - (t.padding.bottom || 0));
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  t.setFill(g);
}

// Título grande con letra de cómic, contorno y sombra.
function titleText(scene, x, y, text, size, opts = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT_T, fontSize: size + 'px', color: opts.color || '#ffffff',
    stroke: opts.stroke || COL.inkS, strokeThickness: opts.strokeW ?? Math.max(4, Math.round(size / 9)),
    align: 'center', padding: { x: 10, y: 8 }, resolution: TEXT_RES,
  }).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
  if (opts.shadow !== false) t.setShadow(0, Math.max(3, Math.round(size / 16)), '#000000', 0, true, true);
  if (opts.gradient) { applyGradient(t, opts.gradient); t._grad = opts.gradient; }
  return t;
}
function setTitle(t, text, gradient) {
  t.setText(text);
  const g = gradient || t._grad;
  if (g) { t._grad = g; applyGradient(t, g); }
  return t;
}

// Texto de interfaz (letra técnica, más chica).
function uiText(scene, x, y, text, size, color = '#ffffff', opts = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT_U, fontStyle: opts.weight || 'bold', fontSize: size + 'px', color,
    align: opts.align || 'left', lineSpacing: opts.lineSpacing || 2,
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined, resolution: TEXT_RES,
  }).setOrigin(opts.ox ?? 0, opts.oy ?? 0.5);
  if (opts.shadow) t.setShadow(0, 2, '#000000', 0, false, true);
  return t;
}

// Una tecla dibujada, con relieve.
function keycap(scene, x, y, label, opts = {}) {
  const h = opts.size || 30;
  const c = scene.add.container(x, y);
  const arrows = { LEFT: 1, RIGHT: 1, UP: 1, DOWN: 1 };
  const isArrow = !!arrows[label];
  let txt = null;
  if (!isArrow) {
    txt = scene.add.text(0, -2, label, { fontFamily: FONT_U, fontStyle: 'bold', fontSize: Math.round(h * 0.56) + 'px', color: opts.textColor || '#1a1030', resolution: TEXT_RES }).setOrigin(0.5);
  }
  const w = Math.max(h, txt ? txt.width + h * 0.55 : h);
  const col = opts.color ?? 0xf3f0ff;
  const g = scene.add.graphics();
  const r = Math.min(7, h / 4);
  g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2 + 1, -h / 2 + 5, w, h, r);
  g.fillStyle(shade(col, 0.6), 1); g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, r);
  g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h - 3, r);
  g.fillStyle(0xffffff, 0.45); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 2, w - 6, h * 0.28, Math.max(1, r - 2));
  if (opts.ring) { g.lineStyle(3, opts.ring, 1); g.strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 3, r + 2); }
  if (isArrow) {
    const s = h * 0.22; g.fillStyle(0x1a1030, 1);
    const tri = {
      LEFT: [-s, 0, s, -s, s, s], RIGHT: [s, 0, -s, -s, -s, s],
      UP: [0, -s - 1, -s, s - 1, s, s - 1], DOWN: [0, s - 1, -s, -s - 1, s, -s - 1],
    }[label];
    g.fillTriangle(tri[0], tri[1] - 1, tri[2], tri[3] - 1, tri[4], tri[5] - 1);
  }
  c.add(g); if (txt) c.add(txt);
  c.w = w; c.h = h;
  return c;
}

// Fila de teclas y textos: [{k:'W'}, {k:'S'}, {t:'Elegir'}, {gap:20}]
function keyRow(scene, x, y, items, opts = {}) {
  const c = scene.add.container(x, y);
  const size = opts.size || 28;
  const fs = opts.fontSize || Math.round(size * 0.62);
  let cx = 0;
  for (const it of items) {
    if (it.gap) { cx += it.gap; continue; }
    if (it.k) {
      const kc = keycap(scene, 0, 0, it.k, { size, color: it.color, ring: it.ring });
      kc.x = cx + kc.w / 2; c.add(kc); cx += kc.w + 6;
    } else if (it.t !== undefined) {
      const t = scene.add.text(cx, 0, it.t, { fontFamily: it.title ? FONT_T : FONT_U, fontStyle: it.title ? 'normal' : 'bold', fontSize: (it.size || fs) + 'px', color: it.color || opts.color || '#ffffff', resolution: TEXT_RES }).setOrigin(0, 0.5);
      if (opts.shadow !== false) t.setShadow(0, 2, '#000000', 0, false, true);
      c.add(t); cx += t.width + 8;
    }
  }
  c.w = cx - 6;
  const align = opts.align || 'left';
  if (align === 'center') c.list.forEach((o) => { o.x -= c.w / 2; });
  if (align === 'right') c.list.forEach((o) => { o.x -= c.w; });
  return c;
}

// Paralelogramo (panel inclinado).
function skewPts(x, y, w, h, s) {
  return [{ x: x + s, y }, { x: x + w + s, y }, { x: x + w - s, y: y + h }, { x: x - s, y: y + h }];
}
function skewPanel(g, x, y, w, h, s, fill, alpha = 1, stroke = null, strokeW = 3, strokeAlpha = 1) {
  g.fillStyle(fill, alpha); g.fillPoints(skewPts(x, y, w, h, s), true);
  if (stroke !== null) { g.lineStyle(strokeW, stroke, strokeAlpha); g.strokePoints(skewPts(x, y, w, h, s), true); }
}
// Barra inclinada que se llena desde un lado (dir 1 = desde la izquierda, -1 = desde la derecha).
function skewFill(g, x, y, w, h, s, frac, dir, color, alpha = 1) {
  frac = clamp(frac, 0, 1);
  if (frac <= 0) return;
  const fw = w * frac;
  const fx = dir > 0 ? x : x + w - fw;
  g.fillStyle(color, alpha); g.fillPoints(skewPts(fx, y, fw, h, s), true);
}

// Texturas generadas una sola vez (viñeta, brillo, rayo de luz).
function ensureTextures(scene) {
  const T = scene.textures;
  if (!T.exists('vignette')) {
    const cv = document.createElement('canvas'); cv.width = GAME_W; cv.height = GAME_H;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, GAME_H * 0.35, GAME_W / 2, GAME_H / 2, GAME_W * 0.68);
    g.addColorStop(0, 'rgba(8,4,24,0)'); g.addColorStop(1, 'rgba(8,4,24,0.78)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, GAME_W, GAME_H);
    T.addCanvas('vignette', cv);
  }
  if (!T.exists('glow')) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    T.addCanvas('glow', cv);
  }
  if (!T.exists('beam')) {
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 600;
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 600, 0, 0);
    g.addColorStop(0, 'rgba(255,240,200,0.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(72, 600); ctx.lineTo(88, 600); ctx.lineTo(160, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    T.addCanvas('beam', cv);
  }
  if (!T.exists('shade')) {
    const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(10,5,30,0)'); g.addColorStop(1, 'rgba(10,5,30,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
    T.addCanvas('shade', cv);
  }
}

// Escenario completo con capas: cielo, reflectores animados, ciudad, piso, viñeta.
function buildStage(scene, opts = {}) {
  ensureTextures(scene);
  const layer = opts.container || null;
  const add = (o) => { if (layer) layer.add(o); return o; };
  const sky = add(scene.add.graphics()); drawSky(sky);
  const beams = [];
  for (let i = 0; i < 3; i++) {
    const b = add(scene.add.image([200, 520, 800][i], GROUND - 60, 'beam').setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35));
    b.baseRot = [-0.35, 0.1, 0.4][i]; b.speed = [0.5, 0.35, 0.6][i]; b.phase = i * 2;
    beams.push(b);
  }
  const city = add(scene.add.graphics()); drawSkyline(city);
  const neon = add(scene.add.text(380, GROUND - 173, 'PIZZA', { fontFamily: FONT_T, fontSize: '36px', color: '#ffb3dd', padding: { x: 12, y: 8 }, resolution: TEXT_RES }).setOrigin(0.5));
  neon.setShadow(0, 0, '#ff4fa3', 14, false, true);
  const vig = scene.add.image(GAME_W / 2, GAME_H / 2, 'vignette').setDepth(opts.vignetteDepth ?? 4);
  if (layer && opts.vignetteInLayer) layer.add(vig);
  return {
    vig,
    fit() { vig.setPosition((VIEW.l + VIEW.r) / 2, (VIEW.t + VIEW.b) / 2).setDisplaySize(VIEW.r - VIEW.l + 4, VIEW.b - VIEW.t + 4); },
    update(time) {
      neon.setAlpha(Math.sin(time / 37) > 0.97 ? 0.4 : 1);
      for (const b of beams) b.rotation = b.baseRot + Math.sin(time / 1000 * b.speed + b.phase) * 0.35;
    },
  };
}

function drawSky(g) {
  const sky = [0x120a33, 0x1f1150, 0x3b1670, 0x66207f, 0x962c78, 0xc8426b, 0xec6a5c, 0xff9a52];
  const N = 64, band = GROUND / N;
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * (sky.length - 1);
    const k = Math.min(sky.length - 2, Math.floor(t)), u = t - k;
    const a = sky[k], b = sky[k + 1];
    const mix = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, u));
    g.fillStyle((mix(16) << 16) | (mix(8) << 8) | mix(0), 1);
    g.fillRect(BIG.x, i * band, BIG.w, band + 1);
  }
  g.fillStyle(sky[0], 1); g.fillRect(BIG.x, BIG.y, BIG.w, -BIG.y);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 150; i++) { g.fillStyle(0xffffff, 0.25 + rnd() * 0.6); g.fillCircle(-520 + rnd() * 2000, -300 + rnd() * 470, rnd() * 1.6 + 0.4); }
  // Sol con halo
  for (let r = 170; r > 80; r -= 15) { g.fillStyle(0xffb86b, 0.05); g.fillCircle(700, 330, r); }
  g.fillStyle(0xffc25a, 1); g.fillCircle(700, 330, 80);
  g.fillStyle(0xffe08a, 1); g.fillCircle(700, 330, 62);
  for (let i = 0; i < 5; i++) { g.fillStyle(0xec6a5c, 0.55); g.fillRect(610, 340 + i * 12, 180, 3 + i); }
}

function drawSkyline(g) {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let x = -700;
  while (x < 1660) {
    const w = 40 + rnd() * 60, h = 90 + rnd() * 170;
    g.fillStyle(0x3a1a5a, 1); g.fillRect(x, GROUND - 40 - h, w, h + 40);
    g.fillStyle(0x4a2470, 1); g.fillRect(x, GROUND - 40 - h, 3, h + 40);
    x += w + 4;
  }
  x = -720;
  while (x < 1660) {
    const w = 60 + rnd() * 80, h = 60 + rnd() * 120;
    const top = GROUND - 30 - h;
    g.fillStyle(0x22103b, 1); g.fillRect(x, top, w, h + 30);
    g.fillStyle(0x341a55, 1); g.fillRect(x, top, w, 4);
    for (let wy = top + 12; wy < GROUND - 40; wy += 16) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        if (rnd() < 0.35) { g.fillStyle(rnd() < 0.15 ? 0x9ff0ff : 0xffd77a, 0.45 + rnd() * 0.45); g.fillRect(wx, wy, 6, 8); }
      }
    }
    if (rnd() < 0.3) { g.lineStyle(2, 0x22103b, 1); g.lineBetween(x + w / 2, top, x + w / 2, top - 30); g.fillStyle(0xff4d4d, 1); g.fillCircle(x + w / 2, top - 30, 3); }
    x += w + 10;
  }
  // Cartel luminoso
  g.fillStyle(0x1a0c2c, 1); g.fillRect(330, GROUND - 150, 6, 110); g.fillRect(424, GROUND - 150, 6, 110);
  g.fillStyle(0x140a26, 1); g.fillRoundedRect(300, GROUND - 205, 160, 62, 8);
  g.lineStyle(3, 0xff4fa3, 0.9); g.strokeRoundedRect(306, GROUND - 199, 148, 50, 6);
  g.fillStyle(0xff4fa3, 0.2); g.fillRoundedRect(306, GROUND - 199, 148, 50, 6);
  // Tanque de agua
  g.fillStyle(0x1a0c2c, 1);
  g.fillRect(90, GROUND - 120, 70, 60); g.fillTriangle(85, GROUND - 120, 165, GROUND - 120, 125, GROUND - 150);
  g.fillRect(98, GROUND - 60, 6, 60); g.fillRect(146, GROUND - 60, 6, 60);
  // Antena con antena roja
  g.fillRect(860, GROUND - 170, 4, 170); g.lineStyle(2, 0x1a0c2c, 1); g.lineBetween(862, GROUND - 160, 840, GROUND); g.lineBetween(862, GROUND - 160, 884, GROUND);
  g.fillStyle(0xff4d4d, 1); g.fillCircle(862, GROUND - 172, 4);
  // Piso de la azotea
  g.fillStyle(0x2b2140, 1); g.fillRect(BIG.x, GROUND, BIG.w, 900);
  g.fillStyle(0x4a3a70, 1); g.fillRect(BIG.x, GROUND, BIG.w, 4);
  g.fillStyle(0x3a2d5c, 1); g.fillRect(BIG.x, GROUND + 4, BIG.w, 6);
  g.lineStyle(2, 0x221a36, 1);
  for (let i = -1500; i < GAME_W + 1500; i += 70) g.lineBetween(GAME_W / 2 + (i - GAME_W / 2) * 0.55, GROUND + 10, i, GAME_H);
  g.lineBetween(BIG.x, GROUND + 34, BIG.x + BIG.w, GROUND + 34);
  g.fillStyle(0x221a36, 1); g.fillRect(BIG.x, GAME_H, BIG.w, 900);
}

// Ícono de la cabeza de un héroe (para el marcador).
function drawHeadIcon(g, def, colors) {
  const fake = { def, colors, animT: 0, move: null, facing: 1 };
  const J = { head: { x: 0, y: 0 }, facing: 1, sh: { x: -3, y: 22 }, hip: { x: -4, y: 60 } };
  g.fillStyle(colors.head, 1); g.fillCircle(0, 0, HEAD_R);
  if (def.drawHead) def.drawHead(g, fake, J, (c) => c);
}

// Barrido de pantalla entre escenas.
function fadeTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(220, 8, 4, 24);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}
