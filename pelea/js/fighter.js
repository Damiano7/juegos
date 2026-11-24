// Núcleo de cada luchador: movimiento, ataques, poses y dibujo.
const GAME_W = 960;
const GAME_H = 540;
const GROUND = 470;
const GRAVITY = 2000;
const STEP = 1 / 60; // la pelea avanza en pasos fijos de 1/60 de segundo
// Límites de la arena: se ensanchan si la ventana es más ancha (ver fitCamera).
const ARENA = { l: 0, r: 960 };

const THIGH = 31, SHIN = 31, TORSO = 44, UPPER = 25, FORE = 24, HEAD_R = 16;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

function shade(color, f) {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
  const b = Math.min(255, Math.round((color & 255) * f));
  return (r << 16) | (g << 8) | b;
}

function drawLimb(g, a, b, w, color) {
  g.lineStyle(w, color, 1);
  g.lineBetween(a.x, a.y, b.x, b.y);
  g.fillStyle(color, 1);
  g.fillCircle(a.x, a.y, w / 2);
  g.fillCircle(b.x, b.y, w / 2);
}

// Extensión (0..1) de un golpe según el tiempo del movimiento.
function extension(t, a, b, dur) {
  if (t < a) return easeOut(t / a);
  if (t < b) return 1;
  return Math.max(0, 1 - (t - b) / Math.max(0.01, dur - b));
}

class Fighter {
  constructor(def, side, palette) {
    this.def = def;
    this.side = side; // 0 = jugador 1 (izquierda), 1 = jugador 2
    this.colors = palette || def.colors;
    this.wins = 0;
    this.power = 0;
    this.reset(side === 0 ? 250 : GAME_W - 250);
  }

  reset(x) {
    this.x = x;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = 100;
    this.shownHp = 100;
    this.onGround = true;
    this.jumpsLeft = this.def.jumps;
    this.fuel = this.def.fuel || 0;
    this.move = null;
    this.hurtT = 0;
    this.stuckT = 0;
    this.flashT = 0;
    this.comboCd = 0;
    this.buffer = [];
    this.blocking = false;
    this.jetting = false;
    this.ko = false;
    this.victory = false;
    this.hasShield = true;
    this.regenAcc = 0;
    this.animT = this.side * 1.3;
    this.clock = 0;
    this.superWasReady = this.power >= 100;
  }

  get busy() { return !!this.move; }
  get canAct() { return !this.ko && this.hurtT <= 0 && this.stuckT <= 0; }

  hurtbox() {
    const low = this.blocking || (this.move && this.move.pose === 'slamDown');
    const h = this.ko ? 40 : low ? 92 : 135;
    return { x: this.x - 24, y: this.y - h, w: 48, h };
  }

  update(dt, intent, opp, scene) {
    this.animT += dt;
    this.clock += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.comboCd = Math.max(0, this.comboCd - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.stuckT = Math.max(0, this.stuckT - dt);
    this.blocking = false;
    this.jetting = false;

    if (this.def.regen && !this.ko && this.hp < 100) {
      this.regenAcc += dt;
      if (this.regenAcc >= this.def.regen) { this.regenAcc = 0; this.hp = Math.min(100, this.hp + 1); }
    }

    if (this.move) {
      this.updateMove(dt, scene, opp);
    } else if (this.canAct && intent) {
      this.handleInput(dt, intent, opp, scene);
    }

    // Física
    const noGrav = this.move && this.move.noGravity;
    if (!noGrav) this.vy += GRAVITY * dt;
    if (this.jetting) this.vy = Math.max(this.vy - 4200 * dt, -360);
    this.y += this.vy * dt;
    if (this.y >= GROUND) {
      if (!this.onGround && this.vy > 300) scene.dust(this.x, 4);
      this.y = GROUND;
      this.vy = 0;
      this.onGround = true;
      this.jumpsLeft = this.def.jumps;
      this.fuel = this.def.fuel || 0;
    } else {
      this.onGround = false;
    }

    if (this.stuckT > 0) this.vx = 0;
    if ((this.onGround && (!this.move || !this.move.keepVx) && (this.hurtT > 0 || this.ko || this.move)) ) {
      this.vx = approach(this.vx, 0, 1700 * dt);
    }
    this.x += this.vx * dt;
    this.x = clamp(this.x, ARENA.l + 34, ARENA.r - 34);

    // Super listo
    if (this.power >= 100 && !this.superWasReady && !this.ko) { Sfx.ready(); scene.popText(this, '¡SÚPER LISTO!', '#ffe14d'); }
    this.superWasReady = this.power >= 100;
  }

  pushBuffer(token) {
    this.buffer.push({ token, t: this.clock });
    if (this.buffer.length > 8) this.buffer.shift();
  }

  matchCombo() {
    const seq = this.def.combo.seq;
    const buf = this.buffer.filter((e) => this.clock - e.t < 1.0);
    if (buf.length < seq.length) return false;
    const tail = buf.slice(buf.length - seq.length);
    for (let i = 0; i < seq.length; i++) if (tail[i].token !== seq[i]) return false;
    return true;
  }

  handleInput(dt, intent, opp, scene) {
    const h = intent.held, p = intent.pressed;
    if (p.left) this.pushBuffer(this.facing < 0 ? 'fwd' : 'back');
    if (p.right) this.pushBuffer(this.facing > 0 ? 'fwd' : 'back');
    if (p.down) this.pushBuffer('down');
    if (p.punch) this.pushBuffer('punch');
    if (p.kick) this.pushBuffer('kick');

    if (p.special && this.power >= 100) { this.startSuper(scene, opp); return; }
    if (p.punch || p.kick) {
      if (this.comboCd <= 0 && this.matchCombo()) { this.buffer = []; if (this.startCombo(scene, opp)) return; }
      if (!this.onGround) this.startMove(this.def.moves.air(this, scene), scene);
      else if (p.punch) this.startMove(this.def.moves.punch(this, scene), scene);
      else this.startMove(this.def.moves.kick(this, scene), scene);
      return;
    }

    if (p.up) {
      if (this.onGround) {
        this.vy = -this.def.jump; this.onGround = false; this.jumpsLeft = this.def.jumps - 1; Sfx.jump();
      } else if (this.jumpsLeft > 0) {
        this.vy = -this.def.jump * 0.9; this.jumpsLeft--; Sfx.jump(); scene.dust(this.x, 3, this.y);
      }
    }
    if (this.def.fuel && !this.onGround && h.up && this.fuel > 0 && this.vy > -200) {
      this.jetting = true; this.fuel -= dt;
      if (Math.random() < 0.3) Sfx.jet();
    }

    const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    if (h.down && this.onGround) {
      this.blocking = true;
      this.vx = 0;
    } else {
      this.vx = dir * this.def.speed * (this.onGround ? 1 : 0.9);
    }
  }

  startCombo(scene, opp) {
    const m = this.def.moves.combo(this, scene, opp);
    if (!m) return false;
    this.comboCd = 1.2;
    this.startMove(m, scene);
    let name = this.def.combo.name;
    if (this.def.combo.copies) name = opp && opp.def.id !== this.def.id ? 'Copia: ' + opp.def.combo.name : 'Destello';
    scene.popText(this, '¡' + name.toUpperCase() + '!', '#ffffff');
    return true;
  }

  startSuper(scene, opp) {
    this.power = 0;
    const m = this.def.moves.super(this, scene, opp);
    m.isSuper = true;
    this.startMove(m, scene);
    scene.superFreeze(this);
  }

  startMove(m, scene) {
    m.t = 0;
    for (const w of m.windows || []) { w.lastHit = -99; w.hits = 0; }
    this.move = m;
    if (m.start) m.start(this, scene);
  }

  updateMove(dt, scene, opp) {
    const m = this.move;
    m.t += dt;
    if (m.update) m.update(this, scene, dt, opp);
    if (m.stopOnLand && this.onGround && m.t > 0.05) m.done = true;
    if (m.done || (m.dur && m.t >= m.dur)) {
      if (m.end) m.end(this, scene);
      this.move = null;
    }
  }

  // ---------- Poses ----------
  pose() {
    const t = this.animT;
    const m = this.move;
    const guardF = [0.75, 1.95], guardB = [0.45, 1.95];
    let P = { lean: 0.08, fa: guardF, ba: guardB, fl: [0.32, -0.32], bl: [-0.26, -0.16], rot: 0, head: 0 };
    const bob = Math.sin(t * 4) * 0.05;

    if (this.ko) {
      P = { lean: -0.2, fa: [2.2, 0.4], ba: [2.6, 0.3], fl: [0.4, -0.2], bl: [0.1, -0.5], rot: -1.5, head: -0.2 };
      if (!this.onGround) P.rot = -0.9;
      return P;
    }
    if (this.victory) {
      return { lean: 0.02, fa: [2.95, 0.15 + Math.sin(t * 6) * 0.15], ba: [0.5, 1.9], fl: [0.35, -0.1], bl: [-0.35, -0.1], rot: 0, head: -0.1 };
    }
    if (this.stuckT > 0) {
      return { lean: -0.1, fa: [0.25, 0.2], ba: [-0.2, 0.2], fl: [0.12, -0.05], bl: [-0.12, -0.05], rot: 0, head: Math.sin(t * 20) * 0.05 };
    }
    if (this.hurtT > 0) {
      return { lean: -0.45, fa: [0.6, 0.6], ba: [-0.5, 0.8], fl: [0.35, -0.4], bl: [-0.15, -0.3], rot: 0, head: -0.3 };
    }
    if (m) {
      const mt = m.t;
      switch (m.pose) {
        case 'punch': case 'bash': {
          const e = extension(mt, 0.08, 0.16, m.dur);
          return { lean: lerp(0.08, 0.28, e), fa: [lerp(0.75, 1.62, e), lerp(1.95, 0.05, e)], ba: guardB, fl: [0.45, -0.3], bl: [-0.35, -0.1], rot: 0, head: 0 };
        }
        case 'kick': {
          const e = extension(mt, 0.15, 0.26, m.dur);
          return { lean: lerp(0.08, -0.35, e), fa: [lerp(0.75, 0.2, e), 1.6], ba: [lerp(0.45, -0.6, e), 1.2], fl: [lerp(0.3, 1.7, e), lerp(-0.5, 0, e)], bl: [-0.15, -0.05], rot: 0, head: 0 };
        }
        case 'airkick':
          return { lean: -0.25, fa: [1.0, 1.4], ba: [-0.4, 1.4], fl: [1.35, -0.05], bl: [0.4, -1.6], rot: 0, head: 0 };
        case 'slash': {
          const e = clamp(mt / 0.14, 0, 1);
          return { lean: lerp(-0.05, 0.3, e), fa: [lerp(2.7, 1.0, easeOut(e)), lerp(0.4, 0.1, e)], ba: guardB, fl: [0.5, -0.3], bl: [-0.4, -0.1], rot: 0, head: 0 };
        }
        case 'dash':
          return { lean: 0.55, fa: [1.65, 0.0], ba: [-0.9, 0.4], fl: [0.9, -0.6], bl: [-0.8, -0.4], rot: 0, head: 0.2 };
        case 'spin':
          return { lean: 0.0, fa: [1.57, 0.0], ba: [-1.57, 0.0], fl: [0.25, -0.1], bl: [-0.25, -0.1], rot: 0, head: 0, spin: true };
        case 'cast': {
          const e = extension(mt, 0.1, m.dur - 0.08, m.dur);
          return { lean: lerp(0.0, 0.2, e), fa: [lerp(0.9, 1.6, e), lerp(1.6, 0.0, e)], ba: [lerp(0.4, -0.3, e), 0.8], fl: [0.45, -0.3], bl: [-0.4, -0.1], rot: 0, head: 0 };
        }
        case 'beam':
          return { lean: -0.08, fa: [1.6, 0.0], ba: [1.5, 0.05], fl: [0.4, -0.25], bl: [-0.4, -0.15], rot: 0, head: 0 };
        case 'slamUp':
          return { lean: -0.1, fa: [2.9, 0.2], ba: [2.7, 0.3], fl: [0.8, -1.5], bl: [0.2, -1.3], rot: 0, head: -0.2 };
        case 'summon':
          return { lean: -0.12, fa: [2.95, 0.1 + Math.sin(mt * 20) * 0.05], ba: [0.7, 1.3], fl: [0.5, -0.2], bl: [-0.5, -0.2], rot: 0, head: -0.25 };
        case 'charge':
          return { lean: 0.3, fa: [-0.7, 1.3], ba: [1.0, 1.7], fl: [1.0, -1.6], bl: [-0.35, -1.1], rot: 0, head: 0.15 };
        case 'slamDown':
          return { lean: 0.5, fa: [1.0, 0.1], ba: [0.7, 0.3], fl: [1.3, -2.0], bl: [-0.2, -1.6], rot: 0, head: 0.2 };
        default: break;
      }
    }
    if (this.blocking) {
      return { lean: 0.22, fa: [1.25, 1.75], ba: [1.0, 1.95], fl: [1.15, -2.0], bl: [-0.05, -1.7], rot: 0, head: 0.1 };
    }
    if (!this.onGround) {
      if (this.vy < 0 || this.jetting) return { lean: 0.05, fa: [1.5, 0.7], ba: [1.1, 0.9], fl: [0.95, -1.7], bl: [0.25, -1.2], rot: 0, head: -0.1 };
      return { lean: 0.05, fa: [1.2, 1.0], ba: [0.9, 1.2], fl: [0.45, -0.7], bl: [-0.2, -0.5], rot: 0, head: 0 };
    }
    if (Math.abs(this.vx) > 10) {
      const s = Math.sin(t * 12);
      const fwd = Math.sign(this.vx) === this.facing ? 1 : -1;
      return { lean: 0.12 * fwd, fa: [0.8 + 0.15 * s, 1.9], ba: [0.5 - 0.15 * s, 1.9], fl: [0.1 + 0.5 * s, -0.35 - 0.45 * Math.max(0, -s)], bl: [0.1 - 0.5 * s, -0.35 - 0.45 * Math.max(0, s)], rot: 0, head: 0 };
    }
    P.lean += bob * 0.5;
    P.fl = [0.32, -0.32 - bob * 2];
    P.bl = [-0.26, -0.16 - bob * 2];
    return P;
  }

  joints() {
    const P = this.pose();
    let facing = this.facing;
    if (P.spin) facing = Math.sin(this.animT * 30) > 0 ? 1 : -1;
    const dir = (a) => ({ x: Math.sin(a), y: Math.cos(a) });
    const add = (p, d, l) => ({ x: p.x + d.x * l, y: p.y + d.y * l });
    const hip = { x: 0, y: 0 };
    const td = { x: Math.sin(P.lean), y: -Math.cos(P.lean) };
    const sh = add(hip, td, TORSO);
    const hd = { x: Math.sin(P.lean + P.head), y: -Math.cos(P.lean + P.head) };
    const head = add(sh, hd, HEAD_R + 5);
    const fe = add(sh, dir(P.fa[0] + P.lean), UPPER);
    const fh = add(fe, dir(P.fa[0] + P.fa[1] + P.lean), FORE);
    const be = add(sh, dir(P.ba[0] + P.lean), UPPER);
    const bh = add(be, dir(P.ba[0] + P.ba[1] + P.lean), FORE);
    const fk = add(hip, dir(P.fl[0]), THIGH);
    const ff = add(fk, dir(P.fl[0] + P.fl[1]), SHIN);
    const bk = add(hip, dir(P.bl[0]), THIGH);
    const bf = add(bk, dir(P.bl[0] + P.bl[1]), SHIN);
    const pts = { hip, sh, head, fe, fh, be, bh, fk, ff, bk, bf };

    if (P.rot) {
      const c = Math.cos(P.rot), s = Math.sin(P.rot);
      for (const k in pts) { const p = pts[k]; pts[k] = { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; }
    }
    // Apoyar en el piso: el punto más bajo toca el suelo.
    let baseY;
    if (this.onGround) {
      let maxY = -999;
      for (const k in pts) {
        const r = k === 'head' ? HEAD_R : (k === 'ff' || k === 'bf') ? 6 : 7;
        maxY = Math.max(maxY, pts[k].y + r);
      }
      baseY = this.y - maxY;
    } else {
      baseY = this.y - (THIGH + SHIN + 6);
    }
    const out = { facing, lean: P.lean, rot: P.rot || 0 };
    for (const k in pts) out[k] = { x: this.x + pts[k].x * facing, y: baseY + pts[k].y };
    return out;
  }

  ensureSprites(scene, g) {
    if (this.sprites && this.spritesScene === scene && this.spriteContainer && this.spriteContainer.scene) return;
    this.destroySprites();
    this.spritesScene = scene;
    this.sprites = {};

    const id = this.def.id;
    const container = scene.add.container(g ? g.x : 0, g ? g.y : 0);
    if (g) {
      container.setScale(g.scaleX, g.scaleY);
      const targetParent = g.parentContainer || (scene.world || null);
      if (targetParent) {
        if (targetParent.list && targetParent.list.includes(g)) {
          const idx = targetParent.list.indexOf(g);
          targetParent.addAt(container, idx + 1);
        } else {
          targetParent.add(container);
        }
      }
    } else if (scene.world) {
      scene.world.add(container);
    }
    this.spriteContainer = container;

    const defs = [
      { key: 'brazoB', tex: `${id}_brazo`, ox: 0.5, oy: 32 / 164, dark: true },
      { key: 'antebrazoB', tex: `${id}_antebrazo`, ox: 0.5, oy: 32 / 160, dark: true },
      { key: 'manoB', tex: `${id}_mano`, ox: 0.5, oy: 0.5, dark: true },
      { key: 'pieB', tex: `${id}_pie`, ox: 36 / 96, oy: 24 / 64, dark: true },
      { key: 'piernaB', tex: `${id}_pierna`, ox: 0.5, oy: 36 / 196, dark: true },
      { key: 'musloB', tex: `${id}_muslo`, ox: 0.5, oy: 36 / 196, dark: true },
      { key: 'torso', tex: `${id}_torso`, ox: 0.5, oy: 210 / 240, dark: false },
      { key: 'pieF', tex: `${id}_pie`, ox: 36 / 96, oy: 24 / 64, dark: false },
      { key: 'piernaF', tex: `${id}_pierna`, ox: 0.5, oy: 36 / 196, dark: false },
      { key: 'musloF', tex: `${id}_muslo`, ox: 0.5, oy: 36 / 196, dark: false },
      { key: 'cabeza', tex: `${id}_cabeza`, ox: 0.5, oy: 0.5, dark: false },
      { key: 'brazoF', tex: `${id}_brazo`, ox: 0.5, oy: 32 / 164, dark: false },
      { key: 'antebrazoF', tex: `${id}_antebrazo`, ox: 0.5, oy: 32 / 160, dark: false },
      { key: 'manoF', tex: `${id}_mano`, ox: 0.5, oy: 0.5, dark: false },
    ];

    for (const d of defs) {
      if (scene.textures && scene.textures.exists(d.tex)) {
        const s = scene.add.image(0, 0, d.tex);
        s.setOrigin(d.ox, d.oy);
        s.setVisible(false);
        s.isDark = d.dark;
        container.add(s);
        this.sprites[d.key] = s;
      }
    }
  }

  destroySprites() {
    if (this.spriteContainer) {
      if (this.spriteContainer.scene) this.spriteContainer.destroy();
      this.spriteContainer = null;
    }
    this.sprites = null;
    this.spritesScene = null;
    if (this.stuckSprite) {
      if (this.stuckSprite.scene) this.stuckSprite.destroy();
      this.stuckSprite = null;
    }
  }

  hideSprites() {
    if (this.spriteContainer) {
      this.spriteContainer.setVisible(false);
    }
    if (this.stuckSprite) this.stuckSprite.setVisible(false);
  }

  updateSprites(J, flash) {
    if (!this.sprites) return;
    const S = this.sprites;
    const facing = J.facing;
    const scaleX = 0.25 * facing;
    const scaleY = 0.25;

    const isAlt = this.colors === this.def.alt;
    const baseTint = isAlt ? 0x6644aa : 0xffffff;
    const darkTint = isAlt ? 0x442a77 : 0xa0a8b4;

    const angleBetween = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;

    const setPart = (sprite, pos, angle) => {
      if (!sprite) return;
      sprite.setVisible(true);
      sprite.setPosition(pos.x, pos.y);
      sprite.setRotation(angle);
      sprite.setScale(scaleX, scaleY);
      if (flash) {
        sprite.setTint(0xffffff);
      } else {
        sprite.setTint(sprite.isDark ? darkTint : baseTint);
      }
    };

    // Extremidades traseras
    setPart(S.brazoB, J.sh, angleBetween(J.sh, J.be));
    setPart(S.antebrazoB, J.be, angleBetween(J.be, J.bh));
    setPart(S.manoB, J.bh, angleBetween(J.be, J.bh));

    setPart(S.musloB, J.hip, angleBetween(J.hip, J.bk));
    setPart(S.piernaB, J.bk, angleBetween(J.bk, J.bf));
    setPart(S.pieB, J.bf, angleBetween(J.bk, J.bf) * 0.2);

    // Torso
    const rotTorso = Math.atan2(J.sh.y - J.hip.y, J.sh.x - J.hip.x) + Math.PI / 2;
    setPart(S.torso, J.hip, rotTorso);

    // Extremidades delanteras
    setPart(S.musloF, J.hip, angleBetween(J.hip, J.fk));
    setPart(S.piernaF, J.fk, angleBetween(J.fk, J.ff));
    setPart(S.pieF, J.ff, angleBetween(J.fk, J.ff) * 0.2);

    // Cabeza
    const P = this.pose();
    const rotHead = ((P.rot || 0) + J.lean + (P.head || 0)) * facing;
    setPart(S.cabeza, J.head, rotHead);

    setPart(S.brazoF, J.sh, angleBetween(J.sh, J.fe));
    setPart(S.antebrazoF, J.fe, angleBetween(J.fe, J.fh));
    setPart(S.manoF, J.fh, angleBetween(J.fe, J.fh));
  }

  draw(g, scene) {
    scene = scene || (g && g.scene);
    if (!scene) return;
    const J = this.joints();
    const flash = this.flashT > 0;
    const C = this.colors;
    const col = (c) => (flash ? 0xffffff : c);
    const suit = col(C.suit), dark = col(shade(C.suit, 0.65)), acc = col(C.accent), accDark = col(shade(C.accent, 0.7));

    const id = this.def.id;
    if (typeof initHeroTextures === 'function' && scene.textures && !scene.textures.exists(id + '_cabeza')) {
      initHeroTextures(scene);
    }
    const hasHeadSprite = scene.textures && scene.textures.exists(id + '_cabeza');

    if (hasHeadSprite) {
      this.ensureSprites(scene, g);
      if (this.spriteContainer && this.spriteContainer.scene) {
        const targetParent = (g && g.parentContainer) ? g.parentContainer : (scene.world || null);
        if (targetParent) {
          if (this.spriteContainer.parentContainer !== targetParent) {
            if (targetParent.list && targetParent.list.includes(g)) {
              const idx = targetParent.list.indexOf(g);
              targetParent.addAt(this.spriteContainer, idx + 1);
            } else {
              targetParent.add(this.spriteContainer);
            }
          }
        } else if (!targetParent && this.spriteContainer.parentContainer) {
          scene.children.add(this.spriteContainer);
        }

        this.spriteContainer.setPosition(g ? g.x || 0 : 0, g ? g.y || 0 : 0);
        this.spriteContainer.setScale(g ? g.scaleX || 1 : 1, g ? g.scaleY || 1 : 1);
        this.spriteContainer.setVisible(g ? g.visible !== false : true);
        this.spriteContainer.setAlpha(g && g.alpha !== undefined ? g.alpha : 1);
        if (!this.spriteContainer.parentContainer) {
          this.spriteContainer.setDepth((g && g.depth) ? g.depth : 0);
        }
      }
      this.updateSprites(J, flash);
      if (this.def.drawBack) this.def.drawBack(g, this, J, col);
      if (this.def.drawBackHand) this.def.drawBackHand(g, this, J, col);
      if (this.def.drawFront) this.def.drawFront(g, this, J, col);
    } else {
      this.hideSprites();
      if (this.def.drawBack) this.def.drawBack(g, this, J, col);
      // Pierna y brazo de atrás (más oscuros)
      drawLimb(g, J.hip, J.bk, 14, dark);
      drawLimb(g, J.bk, J.bf, 12, dark);
      g.fillStyle(accDark, 1); g.fillCircle(J.bf.x + 3 * J.facing, J.bf.y, 7);
      drawLimb(g, J.sh, J.be, 11, dark);
      drawLimb(g, J.be, J.bh, 10, dark);
      g.fillStyle(accDark, 1); g.fillCircle(J.bh.x, J.bh.y, 7);
      if (this.def.drawBackHand) this.def.drawBackHand(g, this, J, col);

      // Torso
      drawLimb(g, J.hip, J.sh, 28, suit);
      if (this.def.drawTorso) this.def.drawTorso(g, this, J, col);

      // Pierna de adelante
      drawLimb(g, J.hip, J.fk, 14, suit);
      drawLimb(g, J.fk, J.ff, 12, suit);
      g.fillStyle(acc, 1); g.fillCircle(J.ff.x + 3 * J.facing, J.ff.y, 7);

      // Cabeza
      g.fillStyle(col(C.head), 1);
      g.fillCircle(J.head.x, J.head.y, HEAD_R);
      if (this.def.drawHead) this.def.drawHead(g, this, J, col);

      // Brazo de adelante
      drawLimb(g, J.sh, J.fe, 11, suit);
      drawLimb(g, J.fe, J.fh, 10, suit);
      g.fillStyle(acc, 1); g.fillCircle(J.fh.x, J.fh.y, 7);
      if (this.def.drawFront) this.def.drawFront(g, this, J, col);
    }

    // Atrapado en telaraña
    if (this.stuckT > 0) {
      if (scene.textures && scene.textures.exists('aracnido_red_atrapado')) {
        if (!this.stuckSprite || this.stuckSprite.scene !== scene) {
          this.stuckSprite = scene.add.image(0, 0, 'aracnido_red_atrapado').setScale(0.25).setDepth((g.depth || 0) + 1);
          const targetParent = (g && g.parentContainer) ? g.parentContainer : (scene.world || null);
          if (targetParent) {
            targetParent.add(this.stuckSprite);
          }
        }
        const hb = this.hurtbox();
        this.stuckSprite.setVisible(true).setPosition(this.x, hb.y + hb.h / 2);
      } else {
        const hb = this.hurtbox();
        g.lineStyle(2, 0xffffff, 0.85);
        const cx = this.x, cy = hb.y + hb.h / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(cx, cy, cx + Math.cos(a) * 46, cy + Math.sin(a) * 74);
        }
        for (let r = 1; r <= 3; r++) {
          g.strokeEllipse(cx, cy, 30 * r, 48 * r);
        }
      }
    } else if (this.stuckSprite) {
      this.stuckSprite.setVisible(false);
    }
  }
}
