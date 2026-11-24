// Pantallas de Menú y Selección de héroes.
const Settings = { difficulty: 'normal' };

// Teclas reales del combo de cada jugador, según hacia dónde mira.
const PLAYER_KEYS = {
  solo: { down: 'DOWN', left: 'LEFT', right: 'RIGHT', up: 'UP', punch: 'A', kick: 'S', special: 'D' },
  1: { down: 'S', left: 'A', right: 'D', up: 'W', punch: 'F', kick: 'G', special: 'H' },
  2: { down: 'DOWN', left: 'LEFT', right: 'RIGHT', up: 'UP', punch: 'I', kick: 'O', special: 'P' },
};
function comboKeys(seq, player, facing) {
  const K = PLAYER_KEYS[player];
  const fwd = facing > 0 ? K.right : K.left, back = facing > 0 ? K.left : K.right;
  return seq.map((t) => ({ down: K.down, fwd, back, punch: K.punch, kick: K.kick }[t]));
}

// Un héroe dibujado a escala, con sombra.
class HeroView {
  constructor(scene, def, x, y, scale, facing = 1, colors) {
    this.scene = scene;
    this.f = new Fighter(def, 0, colors);
    this.f.x = 0; this.f.y = 0; this.f.facing = facing;
    this.g = scene.add.graphics({ x, y }).setScale(scale);
    this.shadow = true;
  }
  update(dt) {
    this.f.animT += dt;
    this.g.clear();
    if (this.shadow) { this.g.fillStyle(0x000000, 0.35); this.g.fillEllipse(0, 4, 70, 12); }
    this.f.draw(this.g, this.scene);
  }
  destroy() {
    if (this.f) this.f.destroySprites();
    if (this.g) this.g.destroy();
  }
}

// ---------- Controles de menú (teclado + joystick de ambos jugadores) ----------
class MenuInput {
  constructor(scene) {
    this.c1 = new Controls(scene, 'p1', 0);
    this.c2 = new Controls(scene, 'p2', 1);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = { enter: K.ENTER, space: K.SPACE, esc: K.ESC, m: K.M };
    this.tap = {};
    for (const [n, code] of Object.entries(this.keys)) {
      scene.input.keyboard.addKey(code).on('down', () => { this.tap[n] = true; });
    }
  }
  update() {
    this.c1.update(); this.c2.update();
    this.enterP = !!this.tap.enter; this.spaceP = !!this.tap.space; this.escP = !!this.tap.esc;
    if (this.tap.m) Sfx.toggleMute();
    this.tap = {};
  }
  any(action) { return this.c1.pressed[action] || this.c2.pressed[action]; }
  get confirm() { return this.enterP || this.spaceP || this.any('punch'); }
  get back() { return this.escP || this.any('kick'); }
}

function bottomBar(scene, items) {
  const g = scene.add.graphics().setDepth(8);
  g.fillStyle(COL.ink, 0.88); g.fillRect(BIG.x, GAME_H - 32, BIG.w, 600);
  g.fillStyle(COL.p1, 0.9); g.fillRect(BIG.x, GAME_H - 32, BIG.w, 2);
  const row = keyRow(scene, GAME_W / 2, GAME_H - 15, items, { size: 22, fontSize: 15, align: 'center' }).setDepth(9);
  // Pegada al borde de abajo aunque la ventana sea más alta
  const place = () => { const dy = Math.max(0, VIEW.b - GAME_H); g.y = dy; row.y = GAME_H - 15 + dy; };
  place();
  scene.scale.on('resize', place);
  scene.events.once('shutdown', () => scene.scale.off('resize', place));
  return row;
}

function sparkle(scene, x, y, tint, depth = 6) {
  const s = scene.add.image(x, y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(0.05).setDepth(depth);
  scene.tweens.add({ targets: s, scale: 0.35 + Math.random() * 0.3, alpha: 0, duration: 600 + Math.random() * 400, ease: 'Cubic.Out', onComplete: () => s.destroy() });
}

// ======================= MENÚ =======================
class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    this._leaving = false;
    this.cameras.main.fadeIn(300, 8, 4, 24);
    this.stage = buildStage(this);
    fitCamera(this, () => this.stage.fit());
    this.add.image(BIG.x, 300, 'shade').setOrigin(0, 0).setDisplaySize(BIG.w, 240).setDepth(1);
    this.add.rectangle(BIG.x + BIG.w / 2, GAME_H + 400, BIG.w, 801, 0x0a0518, 0.95).setDepth(1);

    // Héroes a los costados
    const spots = [[225, 1.2, 1], [735, 1.2, -1], [95, 1.38, 1], [865, 1.38, -1]];
    const ids = [1, 2, 0, 3];
    this.heroes = spots.map(([x, s, fc], i) => {
      const def = CHARACTERS[ids[i]];
      this.add.image(x, 380, 'glow').setTint(def.colors.accent).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4, 3).setAlpha(0.28).setDepth(2);
      const h = new HeroView(this, def, x, 500, s, fc);
      h.g.setDepth(3);
      return h;
    });

    // Logo
    this.add.image(480, 120, 'glow').setTint(0xff9a1f).setBlendMode(Phaser.BlendModes.ADD).setScale(7, 2.6).setAlpha(0.45).setDepth(5);
    this.logo = titleText(this, 480, 92, 'HÉROES', 128, { gradient: GRAD.gold, strokeW: 12 }).setDepth(7).setAngle(-3);
    const rib = this.add.graphics().setDepth(6);
    skewPanel(rib, 312, 156, 336, 50, 16, 0x7a0f24, 1);
    skewPanel(rib, 306, 150, 336, 50, 16, COL.red, 1);
    rib.fillStyle(0xffffff, 0.2); rib.fillPoints(skewPts(306, 150, 336, 12, 16), true);
    rib.lineStyle(3, 0xffffff, 0.9); rib.lineBetween(262, 166, 290, 166); rib.lineBetween(670, 190, 698, 190);
    this.ribbon = rib;
    this.sub = titleText(this, 474, 176, 'EN  COMBATE', 44, { strokeW: 6 }).setDepth(7);
    this.logo.setScale(0); this.sub.setAlpha(0); rib.setAlpha(0);
    this.tweens.add({ targets: this.logo, scale: 1, duration: 520, ease: 'Back.Out' });
    this.tweens.add({ targets: [this.sub, rib], alpha: 1, duration: 300, delay: 300 });
    this.tweens.add({ targets: this.logo, angle: 1, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 600 });

    // Botones
    this.items = [
      { key: 'cpu', label: () => '1 JUGADOR  VS  MÁQUINA' },
      { key: 'online', label: () => 'ONLINE  ·  BUSCAR RIVAL' },
      { key: '2p', label: () => '2 JUGADORES' },
      { key: 'dif', label: () => 'DIFICULTAD:  ' + AI_LEVELS[Settings.difficulty].name },
      { key: 'help', label: () => 'CÓMO SE JUEGA' },
    ];
    this.sel = 0;
    this.btns = this.items.map((it, i) => {
      const c = this.add.container(480, 252 + i * 50).setDepth(7);
      const g = this.add.graphics();
      const t = titleText(this, 0, 0, it.label(), 30, { strokeW: 0, shadow: false });
      c.add([g, t]); c.g = g; c.t = t;
      c.x = 480 + (i % 2 ? 600 : -600);
      this.tweens.add({ targets: c, x: 480, duration: 420, delay: 250 + i * 70, ease: 'Cubic.Out' });
      return c;
    });

    bottomBar(this, [{ k: 'UP' }, { k: 'DOWN' }, { t: 'Elegir' }, { gap: 22 }, { k: 'ENTER' }, { t: 'Aceptar' }, { gap: 22 }, { k: 'M' }, { t: 'Sonido' }]);

    this.buildHelp();
    this.inp = new MenuInput(this);
    this.input.keyboard.on('keydown', () => Sfx.unlock());
    this.events.once('shutdown', () => {
      this.heroes.forEach((h) => h.destroy());
    });
    this.sparkT = 0;
    this.refresh();
  }

  buildHelp() {
    const H = this.add.container(0, 0).setDepth(20).setVisible(false);
    const dim = bigRect(this, 0x05020f, 0.8);
    const g = this.add.graphics();
    g.fillStyle(COL.ink, 0.97); g.fillRoundedRect(30, 22, 900, 494, 18);
    g.lineStyle(3, COL.p1, 1); g.strokeRoundedRect(30, 22, 900, 494, 18);
    g.lineStyle(1, 0xffffff, 0.12); g.strokeRoundedRect(38, 30, 884, 478, 14);
    H.add([dim, g, titleText(this, 480, 60, 'CÓMO SE JUEGA', 50, { gradient: GRAD.gold })]);
    const ribbon = (y, color, text) => {
      const rg = this.add.graphics();
      skewPanel(rg, 230, y, 500, 30, 10, color, 1);
      H.add(rg);
      H.add(titleText(this, 480, y + 15, text, 24, { color: COL.inkS, strokeW: 0, shadow: false }));
    };
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');

    // 1 jugador: flechas + A S D
    ribbon(98, COL.p1, '1 JUGADOR  ·  CONTRA LA MÁQUINA');
    const K = PLAYER_KEYS.solo, mx = 300, my = 222, S = 42;
    const keys = [[K.up, mx, my - 48, 'SALTAR', -1], [K.left, mx - 48, my, 'IZQ.', 1], [K.down, mx, my, 'DEFENSA', 1], [K.right, mx + 48, my, 'DER.', 1]];
    for (const [k, x, y, lab, side] of keys) {
      H.add(keycap(this, x, y, k, { size: S }));
      H.add(uiText(this, x, y + side * 34, lab, 13, '#c9c2e8', { ox: 0.5 }));
    }
    const atk = [[K.punch, 'GOLPE', 0xff8a1f], [K.kick, 'PATADA', 0x4ee44e], [K.special, 'SÚPER', COL.gold]];
    atk.forEach(([k, lab, ring], i) => {
      const x = 560 + i * 64;
      H.add(keycap(this, x, my - 22, k, { size: 48, ring }));
      H.add(titleText(this, x, my + 22, lab, 22, { color: hex(ring), strokeW: 3 }));
    });
    H.add(uiText(this, 430, my - 22, '+', 30, '#c9c2e8', { ox: 0.5 }));

    // 2 jugadores
    ribbon(278, COL.p2, '2 JUGADORES  ·  EN EL MISMO TECLADO');
    const row = (y, tag, color, P, extra) => H.add(keyRow(this, 480, y, [
      { t: tag, title: true, size: 24, color }, { gap: 6 },
      { k: P.up }, { k: P.left }, { k: P.down }, { k: P.right }, { t: 'moverse' }, { gap: 18 },
      { k: P.punch, ring: 0xff8a1f }, { t: 'golpe' }, { k: P.kick, ring: 0x4ee44e }, { t: 'patada' }, { k: P.special, ring: COL.gold }, { t: 'súper' },
      ...(extra ? [{ gap: 8 }, { t: extra, color: '#c9c2e8', size: 13 }] : []),
    ], { size: 28, fontSize: 15, align: 'center' }));
    row(330, 'J1', COL.p1s, PLAYER_KEYS[1]);
    row(372, 'J2', COL.p2s, PLAYER_KEYS[2], '(o 1 2 3 numérico)');

    // Combos y súper
    const box = (x, title, color, text) => {
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.06); bg.fillRoundedRect(x, 400, 420, 60, 10);
      bg.lineStyle(2, color, 0.8); bg.strokeRoundedRect(x, 400, 420, 60, 10);
      H.add(bg);
      H.add(titleText(this, x + 14, 430, title, 26, { color: hex(color), ox: 0, strokeW: 4 }));
      H.add(uiText(this, x + 128, 430, text, 15, '#ffffff', { wrap: 280 }));
    };
    box(52, 'COMBOS', 0xff8a1f, 'Cada héroe tiene una combinación de 3 teclas. La ves abajo durante la pelea.');
    box(488, 'SÚPER', COL.gold, 'La barra de PODER se llena peleando. Cuando brilla, ¡apretá SÚPER!');
    H.add(keyRow(this, 480, 488, [{ t: 'También se puede jugar con joysticks', color: '#c9c2e8' }, { gap: 24 }, { k: 'ENTER' }, { t: 'o' }, { k: 'ESC' }, { t: 'Volver' }], { size: 24, align: 'center' }));
    this.help = H;
  }

  refresh() {
    this.btns.forEach((c, i) => {
      const sel = i === this.sel;
      const g = c.g; g.clear();
      const w = 380, h = 46;
      if (sel) {
        skewPanel(g, -w / 2 + 4, -h / 2 + 5, w, h, 12, 0x7a4a00, 1);
        skewPanel(g, -w / 2, -h / 2, w, h, 12, COL.p1, 1);
        g.fillStyle(0xffffff, 0.35); g.fillPoints(skewPts(-w / 2, -h / 2, w, h * 0.3, 12), true);
        if (this.items[i].key === 'dif') {
          g.fillStyle(COL.ink, 1);
          g.fillTriangle(-w / 2 + 26, 0, -w / 2 + 38, -9, -w / 2 + 38, 9);
          g.fillTriangle(w / 2 - 26, 0, w / 2 - 38, -9, w / 2 - 38, 9);
        }
      } else {
        skewPanel(g, -w / 2, -h / 2, w, h, 12, COL.ink, 0.78, 0xffffff, 2, 0.18);
      }
      c.t.setText(this.items[i].label());
      c.t.setColor(sel ? COL.inkS : '#ffffff');
      c.setScale(sel ? 1.06 : 1);
    });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.stage.update(time);
    for (const h of this.heroes) h.update(dt);
    this.sparkT -= dt;
    if (this.sparkT <= 0) { this.sparkT = 0.12; sparkle(this, 300 + Math.random() * 360, 40 + Math.random() * 120, Math.random() < 0.5 ? 0xffd23f : 0xff8a1f); }
    // Flechitas animadas del botón elegido
    const b = this.btns[this.sel];
    if (!this.chev) this.chev = this.add.graphics().setDepth(8);
    const ch = this.chev; ch.clear();
    const off = 218 + Math.sin(time / 120) * 5;
    ch.fillStyle(COL.p1, 1);
    ch.fillTriangle(b.x - off, b.y - 10, b.x - off + 14, b.y, b.x - off, b.y + 10);
    ch.fillTriangle(b.x + off, b.y - 10, b.x + off - 14, b.y, b.x + off, b.y + 10);
    

    const I = this.inp; I.update();
    if (this._leaving) return;
    if (this.help.visible) {
      if (I.confirm || I.escP) { this.help.setVisible(false); Sfx.select(); }
      return;
    }
    if (I.any('up')) { this.sel = (this.sel + this.items.length - 1) % this.items.length; Sfx.select(); this.refresh(); }
    if (I.any('down')) { this.sel = (this.sel + 1) % this.items.length; Sfx.select(); this.refresh(); }
    const it = this.items[this.sel];
    if (it.key === 'dif' && (I.any('left') || I.any('right') || I.confirm)) {
      const i = AI_ORDER.indexOf(Settings.difficulty);
      const step = I.any('left') ? -1 : 1;
      Settings.difficulty = AI_ORDER[(i + step + AI_ORDER.length) % AI_ORDER.length];
      Sfx.select(); this.refresh();
      return;
    }
    if (I.confirm) {
      Sfx.unlock(); Sfx.confirm();
      if (it.key === 'help') { this.help.setVisible(true); this.help.setAlpha(0); this.tweens.add({ targets: this.help, alpha: 1, duration: 180 }); }
      else if (it.key === 'online') fadeTo(this, 'online');
      else fadeTo(this, 'select', { mode: it.key });
    }
  }
}

// ======================= SELECCIÓN DE HÉROES =======================
class SelectScene extends Phaser.Scene {
  constructor() { super('select'); }

  init(data) {
    this.mode = data.mode || 'cpu';
    this.online = this.mode === 'online';
    this.me = this.online ? Net.side : 0;
    this.leftT = -1;
    this.cur = [0, 3];
    this.locked = [false, false];
    this.step = 0; // modo CPU: 0 = J1 elige, 1 = J1 elige rival
    this.vsT = -1;
    this._leaving = false;
  }

  create() {
    this.cameras.main.fadeIn(250, 8, 4, 24);
    this.stage = buildStage(this);
    fitCamera(this, () => this.stage.fit());
    bigRect(this, 0x0b0620, 0.45).setDepth(1);
    titleText(this, 480, 32, 'ELEGÍ TU HÉROE', 46, { gradient: GRAD.gold }).setDepth(7);
    const chip = this.add.graphics().setDepth(7);
    skewPanel(chip, 18, 14, 196, 26, 6, COL.ink, 0.9, 0xffffff, 1, 0.25);
    uiText(this, 116, 27, this.online ? 'ONLINE' : this.mode === 'cpu' ? 'VS MÁQUINA · ' + AI_LEVELS[Settings.difficulty].name : '2 JUGADORES', 14, '#c9c2e8', { ox: 0.5 }).setDepth(8);

    // Grilla de retratos (4 x 2) en el centro
    this.tileG = this.add.graphics().setDepth(5);
    this.cards = CHARACTERS.map((c, i) => {
      const cx = 480 + ((i % 4) - 1.5) * 118, cy = 140 + Math.floor(i / 4) * 120;
      const icon = this.add.graphics({ x: cx, y: cy - 10 }).setScale(2.05).setDepth(6);
      drawHeadIcon(icon, c, c.colors);
      const name = titleText(this, cx, cy + 37, c.name, 17, { color: COL.inkS, strokeW: 0, shadow: false }).setDepth(7);
      return { cx, cy, icon, name, def: c };
    });
    // Héroes grandes a los costados
    this.big = [0, 1].map((p) => {
      const x = p === 0 ? 125 : 835;
      const glow = this.add.image(x, 280, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(2.6, 3.2).setAlpha(0.4).setDepth(3);
      const view = new HeroView(this, CHARACTERS[this.cur[p]], x, 372, 1.45, p === 0 ? 1 : -1);
      view.g.setDepth(4);
      const name = titleText(this, x, 96, '', 34, { gradient: p === 0 ? GRAD.gold : GRAD.ice }).setDepth(7);
      const stamp = titleText(this, x, 250, '¡LISTO!', 44, { gradient: GRAD.gold }).setAngle(-12).setVisible(false).setDepth(8);
      return { x, glow, view, name, stamp, id: null };
    });
    this.statLabels = [0, 1].map((p) => Object.keys(CHARACTERS[0].stats).map((k, j) =>
      uiText(this, (p === 0 ? 270 : 500) + (j % 2) * 104, 332 + Math.floor(j / 2) * 18, k, 13, '#c9c2e8').setDepth(7)));
    this.badges = [0, 1].map((p) => {
      const c = this.add.container(0, 0).setDepth(9);
      const g = this.add.graphics();
      g.fillStyle(p === 0 ? COL.p1 : COL.p2, 1); g.fillRoundedRect(-28, -13, 56, 26, 13);
      g.fillTriangle(-7, 12, 7, 12, 0, 20);
      const label = this.online ? (p === this.me ? 'TÚ' : 'RIVAL') : p === 0 ? 'J1' : this.mode === 'cpu' ? 'CPU' : 'J2';
      const t = titleText(this, 0, 0, label, 22, { color: COL.inkS, strokeW: 0, shadow: false });
      c.add([g, t]);
      return c;
    });

    this.infoG = this.add.graphics().setDepth(6);
    this.info = [null, null];
    this.infoKey = ['', ''];

    const hint = this.mode !== '2p'
      ? [{ k: 'LEFT' }, { k: 'RIGHT' }, { t: 'Elegir' }, { gap: 22 }, { k: 'ENTER' }, { t: 'Confirmar' }, { gap: 22 }, { k: 'ESC' }, { t: 'Volver' }]
      : [{ t: 'J1', color: COL.p1s }, { k: 'A' }, { k: 'D' }, { k: 'F' }, { gap: 18 }, { t: 'J2', color: COL.p2s }, { k: 'LEFT' }, { k: 'RIGHT' }, { k: 'I' }, { gap: 18 }, { t: 'Deshacer:' }, { k: 'G' }, { k: 'O' }, { gap: 18 }, { k: 'ESC' }, { t: 'Menú' }];
    bottomBar(this, hint);
    this.events.once('shutdown', () => {
      this.big.forEach((b) => { if (b.view) b.view.destroy(); });
      if (this.vsHeroes) this.vsHeroes.forEach((h) => h.destroy());
    });
    this.inp = new MenuInput(this);
  }

  cursorControls(p) { return this.mode === 'cpu' ? this.inp.c1 : (p === 0 ? this.inp.c1 : this.inp.c2); }
  activeCursors() {
    if (this.online) return this.locked[this.me] ? [] : [this.me];
    if (this.mode === 'cpu') return this.step === 0 ? [0] : this.step === 1 ? [1] : [];
    return [0, 1].filter((p) => !this.locked[p]);
  }

  buildInfo(p) {
    const key = this.cur[p] + '|' + this.locked[p];
    if (this.infoKey[p] === key) return;
    this.infoKey[p] = key;
    if (this.info[p]) this.info[p].destroy();
    const c = CHARACTERS[this.cur[p]];
    const right = p === 1;
    const x0 = right ? 512 : 34;
    const color = right ? COL.p2s : COL.p1s;
    const cont = this.add.container(0, 0).setDepth(7);
    const who = this.online ? (p === this.me ? 'VOS' : 'TU RIVAL') : p === 0 ? 'JUGADOR 1' : this.mode === 'cpu' ? 'MÁQUINA' : 'JUGADOR 2';
    const keysOf = this.online ? p === this.me : !(this.mode === 'cpu' && p === 1);
    cont.add(uiText(this, x0, 392, who + (this.locked[p] ? '  ✔ LISTO' : ''), 13, color));
    cont.add(titleText(this, x0 - 6, 416, c.name, 32, { ox: 0, color, strokeW: 5 }));
    cont.add(uiText(this, x0 + 175, 418, c.passive, 15, '#ffffff', { wrap: 250 }));
    const player = this.online ? 'solo' : p === 0 ? (this.mode === 'cpu' ? 'solo' : 1) : 2;
    cont.add(uiText(this, x0, 452, 'COMBO', 13, '#ff8a1f'));
    if (!keysOf) {
      cont.add(uiText(this, x0 + 56, 452, c.combo.name, 16, '#ffffff'));
    } else {
      cont.add(keyRow(this, x0 + 56, 452, [...comboKeys(c.combo.seq, player, right ? -1 : 1).map((k) => ({ k })), { t: c.combo.name }], { size: 22, fontSize: 15 }));
    }
    cont.add(uiText(this, x0, 480, 'SÚPER', 13, '#ffd23f'));
    const sup = !keysOf ? [{ t: c.superMove.name }] : [{ k: PLAYER_KEYS[player].special, ring: COL.gold }, { t: (c.superMove.name + ' — ' + c.superMove.desc).length > 46 ? c.superMove.name : c.superMove.name + ' — ' + c.superMove.desc }];
    cont.add(keyRow(this, x0 + 56, 480, sup, { size: 22, fontSize: 15 }));
    this.info[p] = cont;
  }

  showP2() { return this.mode !== 'cpu' || this.step >= 1; }

  drawCards(dt, time) {
    const g = this.tileG; g.clear();
    const show = [true, this.showP2()];
    this.cards.forEach((card, i) => {
      const s0 = this.cur[0] === i, s1 = this.cur[1] === i && show[1];
      const def = card.def, x = card.cx - 52, y = card.cy - 48;
      skewPanel(g, x, y, 104, 96, 6, COL.ink, 0.95);
      skewPanel(g, x + 4, y + 4, 96, 66, 5, def.colors.suit, s0 || s1 ? 0.85 : 0.45);
      skewPanel(g, x + 2, y + 72, 100, 22, 2, def.colors.accent, 1);
      if (s0) { g.lineStyle(4, COL.p1, 1); g.strokePoints(skewPts(x - 4, y - 4, 112, 104, 6), true); }
      if (s1) { g.lineStyle(4, COL.p2, 1); g.strokePoints(skewPts(s0 ? x + 2 : x - 4, s0 ? y + 2 : y - 4, s0 ? 100 : 112, s0 ? 92 : 104, 6), true); }
      card.icon.setScale(s0 || s1 ? 2.25 : 2.05);
    });
    // Héroes grandes y sus estadísticas
    [0, 1].forEach((p) => {
      const B = this.big[p];
      const vis = show[p];
      B.view.g.setVisible(vis); B.glow.setVisible(vis); B.name.setVisible(vis);
      this.statLabels[p].forEach((t) => t.setVisible(vis));
      if (!vis) { B.stamp.setVisible(false); return; }
      const def = CHARACTERS[this.cur[p]];
      const mirror = p === 1 && this.cur[0] === this.cur[1];
      const key = def.id + (mirror ? '*' : '');
      if (B.id !== key) {
        if (B.view.f) B.view.f.destroySprites();
        B.id = key;
        B.view.f = new Fighter(def, 0, mirror ? def.alt : def.colors);
        B.view.f.x = 0; B.view.f.y = 0; B.view.f.facing = p === 0 ? 1 : -1;
        setTitle(B.name, def.name);
        B.glow.setTint(def.colors.accent);
        B.view.g.setScale(1.1 * (p === 0 ? 1 : 1)); this.tweens.add({ targets: B.view.g, scale: 1.45, duration: 180, ease: 'Back.Out' });
      }
      B.glow.setAlpha(0.35 + Math.sin(time / 220) * 0.1);
      const locked = this.locked[p];
      B.view.f.victory = locked;
      if (locked && !B.stamp.visible) { B.stamp.setVisible(true).setScale(2.5).setAlpha(0); this.tweens.add({ targets: B.stamp, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' }); }
      if (!locked) B.stamp.setVisible(false);
      B.view.update(dt);
      Object.values(def.stats).forEach((v, j) => {
        const bx = (p === 0 ? 304 : 534) + (j % 2) * 104, by = 332 + Math.floor(j / 2) * 18;
        for (let q = 0; q < 5; q++) {
          g.fillStyle(q < v ? def.colors.accent : 0x3a2d5c, 1);
          g.fillPoints(skewPts(bx + q * 11, by - 5, 9, 10, 2), true);
        }
      });
    });
    const c0 = this.cards[this.cur[0]], c1 = this.cards[this.cur[1]];
    const same = this.cur[0] === this.cur[1];
    const bob = Math.sin(time / 180) * 3;
    this.badges[0].setPosition(c0.cx - (same ? 30 : 0), c0.cy - 62 + bob);
    this.badges[1].setPosition(c1.cx + (same ? 30 : 0), c1.cy - 62 - bob);
    this.badges[1].setVisible(show[1]);

    const ig = this.infoG; ig.clear();
    skewPanel(ig, 22, 384, 446, 112, 8, COL.ink, 0.92, COL.p1, 2, 0.7);
    if (this.showP2()) skewPanel(ig, 498, 384, 446, 112, 8, COL.ink, 0.92, COL.p2, 2, 0.7);
    this.buildInfo(0);
    if (this.showP2()) this.buildInfo(1);
    else if (this.info[1]) { this.info[1].destroy(); this.info[1] = null; this.infoKey[1] = ''; }
  }

  startVs() {
    const V = this.add.container(0, 0).setDepth(30);
    const d1 = CHARACTERS[this.cur[0]], d2 = CHARACTERS[this.cur[1]];
    const dim = bigRect(this, 0x05020f, 0.95);
    const L = this.add.container(-520, 0), R = this.add.container(520, 0);
    const half = (x0, col, dark) => {
      const g = this.add.graphics();
      const ext = x0 < 0 ? -700 : 0;
      skewPanel(g, x0 + ext, -300, 540 + 700, GAME_H + 600, 127, dark, 1);
      skewPanel(g, x0 + ext + 10, -300, 520 + 700, GAME_H + 600, 127, col, 1);
      g.lineStyle(10, 0xffffff, 0.12);
      for (let k = 0; k < 14; k++) { const yy = 20 + k * 40; g.lineBetween(x0 + 40, yy, x0 + 40 + 120 + (k % 3) * 90, yy); }
      g.fillStyle(0xffffff, 0.18); g.fillPoints(skewPts(x0 + 10, 0, 520, 70, 60), true);
      return g;
    };
    const lg = half(-70, COL.p1, 0xb07a00);
    const rg = half(480, COL.p2, 0x0a7aa8);
    const sh1 = this.add.image(BIG.x, 300, 'shade').setOrigin(0, 0).setDisplaySize(BIG.w, 240);
    const h1 = new HeroView(this, d1, 240, 470, 2.3, 1);
    const h2 = new HeroView(this, d2, 720, 470, 2.3, -1, this.cur[0] === this.cur[1] ? d2.alt : d2.colors);
    L.add([lg, this.add.image(240, 330, 'glow').setScale(4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD), h1.g]);
    this.vsNames = [titleText(this, 230, 500, d1.name, 52, { gradient: GRAD.gold }), titleText(this, 730, 500, d2.name, 52, { gradient: GRAD.ice })];
    R.add([rg, this.add.image(720, 330, 'glow').setScale(4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD), h2.g]);
    const L2 = this.add.container(-520, 0), R2 = this.add.container(520, 0);
    L2.add(this.vsNames[0]); R2.add(this.vsNames[1]);
    const vs = titleText(this, 480, 250, 'VS', 170, { gradient: GRAD.fire, strokeW: 14 }).setScale(4).setAlpha(0);
    V.add([dim, L, R, sh1, L2, R2, vs]);
    this.vsHeroes = [h1, h2];
    h1.update(0);
    h2.update(0);
    this.tweens.add({ targets: [L, L2], x: 0, duration: 380, ease: 'Cubic.Out' });
    this.tweens.add({ targets: [R, R2], x: 0, duration: 380, ease: 'Cubic.Out' });
    this.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 300, delay: 380, ease: 'Back.Out', onStart: () => { Sfx.boom(); this.cameras.main.flash(180, 255, 255, 255); this.cameras.main.shake(250, 0.012); } });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.stage.update(time);
    this.drawCards(dt, time);
    const I = this.inp; I.update();

    if (this.vsT >= 0) {
      this.vsT += dt;
      if (this.vsHeroes) this.vsHeroes.forEach((h) => h.update(dt));
      if (this.vsT > 0.5 && !this.vsHeroes) this.startVs();
      if (this.vsT > 2.6) {
        if (!this._leaving) {
          const cfg = { mode: this.mode, p1: CHARACTERS[this.cur[0]].id, p2: CHARACTERS[this.cur[1]].id, difficulty: Settings.difficulty };
          if (this.online) cfg.fightId = Net.newFight();
          fadeTo(this, 'fight', cfg);
        }
      }
      return;
    }
    if (this.online && this.onlineUpdate(I, dt)) return;
    if (I.escP) {
      Sfx.select();
      if (this.mode === 'cpu' && this.step === 1) { this.locked[0] = false; this.step = 0; return; }
      fadeTo(this, 'menu'); return;
    }
    const cpu = this.mode !== '2p';
    for (const p of this.activeCursors()) {
      const c = this.cursorControls(p);
      // Contra la máquina se elige con las flechas (o A/D) y se confirma con ENTER
      const left = cpu ? I.any('left') : c.pressed.left, right = cpu ? I.any('right') : c.pressed.right;
      const up = cpu ? I.any('up') : c.pressed.up, down = cpu ? I.any('down') : c.pressed.down;
      const N = CHARACTERS.length;
      if (left) { this.cur[p] = (this.cur[p] + N - 1) % N; Sfx.select(); }
      if (right) { this.cur[p] = (this.cur[p] + 1) % N; Sfx.select(); }
      if (up || down) { this.cur[p] = (this.cur[p] + 4) % N; Sfx.select(); }
      if (this.online && (left || right || up || down)) Net.send({ t: 'cur', i: this.cur[p] });
      if ((!cpu && c.pressed.punch) || (cpu && I.c1.pressed.punch) || ((p === 0 || cpu) && (I.enterP || I.spaceP))) {
        this.locked[p] = true; Sfx.confirm();
        if (this.online) Net.send({ t: 'lock', i: this.cur[p] });
        if (this.mode === 'cpu') this.step++;
        break;
      }
    }
    if (this.mode === '2p') {
      if (this.locked[0] && I.c1.pressed.kick) { this.locked[0] = false; Sfx.select(); }
      if (this.locked[1] && I.c2.pressed.kick) { this.locked[1] = false; Sfx.select(); }
    }
    if (this.locked[0] && this.locked[1]) { this.vsT = 0; Sfx.win(); }
  }

  // Online: sigue al cursor del rival y maneja si se va. Devuelve true si no hay que seguir.
  onlineUpdate(I, dt) {
    const r = 1 - this.me;
    const badVersion = Net.rival.ver !== undefined && Net.rival.ver !== GAME_BUILD;
    if (Net.rival.left || Net.status === 'error' || badVersion) {
      if (this.leftT < 0) {
        this.leftT = 0;
        if (badVersion) Net.leave();
        const box = this.add.container(0, 0).setDepth(40);
        const g = this.add.graphics();
        g.fillStyle(0x05020f, 0.75); g.fillRect(BIG.x, BIG.y, BIG.w, BIG.h);
        skewPanel(g, 220, 200, 520, 130, 14, COL.ink, 0.97, COL.red, 3, 1);
        box.add([g, titleText(this, 480, 245, badVersion ? 'VERSIONES DISTINTAS' : 'TU RIVAL SE FUE', 46, { gradient: GRAD.red }),
          uiText(this, 480, 298, badVersion ? 'Los dos tienen que recargar la página (F5) para tener la última versión.' : 'Volviendo al menú…', 17, '#ffffff', { ox: 0.5 })]);
        Net.close();
      }
      this.leftT += dt;
      if (this.leftT > (badVersion ? 5 : 2.5)) fadeTo(this, 'menu');
      return true;
    }
    this.cur[r] = Net.rival.cur;
    this.locked[r] = Net.rival.locked;
    if (I.escP) {
      Sfx.select();
      if (this.locked[this.me]) { this.locked[this.me] = false; Net.send({ t: 'unlock' }); return true; }
      Net.leave(); fadeTo(this, 'menu'); return true;
    }
    return false;
  }
}

// ======================= BÚSQUEDA DE RIVAL ONLINE =======================
class OnlineScene extends Phaser.Scene {
  constructor() { super('online'); }

  create() {
    this._leaving = false;
    this.cameras.main.fadeIn(250, 8, 4, 24);
    this.stage = buildStage(this);
    fitCamera(this, () => this.stage.fit());
    bigRect(this, 0x0b0620, 0.5).setDepth(1);
    const g = this.add.graphics().setDepth(5);
    skewPanel(g, 190, 150, 580, 250, 20, COL.ink, 0.95, COL.p2, 3, 1);
    titleText(this, 480, 92, 'ONLINE', 84, { gradient: GRAD.ice, strokeW: 10 }).setDepth(6);
    this.title = titleText(this, 480, 222, '', 44, { gradient: GRAD.gold }).setDepth(6);
    this.sub = uiText(this, 480, 290, '', 18, '#ffffff', { ox: 0.5, align: 'center', wrap: 500 }).setDepth(6);
    this.pingText = uiText(this, 480, 380, '', 14, '#c9c2e8', { ox: 0.5 }).setDepth(6);
    this.spin = this.add.graphics().setDepth(6);
    this.barNormal = bottomBar(this, [{ k: 'ESC' }, { t: 'Cancelar' }]);
    this.inp = new MenuInput(this);
    this.matchedT = -1;
    this.lastKey = '';
    Net.connect();
  }

  setStatus(key, title, sub, grad) {
    if (this.lastKey === key) return;
    this.lastKey = key;
    setTitle(this.title, title, grad || GRAD.gold);
    this.sub.setText(sub);
    this.title.setScale(0.6);
    this.tweens.add({ targets: this.title, scale: 1, duration: 220, ease: 'Back.Out' });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.stage.update(time);
    const I = this.inp; I.update();
    const st = Net.status;
    const sp = this.spin; sp.clear();
    if (st === 'connecting' || st === 'ready' || st === 'waiting') {
      for (let k = 0; k < 8; k++) {
        const a = time / 160 + k * Math.PI / 4;
        sp.fillStyle(COL.p2, 0.25 + 0.75 * ((k + Math.floor(time / 120)) % 8) / 8);
        sp.fillCircle(480 + Math.cos(a) * 22, 342 + Math.sin(a) * 22, 4.5);
      }
    }
    if (st === 'connecting') this.setStatus('c', 'CONECTANDO…', 'Conectando con el servidor del juego.');
    else if (st === 'ready' || st === 'waiting') this.setStatus('w', 'BUSCANDO RIVAL…', 'Cuando tu rival entre al modo ONLINE,\nla pelea arranca sola.');
    else if (st === 'matched') {
      this.setStatus('m', '¡RIVAL ENCONTRADO!', 'Preparate para elegir tu héroe…', GRAD.fire);
      if (this.matchedT < 0) { this.matchedT = 0; Sfx.win(); this.cameras.main.flash(150, 255, 255, 255); }
      this.matchedT += dt;
      if (this.matchedT > 1.0) fadeTo(this, 'select', { mode: 'online' });
    } else if (st === 'error') {
      const msg = {
        noserver: ['SIN CONEXIÓN', 'No se pudo conectar con el servidor.\nRevisá tu internet o que el servidor esté encendido.'],
        version: ['HAY UNA VERSIÓN NUEVA', 'Recargá la página (F5) para actualizar el juego.'],
        lost: ['SE CORTÓ LA CONEXIÓN', 'Probá de nuevo en un ratito.'],
        server: ['ERROR DEL SERVIDOR', 'Probá de nuevo en un ratito.'],
      }[Net.error] || ['ERROR', 'Probá de nuevo.'];
      this.setStatus('e' + Net.error, msg[0], msg[1] + '\n\nENTER = reintentar   ·   ESC = volver', GRAD.red);
      if (I.enterP || I.spaceP) { this.lastKey = ''; Net.connect(); }
    }
    this.pingText.setText(Net.ping && st !== 'error' ? 'Ping al servidor: ' + Net.ping + ' ms' : '');
    if (I.escP && st !== 'matched') { Net.leave(); fadeTo(this, 'menu'); }
  }
}
