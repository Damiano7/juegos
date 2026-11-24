// La pelea: lógica de rounds, golpes, proyectiles y la interfaz (HUD).
class FightScene extends Phaser.Scene {
  constructor() { super('fight'); }

  init(data) {
    this.cfg = data;
    this._leaving = false;
  }

  create() {
    const d = this.cfg;
    const def1 = CHAR_BY_ID[d.p1], def2 = CHAR_BY_ID[d.p2];
    this.f1 = new Fighter(def1, 0);
    this.f2 = new Fighter(def2, 1, d.p1 === d.p2 ? def2.alt : def2.colors);
    this.fighters = [this.f1, this.f2];
    this.net = d.mode === 'online';
    this.me = this.net ? Net.side : 0;
    this.c1 = new Controls(this, d.mode === '2p' ? 'p1' : 'solo', 0);
    // Con qué teclas juega cada luchador (null = no se muestran: máquina o rival online)
    this.keySet = this.net ? [this.me === 0 ? 'solo' : null, this.me === 1 ? 'solo' : null]
      : [d.mode === 'cpu' ? 'solo' : 1, d.mode === 'cpu' ? null : 2];
    this.c2 = d.mode === '2p' ? new Controls(this, 'p2', 1) : null;
    this.ai = d.mode === 'cpu' ? new AIController(this.f2, d.difficulty) : null;
    this.cameras.main.fadeIn(300, 8, 4, 24);
    this.hx = 0;

    // Capas: el "mundo" tiembla, el HUD no.
    this.world = this.add.container(0, 0);
    this.stage = buildStage(this, { container: this.world });
    this.shadowG = this.add.graphics();
    this.fighterG = this.add.graphics();
    this.fxG = this.add.graphics();
    this.popLayer = this.add.container(0, 0);
    this.world.add([this.shadowG, this.fighterG, this.fxG, this.popLayer]);

    this.buildHud();
    fitCamera(this, () => {
      this.stage.fit();
      ARENA.l = Math.max(VIEW.l, -240); ARENA.r = Math.min(VIEW.r, GAME_W + 240);
    });

    // Anuncios
    this.band = this.add.graphics().setDepth(19).setAlpha(0);
    this.band.fillStyle(COL.ink, 0.7); this.band.fillRect(BIG.x, -62, BIG.w, 124);
    this.band.fillStyle(COL.p1, 1); this.band.fillRect(BIG.x, -62, BIG.w, 4); this.band.fillRect(BIG.x, 58, BIG.w, 4);
    this.band.lineStyle(2, 0xffffff, 0.08);
    for (let x = -700; x < 1700; x += 26) this.band.lineBetween(x, -56, x - 40, 56);
    this.band.y = 230;
    this.bigText = titleText(this, GAME_W / 2, 230, '', 112, { gradient: GRAD.gold, strokeW: 12 }).setDepth(20).setAlpha(0);

    // Súper: franja diagonal con el nombre
    this.superBox = this.add.container(0, 0).setDepth(21).setVisible(false);
    this.superG = this.add.graphics();
    this.superName = titleText(this, 480, 168, '', 64, { gradient: GRAD.gold, strokeW: 9 });
    this.superWho = uiText(this, 480, 118, '', 18, '#ffffff', { ox: 0.5, shadow: true });
    this.superBox.add([this.superG, this.superWho, this.superName]);
    this.dim = bigRect(this, 0x000000, 0).setDepth(15);

    // Pausa
    this.pauseBox = this.add.container(0, 0).setDepth(30).setVisible(false);
    const pg = this.add.graphics();
    pg.fillStyle(0x05020f, 0.7); pg.fillRect(BIG.x, BIG.y, BIG.w, BIG.h);
    skewPanel(pg, 250, 170, 460, 190, 16, COL.ink, 0.97, COL.p1, 3, 1);
    this.pauseBox.add([pg, titleText(this, 480, 225, 'PAUSA', 80, { gradient: GRAD.gold }),
      keyRow(this, 480, 312, [{ k: 'ESC' }, { t: 'Seguir' }, { gap: 24 }, { k: 'Q' }, { t: 'Salir al menú' }], { size: 30, fontSize: 19, align: 'center' })]);

    // Fin de la pelea
    this.endBox = this.add.container(0, 0).setDepth(25).setVisible(false);

    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keyQ = this.input.keyboard.addKey(K.Q);
    this.keyEnter = this.input.keyboard.addKey(K.ENTER);
    this.input.keyboard.addKey(K.ESC).on('down', () => this.togglePause());
    this.input.keyboard.addKey(K.M).on('down', () => Sfx.toggleMute());
    this.tapQ = false; this.tapEnter = false;
    this.keyQ.on('down', () => { this.tapQ = true; });
    this.keyEnter.on('down', () => { this.tapEnter = true; });

    this.projectiles = [];
    this.particles = [];
    this.trauma = 0;
    this.shakeT = 0;
    this.hitstop = 0;
    this.freezeT = 0;
    this.slowmo = 1;
    this.paused = false;
    this.acc = 0;
    this.frame = 0;
    this.round = 0;
    if (this.net) this.setupNet();
    this.startRound();
    Object.assign(window, { fight: this });
  }

  // ---------- HUD ----------
  buildHud() {
    this.hudG = this.add.graphics().setDepth(5);
    const D = 6;
    this.portraits = this.fighters.map((f, i) => {
      const g = this.add.graphics({ x: i === 0 ? 50 : GAME_W - 50, y: 46 }).setDepth(D + 1).setScale(1.55);
      if (i === 1) g.scaleX = -1.55;
      drawHeadIcon(g, f.def, f.colors);
      return g;
    });
    const who = (i) => (this.net ? (i === this.me ? 'TÚ' : 'RIVAL') : i === 0 ? 'J1' : this.ai ? 'CPU' : 'J2');
    this.names = this.fighters.map((f, i) => titleText(this, i === 0 ? 100 : GAME_W - 100, 66, f.def.name, 26, { ox: i === 0 ? 0 : 1, color: i === 0 ? COL.p1s : COL.p2s, strokeW: 5 }).setDepth(D));
    this.whoTags = this.fighters.map((f, i) => uiText(this, i === 0 ? 50 : GAME_W - 50, 92, who(i), 14, '#ffffff', { ox: 0.5, shadow: true }).setDepth(D + 2));
    this.timerText = titleText(this, GAME_W / 2, 38, '60', 50, { strokeW: 6 }).setDepth(D);
    this.roundText = uiText(this, GAME_W / 2, 84, 'ROUND 1', 13, '#ffd23f', { ox: 0.5 }).setDepth(D);
    this.powerLabels = this.fighters.map((f, i) => uiText(this, i === 0 ? 40 : GAME_W - 40, 488, 'PODER', 14, '#c9c2e8', { ox: i === 0 ? 0 : 1, shadow: true }).setDepth(D));
    this.superReady = this.fighters.map((f, i) => {
      const c = this.add.container(i === 0 ? 352 : GAME_W - 352, 514).setDepth(D + 1).setVisible(false);
      if (this.keySet[i]) c.add(keycap(this, 0, 0, PLAYER_KEYS[this.keySet[i]].special, { size: 28, ring: COL.gold }));
      return c;
    });
    this.comboRows = [null, null];
    this.comboKey = ['', ''];
  }

  refreshCombo(i) {
    const f = this.fighters[i];
    if (!this.keySet[i]) return;
    const keys = comboKeys(f.def.combo.seq, this.keySet[i], f.facing);
    const k = keys.join(',');
    if (this.comboKey[i] === k) return;
    this.comboKey[i] = k;
    if (this.comboRows[i]) this.comboRows[i].destroy();
    const items = [{ t: 'COMBO', color: '#ff8a1f', size: 13 }, ...keys.map((x) => ({ k: x }))];
    this.comboRows[i] = keyRow(this, i === 0 ? 312 : GAME_W - 312, 488, items, { size: 20, fontSize: 13, align: i === 0 ? 'right' : 'left' }).setDepth(6);
  }

  drawHud() {
    const g = this.hudG; g.clear();
    const t = this.time.now;
    // Franja oscura arriba
    g.fillStyle(COL.ink, 0.55); g.fillRect(BIG.x, 0, BIG.w, 6);
    // En ventanas anchas, el marcador se abre hacia los bordes
    const hx = clamp((VIEW.r - VIEW.l - GAME_W) / 2, 0, 160);
    const side = (i, base) => (i === 0 ? base - hx : GAME_W - base + hx);
    this.fighters.forEach((f, i) => {
      const dir = i === 0 ? 1 : -1;
      const pc = i === 0 ? COL.p1 : COL.p2;
      f.shownHp = approach(f.shownHp, f.hp, 40 / 60);
      const W = 330, H = 26, S = 10, y = 22;
      const x = i === 0 ? 92 - hx : GAME_W - 92 - W + hx;
      this.portraits[i].x = side(i, 50); this.whoTags[i].x = side(i, 50);
      this.names[i].x = side(i, 100); this.powerLabels[i].x = side(i, 40);
      this.superReady[i].x = side(i, 352);
      if (this.comboRows[i]) this.comboRows[i].x = side(i, 312);
      // Marco
      skewPanel(g, x - 7, y - 6, W + 14, H + 12, S, COL.ink, 1, pc, 2, 0.9);
      skewPanel(g, x, y, W, H, S, 0x3a0d1e, 1);
      skewFill(g, x, y, W, H, S, f.shownHp / 100, dir, 0xffffff, 0.85);
      const hpc = f.hp > 50 ? 0x3ee07a : f.hp > 25 ? 0xffc93c : 0xff4d5e;
      skewFill(g, x, y, W, H, S, f.hp / 100, dir, hpc, 1);
      skewFill(g, x, y, W, H * 0.32, S * 0.32, f.hp / 100, dir, 0xffffff, 0.28);
      if (f.hp <= 25 && f.hp > 0 && Math.floor(t / 200) % 2 === 0) skewFill(g, x, y, W, H, S, f.hp / 100, dir, 0xffffff, 0.25);
      // Retrato
      const px = side(i, 50);
      g.fillStyle(COL.ink, 1); g.fillCircle(px, 46, 38);
      g.fillStyle(f.colors.suit, 1); g.fillCircle(px, 46, 33);
      g.lineStyle(4, pc, 1); g.strokeCircle(px, 46, 37);
      g.fillStyle(pc, 1); g.fillRoundedRect(px - 20, 84, 40, 17, 8);
      // Rounds ganados (diamantes)
      for (let r = 0; r < 2; r++) {
        const cx = side(i, 400 - r * 26), cy = 66;
        g.fillStyle(COL.ink, 1); g.fillPoints([{ x: cx, y: cy - 11 }, { x: cx + 11, y: cy }, { x: cx, y: cy + 11 }, { x: cx - 11, y: cy }], true);
        g.fillStyle(r < f.wins ? COL.gold : 0x3a2d5c, 1); g.fillPoints([{ x: cx, y: cy - 7 }, { x: cx + 7, y: cy }, { x: cx, y: cy + 7 }, { x: cx - 7, y: cy }], true);
      }
      // Barra de poder
      const PW = 270, PH = 16, PS = 7, py = 506;
      const ppx = i === 0 ? 40 - hx : GAME_W - 40 - PW + hx;
      const full = f.power >= 100;
      skewPanel(g, ppx - 5, py - 5, PW + 10, PH + 10, PS, COL.ink, 0.95, full ? COL.gold : 0xffffff, 2, full ? 1 : 0.25);
      skewPanel(g, ppx, py, PW, PH, PS, 0x2a1f45, 1);
      const pcol = full ? (Math.floor(t / 110) % 2 === 0 ? 0xffffff : COL.gold) : f.colors.accent;
      skewFill(g, ppx, py, PW, PH, PS, f.power / 100, dir, pcol, 1);
      skewFill(g, ppx, py, PW, PH * 0.35, PS * 0.35, f.power / 100, dir, 0xffffff, 0.3);
      for (let k = 1; k < 4; k++) { g.lineStyle(2, COL.ink, 0.7); const sx = ppx + PW * k / 4; g.lineBetween(sx + PS, py, sx - PS, py + PH); }
      const lab = this.powerLabels[i];
      lab.setText(full ? '¡SÚPER LISTO!' : 'PODER').setColor(full ? '#ffd23f' : '#c9c2e8');
      const sr = this.superReady[i];
      sr.setVisible(full && !f.ko);
      if (full) sr.setScale(1 + Math.sin(t / 90) * 0.08);
      this.refreshCombo(i);
    });
    // Reloj
    const cx = GAME_W / 2;
    const hex = (r) => Array.from({ length: 6 }, (_, k) => ({ x: cx + Math.cos(k * Math.PI / 3) * r, y: 40 + Math.sin(k * Math.PI / 3) * r * 0.92 }));
    g.fillStyle(COL.ink, 1); g.fillPoints(hex(44), true);
    g.lineStyle(3, COL.gold, 1); g.strokePoints(hex(44), true);
    g.lineStyle(1, 0xffffff, 0.25); g.strokePoints(hex(37), true);
    const tl = Math.ceil(this.timeLeft);
    if (this.timerText.text !== String(tl)) this.timerText.setText(String(tl));
    this.timerText.setColor(this.timeLeft < 10 ? '#ff4d5e' : '#ffffff');
  }

  togglePause() {
    if (this.net) { this.netEsc(); return; }
    if (this.phase === 'end') { fadeTo(this, 'select', { mode: this.cfg.mode }); return; }
    if (this.freezeT > 0) return;
    this.paused = !this.paused;
    this.pauseBox.setVisible(this.paused);
  }

  startRound() {
    this.round++;
    this.f1.reset(250); this.f2.reset(GAME_W - 250);
    this.projectiles = [];
    this.timeLeft = 60;
    this.phase = 'intro';
    this.phaseT = 0;
    this.saidFight = false;
    const final = this.f1.wins === 1 && this.f2.wins === 1;
    this.roundText.setText(final ? 'ROUND FINAL' : 'ROUND ' + this.round);
    this.announce(final ? 'ROUND FINAL' : 'ROUND ' + this.round, GRAD.white);
    Sfx.bell();
  }

  announce(text, grad = GRAD.gold, flash = false) {
    this.tweens.killTweensOf([this.bigText, this.band]);
    setTitle(this.bigText, text, grad);
    this.bigText.setScale(2.4).setAlpha(0);
    this.band.setAlpha(1).setScale(1, 0);
    this.tweens.add({ targets: this.band, scaleY: 1, duration: 180, ease: 'Cubic.Out' });
    this.tweens.add({ targets: this.bigText, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    if (flash) this.cameras.main.flash(160, 255, 255, 255);
  }

  hideAnnounce() {
    this.tweens.add({ targets: [this.bigText, this.band], alpha: 0, duration: 250 });
  }

  // ---------- Efectos ----------
  addTrauma(a) { this.trauma = Math.min(1, this.trauma + a); }

  spark(x, y, color, n = 8, speed = 300) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.25, max: 0.5, color, size: 2 + Math.random() * 3, grav: 400 });
    }
  }

  dust(x, n = 6, y = GROUND) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 120, life: 0.4 + Math.random() * 0.3, max: 0.7, color: 0xb8a8d8, size: 4 + Math.random() * 5, grav: 100 });
    }
  }

  popText(f, text, color = '#ffffff', size = 26) {
    const t = titleText(this, f.x, f.y - 165, text, size, { color, strokeW: 5 });
    this.popLayer.add(t);
    t.setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, delay: 600, duration: 450, onComplete: () => t.destroy() });
  }

  damageNumber(x, y, dmg) {
    const t = titleText(this, x + (Math.random() - 0.5) * 30, y, '' + Math.round(dmg), 28, { gradient: GRAD.gold, strokeW: 5 });
    this.popLayer.add(t);
    t.setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 120 });
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  superFreeze(f) {
    this.freezeT = 0.8;
    Sfx.super();
    const g = this.superG; g.clear();
    const acc = f.colors.accent;
    skewPanel(g, BIG.x, 108, BIG.w, 104, 40, COL.ink, 0.85);
    skewPanel(g, BIG.x, 120, BIG.w, 80, 34, acc, 0.9);
    g.fillStyle(0xffffff, 0.25); g.fillPoints(skewPts(BIG.x, 120, BIG.w, 18, 34), true);
    g.lineStyle(2, 0xffffff, 0.15);
    for (let x = -700; x < 1700; x += 24) g.lineBetween(x + 30, 122, x - 10, 198);
    this.superWho.setText(f.def.name + '  USA SU SÚPER').setY(102);
    setTitle(this.superName, f.def.superMove.name.toUpperCase() + '!', GRAD.gold);
    this.superBox.setVisible(true).setAlpha(1);
    this.superBox.x = f.side === 0 ? -2000 : 2000;
    this.tweens.killTweensOf(this.superBox);
    this.tweens.add({ targets: this.superBox, x: 0, duration: 220, ease: 'Cubic.Out' });
    this.tweens.add({ targets: this.superBox, alpha: 0, delay: 1000, duration: 300, onComplete: () => this.superBox.setVisible(false) });
    this.spark(f.x, f.y - 70, acc, 30, 420);
    this.addTrauma(0.3);
  }

  spawnProjectile(owner, p) {
    const facing = owner.facing;
    const proj = Object.assign({ owner, t: 0, x: owner.x + facing * 42, vy: 0, facing, hitsDone: 0 }, p);
    if (!p.absolute) proj.vx = p.vx * facing;
    this.projectiles.push(proj);
    return proj;
  }

  opponentOf(f) { return f === this.f1 ? this.f2 : this.f1; }

  // ---------- Golpes ----------
  applyHit(att, def, info, srcX) {
    if (def.ko) return false;
    if (def.move && def.move.invuln) return false;
    const dir = Math.sign(def.x - srcX) || att.facing;
    const blocked = !info.unblockable && def.blocking;
    const hb = def.hurtbox();
    const hx = def.x - dir * 14, hy = hb.y + 40;
    if (blocked) {
      const chip = (def.def.blockChip === 0 && def.hasShield) ? 0 : 0.15;
      const dmg = info.dmg * chip;
      def.hp = Math.max(1, def.hp - dmg);
      def.vx = dir * 180;
      def.power = Math.min(100, def.power + 3);
      Sfx.block();
      this.spark(hx, hy, 0x7fe9ff, 10, 260);
      this.hitstop = Math.max(this.hitstop, 0.04);
      this.addTrauma(0.1);
      return true;
    }
    def.hp -= info.dmg;
    def.flashT = 0.1;
    def.move = null;
    def.hurtT = info.stun || 0.3;
    const stuckKb = def.stuckT > 0 ? 0.25 : 1;
    def.vx = dir * (info.kb || 0) * stuckKb;
    if (info.kbY && def.stuckT <= 0) { def.vy = -info.kbY; def.onGround = false; }
    if (info.stuckT) { def.stuckT = Math.max(def.stuckT, info.stuckT); def.vx = 0; }
    if (!info.isSuper) att.power = Math.min(100, att.power + info.dmg * 1.6);
    def.power = Math.min(100, def.power + info.dmg * 1.0);
    const s = info.sfx || 'punch';
    if (Sfx[s]) Sfx[s]();
    this.spark(hx, hy, 0xffe14d, info.isSuper ? 14 : 10);
    this.spark(hx, hy, 0xffffff, 5, 200);
    this.damageNumber(def.x, hb.y - 10, info.dmg);
    this.hitstop = Math.max(this.hitstop, info.hitstop || 0.05);
    this.addTrauma(info.trauma || 0.2);
    if (def.hp <= 0) this.knockOut(att, def, dir);
    return true;
  }

  knockOut(att, def, dir) {
    def.hp = 0;
    def.ko = true;
    def.move = null;
    def.stuckT = 0;
    def.vy = -520;
    def.vx = dir * 340;
    def.onGround = false;
    this.hitstop = 0.3;
    this.addTrauma(1);
    Sfx.ko();
    if (this.phase === 'fight') {
      this.phase = 'ko';
      this.phaseT = 0;
      this.slowmo = 0.3;
      this.announce('K.O.', GRAD.red, true);
    }
  }

  boxesOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  checkMoveHits(att, def) {
    const m = att.move;
    if (!m || !m.windows) return;
    for (const w of m.windows) {
      if (m.t < w.from || m.t > w.to) continue;
      if (w.every ? (m.t - w.lastHit < w.every) : w.hits > 0) continue;
      const b = w.box;
      const box = { x: att.facing > 0 ? att.x + b.x : att.x - b.x - b.w, y: att.y - b.y - b.h, w: b.w, h: b.h };
      if (this.boxesOverlap(box, def.hurtbox())) {
        if (this.applyHit(att, def, w, att.x)) { w.lastHit = m.t; w.hits++; }
      }
    }
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.t += dt; p.life -= dt;
      if (p.boomerang) {
        if (!p.returning && p.t > 0.5) p.returning = true;
        if (p.returning) {
          const o = p.owner;
          const dx = o.x - p.x, dy = (o.y - 86) - p.y;
          const L = Math.sqrt(dx * dx + dy * dy) || 1;
          p.vx = approach(p.vx, (dx / L) * 760, 3000 * dt);
          p.vy = approach(p.vy, (dy / L) * 760, 3000 * dt);
          if (L < 36 || o.ko) { p.dead = true; o.hasShield = true; Sfx.block(); }
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'wave' && Math.random() < 0.6) this.dust(p.x, 1);
      if (p.x < ARENA.l - 100 || p.x > ARENA.r + 100 || p.life <= 0) p.dead = true;
      if (p.dead) continue;
      const target = this.opponentOf(p.owner);
      const canHit = p.boomerang ? (p.returning ? p.hitsDone < 2 && p.hitPhase !== 'back' : p.hitsDone < 1) : true;
      if (!canHit) continue;
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (this.boxesOverlap(box, target.hurtbox())) {
        const ok = this.applyHit(p.owner, target, p.hit, p.x - Math.sign(p.vx) * 10);
        if (ok) {
          p.hitsDone++;
          if (p.boomerang) { p.hitPhase = p.returning ? 'back' : 'out'; p.returning = true; }
          else p.dead = true;
        }
      }
    }
    if (this.projectiles.some((p) => p.dead && p.boomerang && !p.owner.hasShield)) {
      for (const p of this.projectiles) if (p.dead && p.boomerang) p.owner.hasShield = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ---------- Bucle principal ----------
  // El dibujo va a la velocidad de la pantalla; la pelea avanza siempre en pasos fijos
  // de 1/60 s (así dos computadoras calculan exactamente lo mismo en el modo online).
  update(time, delta) {
    const realDt = Math.min(delta / 1000, 0.1);
    this.stage.update(time);
    this.updateShake(realDt);
    this.updateParticles(realDt);
    if (this.net) this.netTick(realDt);
    else this.localTick(realDt);
    this.dim.setFillStyle(0x000000, this.freezeT > 0 ? 0.5 : 0);
    this.render();
  }

  localTick(realDt) {
    if (this.paused) {
      if (this.tapQ) fadeTo(this, 'menu');
      this.tapQ = false; this.tapEnter = false;
      return;
    }
    if (this.phase === 'end' && this.phaseT > 1.2) {
      const again = this.tapEnter || this.c1.held.punch || (this.c2 && this.c2.held.punch);
      if (again) fadeTo(this, 'fight', this.cfg);
      if (this.tapQ) fadeTo(this, 'menu');
    }
    this.tapQ = false; this.tapEnter = false;
    this.acc = Math.min(this.acc + realDt, 0.25);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      const i1 = this.c1.update();
      const i2 = this.c2 ? this.c2.update() : null;
      const ai = this.ai && this.phase === 'fight' && this.freezeT <= 0 && this.hitstop <= 0 ? this.ai.getIntent(STEP * this.slowmo, this.f1, this) : null;
      this.simStep(i1, this.ai ? ai : i2);
    }
  }

  // ---------- Online ----------
  setupNet() {
    const g = this.cfg.fightId;
    if (!Net.inputs.has(g)) Net.inputs.set(g, new Map());
    this.remoteIn = Net.inputs.get(g);
    this.localIn = new Map();
    for (let f = 0; f < INPUT_DELAY; f++) { this.localIn.set(f, 0); if (!this.remoteIn.has(f)) this.remoteIn.set(f, 0); }
    this.nextLocal = INPUT_DELAY;
    this.stallT = 0;
    this.mySums = new Map();
    this.wantAgain = false;
    this.escT = 0;
    this.netMsg = uiText(this, GAME_W / 2, 118, '', 18, '#ffffff', { ox: 0.5, shadow: true }).setDepth(22);
    this.pingLabel = uiText(this, GAME_W / 2, 100, '', 12, '#c9c2e8', { ox: 0.5 }).setDepth(6);
  }

  netEsc() {
    if (this.phase === 'end' || this.netOver) { Net.leave(); fadeTo(this, 'menu'); return; }
    if (this.escT > 0) { Net.leave(); fadeTo(this, 'menu'); return; }
    this.escT = 2;
  }

  netTick(realDt) {
    const g = this.cfg.fightId;
    if (this.netOver) {
      if (this.tapEnter) fadeTo(this, 'menu');
      this.tapEnter = false;
      return;
    }
    if (Net.rival.left || Net.status === 'error') { this.netGone(Net.status === 'error' ? 'lost' : 'left'); return; }

    this.acc = Math.min(this.acc + realDt, 0.2);
    let stepped = 0;
    while (this.acc >= STEP && stepped < 5) {
      // Mis teclas para dentro de INPUT_DELAY cuadros: se guardan y se mandan al rival
      while (this.nextLocal <= this.frame + INPUT_DELAY) {
        const b = encodeIntent(this.c1.update());
        this.localIn.set(this.nextLocal, b);
        Net.send({ t: 'in', g, f: this.nextLocal, b });
        this.nextLocal++;
      }
      const rb = this.remoteIn.get(this.frame);
      if (rb === undefined) break; // todavía no llegaron las teclas del rival para este cuadro
      const lb = this.localIn.get(this.frame);
      const a = decodeIntent(this.me === 0 ? lb : rb), b2 = decodeIntent(this.me === 0 ? rb : lb);
      this.localIn.delete(this.frame - 30); this.remoteIn.delete(this.frame - 30);
      this.simStep(a, b2);
      this.acc -= STEP; stepped++;
      if (this.frame % 120 === 0) {
        const h = fightHash(this);
        this.mySums.set(this.frame, h);
        Net.send({ t: 'sum', g, f: this.frame, h });
      }
    }
    if (stepped === 0 && this.acc >= STEP) { this.stallT += realDt; this.acc = Math.min(this.acc, STEP * 2); } else if (stepped > 0) this.stallT = 0;

    // Control de que las dos computadoras ven lo mismo
    for (const [f, h] of this.mySums) {
      const other = Net.sums.get(g + ':' + f);
      if (other === undefined) continue;
      if (other !== h && !this.desync) { this.desync = true; console.warn('Online: desincronización en el cuadro', f); }
      this.mySums.delete(f);
    }

    // Revancha: los dos tienen que aceptar
    if (this.phase === 'end' && this.phaseT > 1.2) {
      if (!this.wantAgain && (this.tapEnter || this.c1.held.punch)) {
        this.wantAgain = true;
        Net.send({ t: 'again', g });
        Sfx.confirm();
      }
      if (this.wantAgain && Net.rival.again) fadeTo(this, 'fight', { ...this.cfg, fightId: Net.newFight() });
    }
    this.tapEnter = false; this.tapQ = false;

    this.escT = Math.max(0, this.escT - realDt);
    let msg = '';
    if (this.stallT > 0.4) msg = 'Esperando al rival…';
    if (this.stallT > 15) { this.netGone('lost'); return; }
    if (this.escT > 0) msg = 'Apretá ESC otra vez para abandonar';
    if (this.phase === 'end') msg = this.wantAgain ? (Net.rival.again ? '' : 'Esperando que tu rival acepte la revancha…') : (Net.rival.again ? '¡Tu rival quiere la revancha!' : '');
    if (this.netMsg.text !== msg) this.netMsg.setText(msg);
    this.pingLabel.setText(Net.ping ? 'PING ' + Net.ping + ' ms' + (this.desync ? '  ⚠' : '') : '');
  }

  netGone(why) {
    if (this.netOver) return;
    this.netOver = true;
    Net.close();
    const box = this.add.container(0, 0).setDepth(40);
    const g = this.add.graphics();
    g.fillStyle(0x05020f, 0.7); g.fillRect(BIG.x, BIG.y, BIG.w, BIG.h);
    skewPanel(g, 200, 190, 560, 150, 14, COL.ink, 0.97, COL.red, 3, 1);
    box.add([g, titleText(this, 480, 236, why === 'left' ? 'TU RIVAL SE FUE' : 'SE CORTÓ LA CONEXIÓN', 44, { gradient: GRAD.red }),
      keyRow(this, 480, 300, [{ k: 'ENTER' }, { t: 'Volver al menú' }], { size: 26, fontSize: 17, align: 'center' })]);
  }

  // Un paso de la pelea. Todo lo que pasa acá tiene que ser igual en las dos computadoras.
  simStep(i1, i2) {
    this.frame++;
    if (this.freezeT > 0) { this.freezeT -= STEP; return; }
    if (this.hitstop > 0) { this.hitstop -= STEP; return; }

    const dt = STEP * this.slowmo;
    this.phaseT += STEP;
    this.updatePhase(STEP);

    const fighting = this.phase === 'fight';
    this.f1.update(dt, fighting ? i1 : null, this.f2, this);
    this.f2.update(dt, fighting ? i2 : null, this.f1, this);

    for (const f of this.fighters) {
      const o = this.opponentOf(f);
      if (!f.move && !f.ko && f.hurtT <= 0 && !f.victory) f.facing = o.x >= f.x ? 1 : -1;
    }
    this.separate();
    if (fighting || this.phase === 'ko') {
      this.checkMoveHits(this.f1, this.f2);
      this.checkMoveHits(this.f2, this.f1);
      this.updateProjectiles(dt);
    }
  }

  separate() {
    const a = this.f1, b = this.f2;
    if (a.ko || b.ko) return;
    const dx = b.x - a.x;
    if (Math.abs(dx) < 46 && Math.abs(a.y - b.y) < 110) {
      const push = (46 - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= push * s; b.x += push * s;
      const L = ARENA.l + 34, R = ARENA.r - 34;
      a.x = clamp(a.x, L, R); b.x = clamp(b.x, L, R);
      if (Math.abs(b.x - a.x) < 46) {
        if (a.x <= L || a.x >= R) b.x = a.x + 46 * s; else a.x = b.x - 46 * s;
      }
    }
  }

  updatePhase(dt) {
    if (this.phase === 'intro') {
      if (this.phaseT > 1.3 && !this.saidFight) { this.saidFight = true; this.announce('¡A PELEAR!', GRAD.fire); Sfx.confirm(); }
      if (this.phaseT > 2.0) { this.phase = 'fight'; this.phaseT = 0; this.hideAnnounce(); }
    } else if (this.phase === 'fight') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.phase = 'ko'; this.phaseT = 0;
        this.announce('¡TIEMPO!', GRAD.white);
      }
    } else if (this.phase === 'ko') {
      if (this.phaseT > 1.0) this.slowmo = 1;
      if (this.phaseT > 3.0) this.finishRound();
    }
  }

  finishRound() {
    const a = this.f1, b = this.f2;
    let winner = null;
    if (a.ko && !b.ko) winner = b;
    else if (b.ko && !a.ko) winner = a;
    else if (!a.ko && !b.ko) winner = a.hp > b.hp ? a : b.hp > a.hp ? b : null;
    if (winner) winner.wins++;
    if (winner && winner.wins >= 2) { this.showEnd(winner); return; }
    if (this.round >= 5 && !winner) { a.wins = 1; b.wins = 1; }
    this.startRound();
  }

  showEnd(winner) {
    this.phase = 'end';
    this.phaseT = 0;
    winner.victory = true;
    const isP1 = winner === this.f1;
    const who = this.net ? (winner === this.fighters[this.me] ? '¡GANASTE! SOS' : 'TU RIVAL ES') : isP1 ? 'EL JUGADOR 1 ES' : (this.ai ? 'LA MÁQUINA ES' : 'EL JUGADOR 2 ES');
    this.tweens.killTweensOf([this.bigText, this.band]);
    this.bigText.setAlpha(0); this.band.setAlpha(0);
    const E = this.endBox; E.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(0x05020f, 0.55); g.fillRect(BIG.x, BIG.y, BIG.w, BIG.h);
    skewPanel(g, BIG.x, 140, BIG.w, 200, 40, COL.ink, 0.92);
    skewPanel(g, BIG.x, 150, BIG.w, 8, 3, isP1 ? COL.p1 : COL.p2, 1);
    skewPanel(g, BIG.x, 322, BIG.w, 8, 3, isP1 ? COL.p1 : COL.p2, 1);
    const head = this.add.graphics({ x: 150, y: 240 }).setScale(3.2);
    drawHeadIcon(head, winner.def, winner.colors);
    const ring = this.add.graphics();
    ring.fillStyle(isP1 ? COL.p1 : COL.p2, 1); ring.fillCircle(150, 240, 62);
    ring.fillStyle(winner.colors.suit, 1); ring.fillCircle(150, 240, 55);
    const title = titleText(this, 560, 212, '¡GANA ' + winner.def.name + '!', 72, { gradient: isP1 ? GRAD.gold : GRAD.ice, strokeW: 10 });
    const sub = uiText(this, 560, 268, who.toUpperCase() + ' EL CAMPEÓN', 22, '#ffffff', { ox: 0.5, shadow: true });
    const again = this.cfg.mode === '2p' ? [{ k: 'F' }, { t: 'o' }, { k: 'ENTER' }] : [{ k: 'ENTER' }, { t: 'o' }, { k: 'A' }];
    const rest = this.net ? [{ gap: 20 }, { k: 'ESC' }, { t: 'Salir' }] : [{ gap: 20 }, { k: 'ESC' }, { t: 'Elegir héroes' }, { gap: 20 }, { k: 'Q' }, { t: 'Menú' }];
    const keys = keyRow(this, 560, 304, [...again, { t: 'Revancha' }, ...rest], { size: 26, fontSize: 17, align: 'center' });
    E.add([g, ring, head, title, sub, keys]);
    E.setVisible(true).setAlpha(0);
    title.setScale(2);
    this.tweens.add({ targets: E, alpha: 1, duration: 300 });
    this.tweens.add({ targets: title, scale: 1, duration: 350, ease: 'Back.Out' });
    this.cameras.main.flash(200, 255, 255, 255);
    Sfx.win();
    for (let i = 0; i < 40; i++) this.time.delayedCall(i * 40, () => sparkle(this, VIEW.l + Math.random() * (VIEW.r - VIEW.l), 120 + Math.random() * 260, Math.random() < 0.5 ? COL.gold : 0xffffff, 26));
  }

  // ---------- Dibujo ----------
  updateShake(dt) {
    this.trauma = Math.max(0, this.trauma - 1.4 * dt);
    this.shakeT += dt * 30;
    const s = this.trauma * this.trauma;
    this.world.x = 14 * s * Math.sin(this.shakeT * 1.7);
    this.world.y = 9 * s * Math.sin(this.shakeT * 2.3);
  }

  updateParticles(dt) {
    if (this.freezeT > 0 || this.paused) return;
    for (const p of this.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  render() {
    const sg = this.shadowG; sg.clear();
    for (const f of this.fighters) {
      const h = GROUND - f.y;
      const s = Math.max(0.35, 1 - h / 350);
      sg.fillStyle(0x000000, 0.4 * s); sg.fillEllipse(f.x, GROUND + 5, 76 * s, 15 * s);
    }
    const g = this.fighterG; g.clear();
    const order = this.f1.move && !this.f2.move ? [this.f2, this.f1] : [this.f1, this.f2];
    for (const f of order) f.draw(g, this);

    const fx = this.fxG; fx.clear();
    for (const p of this.projectiles) this.drawProjectile(fx, p);
    for (const p of this.particles) {
      fx.fillStyle(p.color, Math.max(0, p.life / p.max));
      fx.fillCircle(p.x, p.y, p.size);
    }
    this.drawHud();
  }

  drawProjectile(g, p) {
    const o = p.owner;
    switch (p.kind) {
      case 'web': {
        g.lineStyle(2, 0xffffff, 0.5); g.lineBetween(p.x - Math.sign(p.vx) * 40, p.y, p.x, p.y);
        g.fillStyle(0xffffff, 0.95); g.fillCircle(p.x, p.y, 9);
        g.lineStyle(2, 0xffffff, 0.9);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p.t * 6; g.lineBetween(p.x, p.y, p.x + Math.cos(a) * 17, p.y + Math.sin(a) * 17); }
        break;
      }
      case 'bigweb': {
        const r = 45, rot = p.t * 3;
        g.lineStyle(3, 0xffffff, 0.95);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + rot; g.lineBetween(p.x, p.y, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
        for (let k = 1; k <= 3; k++) {
          const pts = [];
          for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4 + rot; pts.push({ x: p.x + Math.cos(a) * r * k / 3, y: p.y + Math.sin(a) * r * k / 3 }); }
          g.strokePoints(pts, false);
        }
        break;
      }
      case 'blast': {
        const c = o.colors.accent;
        g.fillStyle(c, 0.3); g.fillCircle(p.x, p.y, 24 + Math.sin(p.t * 40) * 3);
        g.fillStyle(c, 0.8); g.fillCircle(p.x, p.y, 15);
        g.fillStyle(0xffffff, 1); g.fillCircle(p.x, p.y, 8);
        g.fillStyle(c, 0.35); g.fillCircle(p.x - Math.sign(p.vx) * 22, p.y, 9);
        break;
      }
      case 'shield':
        drawShield(g, p.x, p.y, 22, o, (c) => c, 1, p.t * 18);
        break;
      case 'wave': {
        const c = o.colors.accent;
        const dir = Math.sign(p.vx);
        for (let i = 0; i < 3; i++) {
          g.lineStyle(6 - i * 2, i === 0 ? 0xffffff : c, 0.9 - i * 0.25);
          g.beginPath();
          g.arc(p.x - dir * i * 14, GROUND, 30 + i * 8, dir > 0 ? -Math.PI / 2 : Math.PI, dir > 0 ? 0 : -Math.PI / 2, false);
          g.strokePath();
        }
        break;
      }
      default: break;
    }
  }

}

