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
    this.ghostG = this.add.graphics().setAlpha(0.6);
    this.fighterG = this.add.graphics();
    this.fxG = this.add.graphics();
    this.popLayer = this.add.container(0, 0);
    this.world.add([this.shadowG, this.ghostG, this.fighterG, this.fxG, this.popLayer]);

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
    if (this.replaying && this.bigText.text === text) return;
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
  addTrauma(a) { if (!this.replaying) this.trauma = Math.min(1, this.trauma + a); }

  spark(x, y, color, n = 8, speed = 300) {
    if (this.replaying) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.25, max: 0.5, color, size: 2 + Math.random() * 3, grav: 400 });
    }
  }

  dust(x, n = 6, y = GROUND) {
    if (this.replaying) return;
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 120, life: 0.4 + Math.random() * 0.3, max: 0.7, color: 0xb8a8d8, size: 4 + Math.random() * 5, grav: 100 });
    }
  }

  popText(f, text, color = '#ffffff', size = 26) {
    if (this.replaying) return;
    const t = titleText(this, f.x, f.y - 165, text, size, { color, strokeW: 5 });
    this.popLayer.add(t);
    t.setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, delay: 600, duration: 450, onComplete: () => t.destroy() });
  }

  damageNumber(x, y, dmg) {
    if (this.replaying) return;
    const t = titleText(this, x + (Math.random() - 0.5) * 30, y, '' + Math.round(dmg), 28, { gradient: GRAD.gold, strokeW: 5 });
    this.popLayer.add(t);
    t.setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 120 });
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  superFreeze(f) {
    this.freezeT = 0.8;
    if (this.replaying) return;
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
    if (p.kind === 'clone') {
      const gh = new Fighter(owner.def, owner.side, owner.colors);
      gh.facing = facing; gh.onGround = true; gh.y = GROUND; gh.x = proj.x;
      proj.ghost = gh;
    }
    this.projectiles.push(proj);
    return proj;
  }

  // Meteoro de Obsidiana: cae en diagonal y explota al tocar el piso
  spawnMeteor(owner, tx, big) {
    const dir = tx >= owner.x ? 1 : -1;
    const vy = 1000, vx = 170 * dir, y0 = -260;
    const fall = (GROUND - (big ? 40 : 23) - y0) / vy;
    const tgt = clamp(tx, ARENA.l + 40, ARENA.r - 40);
    this.spawnProjectile(owner, { kind: 'meteor', absolute: true, big, x: tgt - vx * fall, y: y0, vx, vy, landX: tgt,
      w: big ? 80 : 46, h: big ? 80 : 46, life: 3,
      hit: { dmg: big ? 22 : 7, kb: big ? 380 : 180, kbY: big ? 520 : 200, stun: big ? 0.8 : 0.4, sfx: 'kick', unblockable: true, isSuper: true, trauma: big ? 0.8 : 0.35, hitstop: big ? 0.12 : 0.05 } });
  }

  explodeMeteor(p) {
    const target = this.opponentOf(p.owner);
    const R = p.big ? 120 : 70;
    if (!p.hitsDone && Math.abs(target.x - p.x) < R && target.y > GROUND - 150) this.applyHit(p.owner, target, p.hit, p.x);
    Sfx.boom();
    this.addTrauma(p.big ? 0.7 : 0.3);
    this.dust(p.x, p.big ? 18 : 8);
    this.spark(p.x, GROUND - 20, p.owner.colors.accent, p.big ? 24 : 10, 420);
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
      const dmg = info.dmg * chip * (def.def.armor || 1);
      def.hp = Math.max(1, def.hp - dmg);
      def.vx = dir * 180;
      def.power = Math.min(100, def.power + 3);
      Sfx.block();
      this.spark(hx, hy, 0x7fe9ff, 10, 260);
      this.hitstop = Math.max(this.hitstop, 0.04);
      this.addTrauma(0.1);
      return true;
    }
    const dmgTaken = info.dmg * (def.def.armor || 1);
    def.hp -= dmgTaken;
    def.flashT = 0.1;
    def.move = null;
    def.hurtT = info.stun || 0.3;
    const stuckKb = def.stuckT > 0 ? 0.25 : 1;
    def.vx = dir * (info.kb || 0) * stuckKb;
    if (info.kbY && def.stuckT <= 0) { def.vy = -info.kbY; def.onGround = false; }
    if (info.stuckT) { def.stuckT = Math.max(def.stuckT, info.stuckT); def.vx = 0; }
    if (!info.isSuper) att.power = Math.min(100, att.power + info.dmg * 1.6 * (att.def.powerMul || 1));
    def.power = Math.min(100, def.power + info.dmg * 1.0);
    const s = info.sfx || 'punch';
    if (Sfx[s]) Sfx[s]();
    this.spark(hx, hy, 0xffe14d, info.isSuper ? 14 : 10);
    this.spark(hx, hy, 0xffffff, 5, 200);
    this.damageNumber(def.x, hb.y - 10, dmgTaken);
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
      if (p.ghost) { p.ghost.x = p.x; p.ghost.vx = p.vx; p.ghost.animT += dt; }
      if (p.teleportAt && !p.teleported && p.t >= p.teleportAt) {
        // La esfera fantasma reaparece justo delante del rival
        const tg = this.opponentOf(p.owner);
        const d = tg.x >= p.owner.x ? 1 : -1;
        p.x = tg.x - d * 90; p.y = tg.y - 80; p.vx = d * 800; p.teleported = true;
        this.spark(p.x, p.y, p.owner.colors.accent, 14, 300);
      }
      if (p.kind === 'meteor' && p.y >= GROUND - p.h / 2) { p.dead = true; this.explodeMeteor(p); continue; }
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
          else {
            p.dead = true;
            if (p.kind === 'clone') this.dust(p.x, 8);
            if (p.kind === 'meteor') this.explodeMeteor(p);
          }
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
    if (this.net && delta > 100) { NetStats.hitches++; NetStats.hitchMax = Math.max(NetStats.hitchMax, delta); NetStats.event('trabon_pc', delta); }
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

  // ---------- Estado completo de la pelea (para el rollback) ----------
  snapshot() {
    return {
      frame: this.frame, phase: this.phase, phaseT: this.phaseT, saidFight: this.saidFight, timeLeft: this.timeLeft,
      round: this.round, freezeT: this.freezeT, hitstop: this.hitstop, slowmo: this.slowmo,
      f: this.fighters.map((f) => f.saveState()),
      proj: this.projectiles.map((p) => Object.assign({}, p)),
    };
  }

  loadSnap(s) {
    Object.assign(this, { frame: s.frame, phase: s.phase, phaseT: s.phaseT, saidFight: s.saidFight, timeLeft: s.timeLeft,
      round: s.round, freezeT: s.freezeT, hitstop: s.hitstop, slowmo: s.slowmo });
    this.fighters.forEach((f, i) => f.loadState(s.f[i]));
    this.projectiles = s.proj.map((p) => Object.assign({}, p));
  }

  // ---------- Online ----------
  setupNet() {
    const g = this.cfg.fightId;
    if (!Net.inputs.has(g)) Net.inputs.set(g, new Map());
    this.remoteIn = Net.inputs.get(g);
    this.localIn = new Map();
    this.D = Net.delay; // retraso acordado con el rival (el mayor de los dos)
    for (let f = 0; f < this.D; f++) { this.localIn.set(f, 0); if (!this.remoteIn.has(f)) this.remoteIn.set(f, 0); }
    this.nextLocal = this.D;
    this.stallStart = 0;
    this.snaps = new Map();      // cuadro -> estado guardado antes de calcularlo
    this.used = new Map();       // cuadro -> teclas del rival que se usaron (reales o adivinadas)
    this.confirmed = this.D - 1; // último cuadro con teclas reales del rival
    this.nextSum = 120;
    NetStats.lastIn = 0;
    this.startKeepAlive();
    this.netPanelOn = false;
    this.netPanelT = 0;
    this.netPanelG = this.add.graphics().setDepth(29).setVisible(false);
    this.netPanel = uiText(this, 0, 0, '', 14, '#ffffff', { oy: 0, lineSpacing: 3 }).setDepth(30).setVisible(false);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard.addKey(K.N).on('down', () => { this.netPanelOn = !this.netPanelOn; this.netPanelT = 0; });
    this.input.keyboard.addKey(K.L).on('down', () => downloadNetReport(this));
    this.stallT = 0;
    this.mySums = new Map();
    this.wantAgain = false;
    this.escT = 0;
    this.netMsg = uiText(this, GAME_W / 2, 118, '', 18, '#ffffff', { ox: 0.5, shadow: true }).setDepth(22);
    this.pingLabel = uiText(this, GAME_W / 2, 100, '', 12, '#c9c2e8', { ox: 0.5 }).setDepth(6);
  }

  // Calcula un cuadro con mis teclas y las del rival (reales si llegaron, si no, adivinadas)
  stepFrame() {
    const f = this.frame;
    this.snaps.set(f, this.snapshot());
    this.snaps.delete(f - ROLLBACK_MAX - 30);
    let rb = this.remoteIn.get(f);
    if (rb === undefined) rb = (this.remoteIn.get(this.confirmed) || 0) & 0x7f; // repite lo que mantenía apretado
    this.used.set(f, rb);
    this.used.delete(f - ROLLBACK_MAX - 30);
    this.localIn.delete(f - ROLLBACK_MAX - 30);
    const lb = this.localIn.get(f) || 0;
    this.simStep(decodeIntent(this.me === 0 ? lb : rb), decodeIntent(this.me === 0 ? rb : lb));
  }

  // Si la ventana queda oculta o minimizada, el juego sigue mandando teclas
  // (si no, el rival se queda esperando y la partida se corta)
  startKeepAlive() {
    try {
      const src = 'setInterval(() => postMessage(0), 16);';
      this.keepWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      let last = performance.now();
      this.keepWorker.onmessage = () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        if (document.hidden && !this.netOver && this.sys.isActive()) this.netTick(dt);
      };
      this.events.once('shutdown', () => { this.keepWorker.terminate(); });
    } catch (e) { /* sin worker: sigue igual que antes */ }
    this.onVis = () => Net.send({ t: 'chat', hidden: document.hidden });
    document.addEventListener('visibilitychange', this.onVis);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onVis));
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

    // 1) Teclas del rival recién llegadas: si adiviné mal algún cuadro, vuelvo atrás y recalculo
    let rollbackTo = -1;
    for (let f = this.confirmed + 1; this.remoteIn.has(f); f++) {
      const rb = this.remoteIn.get(f);
      if (f < this.frame && this.used.get(f) !== rb && rollbackTo < 0) rollbackTo = f;
      this.confirmed = f;
    }
    if (rollbackTo >= 0 && this.snaps.has(rollbackTo)) {
      const cur = this.frame;
      this.loadSnap(this.snaps.get(rollbackTo));
      this.replaying = true; SIM_SILENT = true;
      while (this.frame < cur) this.stepFrame();
      this.replaying = false; SIM_SILENT = false;
      NetStats.rollbacks = (NetStats.rollbacks || 0) + 1;
      NetStats.rollbackMax = Math.max(NetStats.rollbackMax || 0, cur - rollbackTo);
    }

    // 2) Avanzar en tiempo real, adivinando las teclas del rival que todavía no llegaron
    this.acc = Math.min(this.acc + realDt, 0.2);
    let stepped = 0;
    let waiting = false;
    while (this.acc >= STEP && stepped < 5) {
      // Mis teclas para dentro de D cuadros: se guardan y se mandan al rival
      while (this.nextLocal <= this.frame + this.D) {
        const b = encodeIntent(this.c1.update());
        this.localIn.set(this.nextLocal, b);
        Net.send({ t: 'in', g, f: this.nextLocal, b });
        this.nextLocal++;
      }
      // Si me adelanté demasiado sin confirmar, espero (pasa solo con cortes largos)
      if (this.frame - this.confirmed > ROLLBACK_MAX) { waiting = true; break; }
      this.stepFrame();
      this.acc -= STEP; stepped++;
    }

    // 3) Huella de los cuadros ya confirmados, para comparar con el rival
    while (this.nextSum - 1 <= this.confirmed && this.snaps.has(this.nextSum)) {
      const h = snapHash(this.snaps.get(this.nextSum));
      this.mySums.set(this.nextSum, h);
      Net.send({ t: 'sum', g, f: this.nextSum, h });
      this.nextSum += 120;
    }

    if (waiting) {
      this.stallT += realDt; this.acc = Math.min(this.acc, STEP * 2);
      if (!this.stallStart) { this.stallStart = performance.now(); this.stallFrame = this.frame; }
    } else if (stepped > 0) {
      this.stallT = 0;
      if (this.stallStart) {
        const ms = performance.now() - this.stallStart;
        if (ms > 50) {
          NetStats.stalls++; NetStats.stallTotal += ms; NetStats.stallMax = Math.max(NetStats.stallMax, ms);
          NetStats.event('pausa_por_lag', ms, { cuadro: this.stallFrame });
        }
        this.stallStart = 0;
      }
    }
    this.updateNetPanel(realDt);

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
    if (this.stallT > 0.4) msg = Net.rival.hidden ? 'Tu rival minimizó el juego… esperando' : 'Esperando al rival…';
    if (this.stallT > 30) { this.netGone('lost'); return; }
    if (this.escT > 0) msg = 'Apretá ESC otra vez para abandonar';
    if (this.phase === 'end') msg = this.wantAgain ? (Net.rival.again ? '' : 'Esperando que tu rival acepte la revancha…') : (Net.rival.again ? '¡Tu rival quiere la revancha!' : '');
    if (this.netMsg.text !== msg) this.netMsg.setText(msg);
    this.pingLabel.setText(Net.ping ? 'PING ' + Net.ping + ' ms' + (this.desync ? '  ⚠' : '') + '   ·   N: red' : '');
  }

  // Panel con las mediciones de red (tecla N)
  updateNetPanel(dt) {
    const on = this.netPanelOn;
    this.netPanel.setVisible(on); this.netPanelG.setVisible(on);
    if (!on) return;
    this.netPanelT -= dt;
    if (this.netPanelT > 0) return;
    this.netPanelT = 0.25;
    const S = NetStats, sp = S.window(S.srvPings, 10), rp = S.window(S.rivalPings, 10);
    const lines = [
      'RED   (N ocultar  ·  L descargar informe)',
      `Ping al servidor: ${Net.ping} ms   (máx 10 s: ${sp.max})`,
      `Ping al rival: ${rp.avg} ms   (máx 10 s: ${rp.max})`,
      `Retraso de teclas: ${this.D} cuadros (${Math.round(this.D * 1000 / 60)} ms)`,
      `Correcciones (rollback): ${S.rollbacks || 0}  ·  la más larga ${S.rollbackMax || 0} cuadros`,
      `Pausas por lag: ${S.stalls}  ·  total ${(S.stallTotal / 1000).toFixed(1)} s  ·  peor ${Math.round(S.stallMax)} ms`,
      `Huecos sin teclas del rival: ${S.gaps}  ·  peor ${Math.round(S.gapMax)} ms`,
      `FPS: esta PC ${Math.round(this.game.loop.actualFps)}  ·  rival ${S.rivalFps || '?'}`,
      `Trabones de esta PC: ${S.hitches}  ·  peor ${Math.round(S.hitchMax)} ms`,
    ];
    this.netPanel.setText(lines.join('\n'));
    const x = VIEW.l + 16, y = 116;
    this.netPanel.setPosition(x + 10, y + 8);
    const g = this.netPanelG; g.clear();
    g.fillStyle(0x05020f, 0.82); g.fillRoundedRect(x, y, this.netPanel.width + 20, this.netPanel.height + 16, 8);
    g.lineStyle(2, COL.p2, 0.8); g.strokeRoundedRect(x, y, this.netPanel.width + 20, this.netPanel.height + 16, 8);
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
    if (this.net) console.log('Informe de red:', netReport(this).resumen);
    this.phase = 'end';
    this.phaseT = 0;
    winner.victory = true;
    if (this.endShown) return;
    this.endShown = true;
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
    // Si un rollback deshizo el final de la pelea, se esconde el cartel
    if (this.endShown && this.phase !== 'end') { this.endShown = false; this.endBox.setVisible(false); }
    const sg = this.shadowG; sg.clear();
    for (const f of this.fighters) {
      const h = GROUND - f.y;
      const s = Math.max(0.35, 1 - h / 350);
      sg.fillStyle(0x000000, 0.4 * s); sg.fillEllipse(f.x, GROUND + 5, 76 * s, 15 * s);
    }
    const g = this.fighterG; g.clear();
    const order = this.f1.move && !this.f2.move ? [this.f2, this.f1] : [this.f1, this.f2];
    for (const f of order) f.draw(g, this);

    const gg = this.ghostG; gg.clear();
    for (const p of this.projectiles) if (p.ghost) p.ghost.draw(gg, this);
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
      case 'clone': {
        g.lineStyle(2, o.colors.accent, 0.5);
        for (let k = 0; k < 3; k++) g.lineBetween(p.x - Math.sign(p.vx) * (30 + k * 14), p.y - 30 + k * 25, p.x - Math.sign(p.vx) * (60 + k * 14), p.y - 30 + k * 25);
        break;
      }
      case 'shuriken': {
        const a = p.t * 30, c = o.colors.accent;
        const pts = [];
        for (let k = 0; k < 8; k++) { const r = k % 2 ? 5 : 15; pts.push({ x: p.x + Math.cos(a + k * Math.PI / 4) * r, y: p.y + Math.sin(a + k * Math.PI / 4) * r }); }
        g.fillStyle(0xdfe7ef, 1); g.fillPoints(pts, true);
        g.fillStyle(c, 1); g.fillCircle(p.x, p.y, 4);
        g.lineStyle(2, c, 0.9);
        for (let k = 0; k < 2; k++) { const b = Math.random() * 6.28; g.lineBetween(p.x, p.y, p.x + Math.cos(b) * 20, p.y + Math.sin(b) * 20); }
        break;
      }
      case 'ghostorb': {
        const c = o.colors.accent;
        if (p.t < 0.12 || p.teleported) {
          g.fillStyle(c, 0.3); g.fillCircle(p.x, p.y, 34 + Math.sin(p.t * 40) * 3);
          g.fillStyle(c, 0.85); g.fillCircle(p.x, p.y, 22);
          g.fillStyle(0xffffff, 1); g.fillCircle(p.x, p.y, 11);
          g.lineStyle(2, 0xffffff, 0.8);
          g.beginPath(); g.arc(p.x, p.y, 28, p.t * 15, p.t * 15 + 2.5, false); g.strokePath();
        } else {
          g.lineStyle(2, c, 0.18); g.strokeCircle(p.x, p.y, 22 + Math.sin(p.t * 50) * 4);
        }
        break;
      }
      case 'bolt': {
        const c = o.colors.accent, d = Math.sign(p.vx);
        g.lineStyle(5, c, 0.5); g.lineStyle(3, 0xffffff, 1);
        g.beginPath(); g.moveTo(p.x - d * 40, p.y);
        for (let k = 1; k <= 5; k++) g.lineTo(p.x - d * 40 + d * k * 10, p.y + (k % 2 ? -8 : 8));
        g.strokePath();
        g.fillStyle(c, 0.5); g.fillCircle(p.x, p.y, 12);
        break;
      }
      case 'fireball': {
        const c = o.colors.accent, fl = Math.sin(p.t * 30) * 3, d = Math.sign(p.vx);
        g.fillStyle(c, 0.25); g.fillCircle(p.x - d * 34, p.y, 22);
        g.fillStyle(c, 0.35); g.fillCircle(p.x, p.y, 40 + fl);
        g.fillStyle(c, 0.9); g.fillCircle(p.x, p.y, 30);
        g.fillStyle(0xffd23f, 1); g.fillCircle(p.x + d * 4, p.y, 19);
        g.fillStyle(0xfff6c4, 1); g.fillCircle(p.x + d * 7, p.y, 9);
        break;
      }
      case 'meteor': {
        const c = o.colors.accent, r = p.w / 2;
        const pulse = 0.4 + Math.sin(p.t * 25) * 0.25;
        g.fillStyle(0xff3d3d, pulse * 0.5); g.fillEllipse(p.landX, GROUND + 3, r * 3, 14);
        g.lineStyle(2, 0xff3d3d, pulse); g.strokeEllipse(p.landX, GROUND + 3, r * 3, 14);
        const tx = -Math.sign(p.vx) * 0.17, ty = -1;
        for (let k = 3; k >= 1; k--) { g.fillStyle(k === 1 ? 0xffd23f : c, 0.35 + 0.15 * (3 - k)); g.fillCircle(p.x + tx * r * k * 1.2, p.y + ty * r * k * 1.2, r * (1 - k * 0.18)); }
        g.fillStyle(0x3a2a2a, 1); g.fillCircle(p.x, p.y, r * 0.8);
        g.lineStyle(3, c, 1); g.strokeCircle(p.x, p.y, r * 0.8);
        g.fillStyle(c, 0.9); g.fillCircle(p.x - r * 0.25, p.y - r * 0.2, r * 0.15); g.fillCircle(p.x + r * 0.3, p.y + r * 0.1, r * 0.1);
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

