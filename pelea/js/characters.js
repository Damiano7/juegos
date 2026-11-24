// Los 4 héroes: datos, ataques, combos, súper y detalles de dibujo.

// ---------- Ataques básicos compartidos ----------
function mkPunch(opts = {}) {
  return {
    id: 'punch', pose: opts.pose || 'punch', dur: 0.3,
    windows: [{ from: 0.07, to: 0.16, box: { x: 6, y: 80, w: 52 + (opts.reach || 0), h: 28 },
      dmg: opts.dmg || 5, kb: 160, stun: 0.28, sfx: opts.sfx || 'punch', trauma: 0.22, hitstop: 0.05 }],
    start() { if (opts.sfx === 'slash') Sfx.slash(); else Sfx.whoosh(); },
  };
}
function mkKick(opts = {}) {
  return {
    id: 'kick', pose: 'kick', dur: 0.46,
    windows: [{ from: 0.14, to: 0.26, box: { x: 6, y: 34, w: 68 + (opts.reach || 0), h: 34 },
      dmg: opts.dmg || 8, kb: 300, stun: 0.36, sfx: 'kick', trauma: 0.35, hitstop: 0.07 }],
    start() { Sfx.whoosh(); },
  };
}
function mkAirKick() {
  return {
    id: 'airkick', pose: 'airkick', dur: 0.55, stopOnLand: true, keepVx: true,
    windows: [{ from: 0.05, to: 0.42, box: { x: 4, y: 8, w: 56, h: 48 },
      dmg: 7, kb: 240, stun: 0.32, sfx: 'kick', trauma: 0.3, hitstop: 0.06 }],
    start() { Sfx.whoosh(); },
  };
}
// Lanza un proyectil en el momento "at" del movimiento.
function castMove(at, dur, spawn, pose = 'cast') {
  return {
    id: 'cast', pose, dur, windows: [],
    update(f, s) {
      if (!this.spawned && this.t >= at) { this.spawned = true; spawn(f, s); }
      if (!f.onGround) f.vy = Math.min(f.vy, 60); // flota un poquito al lanzar en el aire
    },
  };
}

const CHARACTERS = [
  // ======================= ARÁCNIDO (SPIDER-MAN) =======================
  {
    id: 'aracnido', name: 'SPIDER-MAN', tagline: 'El superhéroe arácnido',
    colors: { suit: 0xc02026, accent: 0x1b4ed8, head: 0xc02026 },
    alt: { suit: 0x181820, accent: 0xffffff, head: 0x181820 },
    speed: 310, jump: 830, jumps: 2, stats: { VEL: 5, FUE: 2, DEF: 2, ESP: 4 },
    passive: 'Doble salto (tocá ↑ dos veces)',
    combo: { name: 'Disparo de Red', seq: ['down', 'fwd', 'punch'], label: '↓  →  GOLPE', desc: 'Pega al rival en el lugar' },
    superMove: { name: 'Red Gigante', desc: 'Una red enorme que lo deja atrapado' },
    moves: {
      punch: () => mkPunch({ dmg: 6 }),
      kick: () => mkKick({ dmg: 8 }),
      air: () => mkAirKick(),
      combo: () => castMove(0.1, 0.38, (f, s) => {
        Sfx.web();
        s.spawnProjectile(f, { kind: 'web', w: 30, h: 24, y: f.y - 88, vx: 640, life: 1.5,
          hit: { dmg: 7, kb: 0, stun: 0.2, stuckT: 1.5, sfx: 'web', trauma: 0.2, hitstop: 0.05 } });
      }),
      super: () => castMove(0.12, 0.6, (f, s) => {
        Sfx.web();
        s.spawnProjectile(f, { kind: 'bigweb', w: 86, h: 86, y: f.y - 75, vx: 780, life: 1.6,
          hit: { dmg: 18, kb: 0, stun: 0.2, stuckT: 2.4, sfx: 'web', unblockable: true, isSuper: true, trauma: 0.6, hitstop: 0.12 } });
      }),
    },
    drawTorso(g, f, J, col) {
      // Emblema de araña en el pecho
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      g.fillStyle(col(f.colors.accent), 1);
      g.fillCircle(cx, cy, 9);
      g.fillStyle(col(0x111111), 1);
      g.fillEllipse(cx, cy, 6, 9);
      g.lineStyle(2, col(0x111111), 1);
      for (const s of [-1, 1]) {
        g.lineBetween(cx, cy - 2, cx + 8 * s, cy - 7);
        g.lineBetween(cx, cy, cx + 9 * s, cy - 1);
        g.lineBetween(cx, cy + 1, cx + 9 * s, cy + 5);
        g.lineBetween(cx, cy + 3, cx + 7 * s, cy + 9);
      }
      // Líneas de red en la cintura
      g.lineStyle(2, col(f.colors.accent), 0.7);
      g.lineBetween(J.hip.x - 12, J.hip.y - 4, J.hip.x + 12, J.hip.y - 4);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing;
      const hx = J.head.x, hy = J.head.y;
      // Gran ojo de Spider-Man (borde negro y centro blanco)
      g.fillStyle(col(0x111111), 1);
      g.fillTriangle(hx + 1 * fx, hy + 4, hx + 15 * fx, hy - 4, hx + 13 * fx, hy + 7);
      g.fillStyle(col(0xffffff), 1);
      g.fillTriangle(hx + 3 * fx, hy + 3, hx + 13 * fx, hy - 2, hx + 12 * fx, hy + 5);
      g.lineStyle(1.5, col(0x111111), 0.8);
      g.strokeCircle(hx, hy, HEAD_R);
    },
  },

  // ======================= DOBLE FILO =======================
  {
    id: 'doblefilo', name: 'DOBLE FILO', tagline: 'Espadachín que se cura solo',
    colors: { suit: 0x4b5563, accent: 0xff8a1f, head: 0x3a414d },
    alt: { suit: 0x5b2c2c, accent: 0xffd23f, head: 0x4a2222 },
    speed: 285, jump: 770, jumps: 1, regen: 6, stats: { VEL: 4, FUE: 4, DEF: 2, ESP: 4 },
    passive: 'Se cura solo de a poquito',
    combo: { name: 'Corte Veloz', seq: ['fwd', 'fwd', 'punch'], label: '→  →  GOLPE', desc: 'Cruza la pantalla cortando' },
    superMove: { name: 'Tornado de Espadas', desc: 'Gira como un remolino de filos' },
    moves: {
      punch: () => mkPunch({ pose: 'slash', reach: 14, dmg: 6, sfx: 'slash' }),
      kick: () => mkKick(),
      air: () => mkAirKick(),
      combo: () => ({
        id: 'dash', pose: 'dash', dur: 0.42, noGravity: true, keepVx: true,
        windows: [{ from: 0.04, to: 0.3, box: { x: -10, y: 30, w: 90, h: 80 }, dmg: 8, kb: 340, stun: 0.45, sfx: 'slash', trauma: 0.45, hitstop: 0.08 }],
        start(f) { Sfx.slash(); f.vy = 0; },
        update(f, s) {
          f.vy = 0;
          f.vx = this.t < 0.3 ? f.facing * 760 : f.vx * 0.85;
          if (Math.random() < 0.6) s.spark(f.x - f.facing * 20, f.y - 70, f.colors.accent, 1);
        },
      }),
      super: () => ({
        id: 'tornado', pose: 'spin', dur: 1.5, invuln: true, keepVx: true,
        windows: [
          { from: 0.1, to: 1.3, every: 0.15, box: { x: -50, y: 0, w: 140, h: 130 }, dmg: 3, kb: 40, stun: 0.3, sfx: 'slash', unblockable: true, isSuper: true, trauma: 0.2, hitstop: 0.03 },
          { from: 1.32, to: 1.46, box: { x: -50, y: 0, w: 140, h: 130 }, dmg: 8, kb: 480, kbY: 420, stun: 0.7, sfx: 'kick', unblockable: true, isSuper: true, trauma: 0.7, hitstop: 0.12 },
        ],
        update(f, s) {
          f.vx = this.t < 1.3 ? f.facing * 300 : 0;
          if (Math.random() < 0.8) s.spark(f.x + (Math.random() - 0.5) * 120, f.y - 20 - Math.random() * 110, 0xdfe7ef, 1);
        },
      }),
    },
    drawBack(g, f, J, col) {
      // Cintas de la bandana flameando
      const fx = J.facing;
      const wave = Math.sin(f.animT * 10) * 5;
      g.lineStyle(5, col(f.colors.accent), 1);
      g.lineBetween(J.head.x - 10 * fx, J.head.y - 6, J.head.x - 30 * fx, J.head.y + wave);
      g.lineBetween(J.head.x - 10 * fx, J.head.y - 4, J.head.x - 26 * fx, J.head.y + 10 - wave);
      // Espadas en la espalda (si no las está usando)
      const m = f.move;
      if (!m || (m.pose !== 'slash' && m.pose !== 'dash' && m.pose !== 'spin')) {
        g.lineStyle(4, col(0xdfe7ef), 1);
        g.lineBetween(J.sh.x - 22 * fx, J.sh.y - 28, J.hip.x + 14 * fx, J.hip.y + 6);
        g.lineBetween(J.sh.x - 4 * fx, J.sh.y - 32, J.hip.x + 24 * fx, J.hip.y - 2);
        g.lineStyle(5, col(0x222222), 1);
        g.lineBetween(J.sh.x - 22 * fx, J.sh.y - 28, J.sh.x - 16 * fx, J.sh.y - 18);
        g.lineBetween(J.sh.x - 4 * fx, J.sh.y - 32, J.sh.x + 0 * fx, J.sh.y - 22);
      }
    },
    drawTorso(g, f, J, col) {
      // Cinturón y correa cruzada
      g.lineStyle(6, col(f.colors.accent), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
      g.lineStyle(4, col(0x2a2f38), 1);
      g.lineBetween(J.sh.x - 10 * J.facing, J.sh.y + 2, J.hip.x + 10 * J.facing, J.hip.y - 6);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing;
      g.fillStyle(col(f.colors.accent), 1);
      g.fillRect(J.head.x - HEAD_R, J.head.y - 9, HEAD_R * 2, 6); // bandana
      g.fillStyle(col(0xffffff), 1);
      g.fillTriangle(J.head.x + 2 * fx, J.head.y, J.head.x + 13 * fx, J.head.y - 1, J.head.x + 11 * fx, J.head.y + 4);
    },
    drawBackHand(g, f, J, col) {
      if (f.move && f.move.pose === 'spin') drawSword(g, J.be, J.bh, col);
    },
    drawFront(g, f, J, col) {
      const m = f.move;
      if (m && (m.pose === 'slash' || m.pose === 'dash' || m.pose === 'spin')) drawSword(g, J.fe, J.fh, col);
      if (m && m.pose === 'spin') {
        g.lineStyle(3, 0xffffff, 0.5);
        g.strokeEllipse(f.x, f.y - 70, 150, 50);
        g.strokeEllipse(f.x, f.y - 40, 130, 40);
      }
    },
  },

  // ======================= PROTÓN =======================
  {
    id: 'proton', name: 'PROTÓN', tagline: 'Armadura que vuela',
    colors: { suit: 0xb8c4d0, accent: 0x18d3c5, head: 0x9aa7b4 },
    alt: { suit: 0x3d3d46, accent: 0xb66dff, head: 0x2c2c33 },
    speed: 260, jump: 750, jumps: 1, fuel: 1.4, stats: { VEL: 2, FUE: 3, DEF: 3, ESP: 5 },
    passive: 'Vuela: mantené ↑ en el aire',
    combo: { name: 'Pulso de Energía', seq: ['down', 'fwd', 'kick'], label: '↓  →  PATADA', desc: 'Dispara una bola de energía' },
    superMove: { name: 'Rayo Protónico', desc: 'Un rayo láser que cruza toda la pantalla' },
    moves: {
      punch: () => mkPunch({ reach: 10, dmg: 6 }),
      kick: () => mkKick(),
      air: () => mkAirKick(),
      combo: () => castMove(0.12, 0.4, (f, s) => {
        Sfx.blast();
        s.spawnProjectile(f, { kind: 'blast', w: 36, h: 36, y: f.y - 84, vx: 720, life: 1.6,
          hit: { dmg: 12, kb: 280, stun: 0.45, sfx: 'kick', trauma: 0.35, hitstop: 0.06 } });
      }, 'beam'),
      super: () => ({
        id: 'laser', pose: 'beam', dur: 1.55, invuln: true, noGravity: true,
        windows: [
          { from: 0.32, to: 1.35, every: 0.12, box: { x: 40, y: 58, w: 1000, h: 50 }, dmg: 3, kb: 70, stun: 0.3, sfx: 'punch', unblockable: true, isSuper: true, trauma: 0.15, hitstop: 0.02 },
          { from: 1.36, to: 1.44, box: { x: 40, y: 58, w: 1000, h: 50 }, dmg: 6, kb: 420, kbY: 300, stun: 0.6, sfx: 'kick', unblockable: true, isSuper: true, trauma: 0.6, hitstop: 0.1 },
        ],
        start(f) { f.vy = 0; },
        update(f) {
          f.vy = 0; f.vx = 0;
          if (!this.sound && this.t > 0.3) { this.sound = true; Sfx.laser(); }
        },
      }),
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      // Núcleo hexagonal
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; pts.push({ x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 8 }); }
      g.fillStyle(col(0x2b3440), 1); g.fillCircle(cx, cy, 11);
      g.fillStyle(col(f.colors.accent), 0.95); g.fillPoints(pts, true);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(cx, cy, 3);
      // Hombreras
      g.fillStyle(col(shade(f.colors.suit, 1.15)), 1);
      g.fillCircle(J.sh.x, J.sh.y + 2, 13);
      // Placas
      g.lineStyle(2, col(shade(f.colors.suit, 0.7)), 1);
      g.lineBetween(J.hip.x - 12, J.hip.y - 10, J.hip.x + 12, J.hip.y - 10);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing;
      g.fillStyle(col(0x1d2530), 1);
      g.fillRect(J.head.x - 2 * fx - (fx < 0 ? 16 : 0), J.head.y - 6, 16, 8);
      g.fillStyle(col(f.colors.accent), 1);
      g.fillRect(J.head.x - (fx < 0 ? 15 : -1), J.head.y - 4, 14, 4);
      g.fillStyle(col(shade(f.colors.suit, 1.2)), 1);
      g.fillTriangle(J.head.x - 6, J.head.y - HEAD_R + 1, J.head.x + 6, J.head.y - HEAD_R + 1, J.head.x, J.head.y - HEAD_R - 6);
    },
    drawFront(g, f, J, col) {
      // Fuego de los propulsores
      if (f.jetting || (!f.onGround && f.move && f.move.id === 'laser')) {
        for (const foot of [J.ff, J.bf]) {
          const len = 18 + Math.random() * 14;
          g.fillStyle(0xffb020, 0.9); g.fillTriangle(foot.x - 6, foot.y + 4, foot.x + 6, foot.y + 4, foot.x, foot.y + 4 + len);
          g.fillStyle(0xffffff, 0.9); g.fillTriangle(foot.x - 3, foot.y + 4, foot.x + 3, foot.y + 4, foot.x, foot.y + 4 + len * 0.5);
        }
      }
      // Rayo del súper
      const m = f.move;
      if (m && m.id === 'laser') {
        const hx = (J.fh.x + J.bh.x) / 2, hy = (J.fh.y + J.bh.y) / 2;
        if (m.t < 0.32) {
          const r = 6 + m.t * 60;
          g.fillStyle(f.colors.accent, 0.4); g.fillCircle(hx, hy, r);
          g.fillStyle(0xffffff, 0.9); g.fillCircle(hx, hy, r * 0.45);
        } else if (m.t < 1.45) {
          const endX = f.facing > 0 ? VIEW.r + 40 : VIEW.l - 40;
          const wob = Math.sin(m.t * 60) * 4;
          const y = f.y - 83;
          g.fillStyle(f.colors.accent, 0.35); g.fillRect(Math.min(hx, endX), y - 30 - wob, Math.abs(endX - hx), 60 + wob * 2);
          g.fillStyle(f.colors.accent, 0.8); g.fillRect(Math.min(hx, endX), y - 17, Math.abs(endX - hx), 34);
          g.fillStyle(0xffffff, 1); g.fillRect(Math.min(hx, endX), y - 7, Math.abs(endX - hx), 14);
          g.fillStyle(0xffffff, 0.9); g.fillCircle(hx, y, 22 + wob);
        }
      }
    },
  },

  // ======================= CENTINELA =======================
  {
    id: 'centinela', name: 'CENTINELA', tagline: 'Defensor del escudo',
    colors: { suit: 0x2f6b3a, accent: 0xc98b2b, head: 0xc98b2b },
    alt: { suit: 0x6b2f5c, accent: 0xb9c3cc, head: 0xb9c3cc },
    speed: 245, jump: 740, jumps: 1, blockChip: 0, stats: { VEL: 2, FUE: 3, DEF: 5, ESP: 4 },
    passive: 'Con escudo, bloquear no le quita vida',
    combo: { name: 'Escudo Bumerán', seq: ['back', 'fwd', 'punch'], label: '←  →  GOLPE', desc: 'Tira el escudo y vuelve' },
    superMove: { name: 'Golpe Sísmico', desc: 'Salta y hace temblar el piso' },
    moves: {
      punch: (f) => (f.hasShield ? mkPunch({ pose: 'bash', dmg: 6, reach: 8 }) : mkPunch()),
      kick: () => mkKick(),
      air: () => mkAirKick(),
      combo: (f) => {
        if (!f.hasShield) return null;
        return castMove(0.1, 0.36, (f2, s) => {
          Sfx.shield();
          f2.hasShield = false;
          s.spawnProjectile(f2, { kind: 'shield', w: 44, h: 44, y: f2.y - 86, vx: 680, life: 3, boomerang: true,
            hit: { dmg: 8, kb: 260, stun: 0.4, sfx: 'block', trauma: 0.35, hitstop: 0.06 } });
        });
      },
      super: (f, s, opp) => ({
        id: 'slam', pose: 'slamUp', dur: 3, invuln: true, keepVx: true,
        start(f2) {
          f2.vy = -900; f2.onGround = false;
          f2.vx = clamp((opp.x - f2.x) * 1.0, -440, 440);
        },
        update(f2, s2) {
          if (!this.landedAt && this.t > 0.1 && f2.onGround) {
            this.landedAt = this.t;
            this.pose = 'slamDown';
            f2.vx = 0;
            Sfx.boom();
            s2.addTrauma(0.8);
            s2.dust(f2.x, 16);
            for (const dir of [-1, 1]) {
              s2.spawnProjectile(f2, { kind: 'wave', w: 54, h: 50, y: GROUND - 25, vx: 760 * dir * f2.facing, absolute: true, life: 1.4, x: f2.x + dir * 30,
                hit: { dmg: 22, kb: 300, kbY: 560, stun: 0.8, sfx: 'kick', unblockable: true, isSuper: true, trauma: 0.7, hitstop: 0.12 } });
            }
          }
          if (this.landedAt && this.t > this.landedAt + 0.4) this.done = true;
        },
      }),
    },
    drawHead(g, f, J, col) {
      const fx = J.facing;
      // Casco con cresta
      g.fillStyle(col(0xb03030), 1);
      g.fillEllipse(J.head.x - 2 * fx, J.head.y - HEAD_R - 2, 26, 10);
      g.fillStyle(col(0x1b1b1b), 1);
      g.fillRect(J.head.x + (fx > 0 ? 1 : -13), J.head.y - 4, 12, 5);
      g.fillRect(J.head.x + (fx > 0 ? 3 : -6), J.head.y - 2, 3, 14);
    },
    drawTorso(g, f, J, col) {
      g.lineStyle(6, col(f.colors.accent), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      g.fillStyle(col(f.colors.accent), 1);
      g.fillTriangle(cx - 8, cy - 6, cx + 8, cy - 6, cx, cy + 8);
    },
    drawFront(g, f, J, col) {
      if (!f.hasShield) return;
      const m = f.move;
      let cx = lerp(J.fe.x, J.fh.x, 0.6) + 8 * J.facing, cy = lerp(J.fe.y, J.fh.y, 0.6);
      if (m && m.pose === 'slamUp') { cx = J.fh.x; cy = J.fh.y - 10; }
      drawShield(g, cx, cy, 24, f, col, f.blocking ? 1 : 0.92);
    },
  },
  // ======================= REMOLINO (ninja de los clones) =======================
  {
    id: 'remolino', name: 'REMOLINO', tagline: 'Ninja de los clones',
    colors: { suit: 0x1f5fbf, accent: 0xffb31a, head: 0xe8b98a, hair: 0x14306b },
    alt: { suit: 0x2e7d32, accent: 0xff7043, head: 0xe8b98a, hair: 0x1b3d1d },
    speed: 290, jump: 790, jumps: 1, powerMul: 1.5, stats: { VEL: 3, FUE: 3, DEF: 3, ESP: 5 },
    passive: 'Energía enorme: llena el súper más rápido',
    combo: { name: 'Clones de Sombra', seq: ['down', 'down', 'punch'], desc: 'Dos copias suyas corren a pegar' },
    superMove: { name: 'Esfera Espiral', desc: 'Una esfera de viento que gira y arrastra al rival' },
    moves: {
      punch: () => mkPunch(),
      kick: () => mkKick(),
      air: () => mkAirKick(),
      combo: () => ({
        id: 'clones', pose: 'cast', dur: 0.42, windows: [],
        update(f, s) {
          const clone = () => {
            Sfx.whoosh();
            s.dust(f.x, 5);
            s.spawnProjectile(f, { kind: 'clone', w: 40, h: 110, y: f.y - 60, x: f.x - f.facing * 10, vx: 560, life: 0.9,
              hit: { dmg: 6, kb: 200, stun: 0.4, sfx: 'punch', trauma: 0.25, hitstop: 0.05 } });
          };
          if (!this.a && this.t >= 0.06) { this.a = true; clone(); }
          if (!this.b && this.t >= 0.2) { this.b = true; clone(); }
        },
      }),
      super: () => ({
        id: 'espiral', pose: 'cast', dur: 1.3, invuln: true, keepVx: true,
        windows: [
          { from: 0.45, to: 0.95, every: 0.09, box: { x: 10, y: 50, w: 80, h: 70 }, dmg: 3, kb: 60, stun: 0.3, sfx: 'punch', unblockable: true, isSuper: true, trauma: 0.2, hitstop: 0.02 },
          { from: 0.97, to: 1.05, box: { x: 10, y: 40, w: 95, h: 90 }, dmg: 12, kb: 560, kbY: 420, stun: 0.7, sfx: 'kick', unblockable: true, isSuper: true, trauma: 0.8, hitstop: 0.14 },
        ],
        start() { Sfx.blast(); },
        update(f) {
          if (this.t < 0.42) f.vx = 0;
          else if (this.t < 1.0) { this.pose = 'dash'; f.vx = f.facing * 520; }
          else { this.pose = 'cast'; f.vx = 0; }
        },
      }),
    },
    drawBack(g, f, J, col) {
      // Bufanda larga que flamea
      const fx = J.facing, w = Math.sin(f.animT * 9) * 6;
      g.lineStyle(7, col(f.colors.accent), 1);
      g.lineBetween(J.sh.x - 4 * fx, J.sh.y - 4, J.sh.x - 34 * fx, J.sh.y + 6 + w);
      g.lineStyle(6, col(shade(f.colors.accent, 0.8)), 1);
      g.lineBetween(J.sh.x - 30 * fx, J.sh.y + 6 + w, J.sh.x - 52 * fx, J.sh.y + 16 - w);
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.6), cy = lerp(J.hip.y, J.sh.y, 0.6);
      g.fillStyle(col(f.colors.accent), 1);
      g.fillPoints([{ x: cx, y: cy - 9 }, { x: cx + 7, y: cy }, { x: cx, y: cy + 9 }, { x: cx - 7, y: cy }], true);
      g.lineStyle(6, col(f.colors.accent), 1);
      g.lineBetween(J.sh.x - 12, J.sh.y + 4, J.sh.x + 12, J.sh.y + 4); // cuello de la bufanda
      g.lineStyle(5, col(0x1a1a1a), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing, hx = J.head.x, hy = J.head.y;
      // Pelo en mechones
      g.fillStyle(col(f.colors.hair), 1);
      g.fillTriangle(hx - 15 * fx, hy - 2, hx - 4 * fx, hy - 16, hx - 26 * fx, hy - 14);
      g.fillTriangle(hx - 8 * fx, hy - 10, hx + 6 * fx, hy - 17, hx - 6 * fx, hy - 26);
      g.fillTriangle(hx + 2 * fx, hy - 12, hx + 15 * fx, hy - 9, hx + 10 * fx, hy - 22);
      g.fillStyle(col(f.colors.hair), 1); g.fillRect(hx - 15, hy - 14, 30, 6);
      // Ojo decidido
      g.fillStyle(col(0xffffff), 1); g.fillEllipse(hx + 8 * fx, hy - 1, 7, 5);
      g.fillStyle(col(0x14306b), 1); g.fillCircle(hx + 9 * fx, hy - 1, 2);
      g.lineStyle(2, col(0x3a2010), 1); g.lineBetween(hx + 3 * fx, hy - 6, hx + 12 * fx, hy - 5);
    },
    drawFront(g, f, J) {
      const m = f.move;
      if (!m || m.id !== 'espiral') return;
      const r = m.t < 0.42 ? 6 + m.t * 52 : 28;
      const hx = J.fh.x + J.facing * (r * 0.6), hy = J.fh.y;
      g.fillStyle(0xbfe9ff, 0.25); g.fillCircle(hx, hy, r + 10);
      g.fillStyle(0xe6f7ff, 0.8); g.fillCircle(hx, hy, r);
      g.fillStyle(0xffffff, 1); g.fillCircle(hx, hy, r * 0.45);
      g.lineStyle(3, 0x7fd0ff, 0.9);
      for (let k = 0; k < 3; k++) {
        const a = m.t * 22 + k * 2.1;
        g.beginPath(); g.arc(hx, hy, r * (0.55 + k * 0.17), a, a + 2.2, false); g.strokePath();
      }
    },
  },

  // ======================= CENTELLA (ninja eléctrico) =======================
  {
    id: 'centella', name: 'CENTELLA', tagline: 'Ninja rayo, el más rápido',
    colors: { suit: 0x2b2d42, accent: 0xff3fa4, head: 0xe8b98a, hair: 0xf2f2f2 },
    alt: { suit: 0x4a3216, accent: 0x5fe3ff, head: 0xe8b98a, hair: 0xffe08a },
    speed: 330, jump: 820, jumps: 1, stats: { VEL: 5, FUE: 3, DEF: 2, ESP: 4 },
    passive: 'El más rápido: corre como un rayo',
    combo: { name: 'Shuriken Eléctrico', seq: ['fwd', 'fwd', 'kick'], desc: 'Dos estrellas que paralizan un ratito' },
    superMove: { name: 'Esfera Fantasma', desc: 'Desaparece y reaparece delante del rival' },
    moves: {
      punch: () => mkPunch(),
      kick: () => mkKick({ dmg: 8 }),
      air: () => mkAirKick(),
      combo: () => ({
        id: 'shurikens', pose: 'cast', dur: 0.4, windows: [],
        update(f, s) {
          const star = (y) => {
            Sfx.slash();
            s.spawnProjectile(f, { kind: 'shuriken', w: 28, h: 28, y: f.y - y, vx: 900, life: 1.2,
              hit: { dmg: 7, kb: 90, stun: 0.8, sfx: 'zap', trauma: 0.25, hitstop: 0.06 } });
          };
          if (!this.a && this.t >= 0.07) { this.a = true; star(92); }
          if (!this.b && this.t >= 0.17) { this.b = true; star(70); }
        },
      }),
      super: () => castMove(0.15, 0.6, (f, s) => {
        Sfx.blast();
        s.spawnProjectile(f, { kind: 'ghostorb', w: 50, h: 50, y: f.y - 80, vx: 520, life: 2, teleportAt: 0.35,
          hit: { dmg: 24, kb: 520, kbY: 380, stun: 0.8, sfx: 'kick', unblockable: true, isSuper: true, trauma: 0.7, hitstop: 0.12 } });
      }),
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.6), cy = lerp(J.hip.y, J.sh.y, 0.6);
      g.fillStyle(col(f.colors.accent), 1);
      g.fillPoints([{ x: cx + 2, y: cy - 11 }, { x: cx - 5, y: cy + 1 }, { x: cx, y: cy + 1 }, { x: cx - 3, y: cy + 11 }, { x: cx + 5, y: cy - 2 }, { x: cx, y: cy - 2 }], true);
      g.lineStyle(4, col(f.colors.accent), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing, hx = J.head.x, hy = J.head.y;
      g.fillStyle(col(f.colors.hair), 1);
      g.fillEllipse(hx - 3 * fx, hy - 10, 30, 14);
      g.fillTriangle(hx - 14 * fx, hy - 8, hx - 24 * fx, hy - 4, hx - 12 * fx, hy + 2);
      // Antiparras en la frente
      g.fillStyle(col(0x1a1a1a), 1); g.fillRect(hx - 16, hy - 9, 32, 4);
      g.fillStyle(col(f.colors.accent), 1); g.fillCircle(hx + 7 * fx, hy - 8, 5); g.fillCircle(hx - 3 * fx, hy - 8, 4);
      g.fillStyle(0xffffff, 0.6); g.fillCircle(hx + 6 * fx, hy - 9, 1.6);
      g.fillStyle(col(0xffffff), 1); g.fillEllipse(hx + 8 * fx, hy + 2, 6, 4);
      g.fillStyle(col(0x2b2d42), 1); g.fillCircle(hx + 9 * fx, hy + 2, 1.8);
    },
    drawFront(g, f, J) {
      if (Math.abs(f.vx) > 200 && f.onGround && Math.random() < 0.5) {
        g.lineStyle(2, f.colors.accent, 0.8);
        const x = f.x - f.facing * 20, y = f.y - 30 - Math.random() * 70;
        g.lineBetween(x, y, x - f.facing * 18, y + 6);
      }
    },
  },

  // ======================= ESPEJO (el que copia) =======================
  {
    id: 'espejo', name: 'ESPEJO', tagline: 'Copia los trucos del rival',
    colors: { suit: 0x7d8799, accent: 0x3fd2ff, head: 0xd6dde6 },
    alt: { suit: 0x4a3b66, accent: 0xffd23f, head: 0xe8d9b0 },
    speed: 300, jump: 780, jumps: 1, stats: { VEL: 4, FUE: 4, DEF: 3, ESP: 4 },
    passive: 'Ojo copiador: su combo copia el combo del rival',
    combo: { name: 'Copia', seq: ['back', 'back', 'punch'], desc: 'Hace el combo de su rival', copies: true },
    superMove: { name: 'Cuchilla Relámpago', desc: 'Carga un rayo en la mano y atraviesa al rival' },
    moves: {
      punch: () => mkPunch({ dmg: 6 }),
      kick: () => mkKick({ dmg: 9 }),
      air: () => mkAirKick(),
      combo: (f, s, opp) => {
        if (opp && opp.def.id !== 'espejo') return opp.def.moves.combo(f, s, opp);
        return castMove(0.1, 0.36, (f2, s2) => {
          Sfx.zap();
          s2.spawnProjectile(f2, { kind: 'bolt', w: 44, h: 22, y: f2.y - 84, vx: 820, life: 1.3,
            hit: { dmg: 8, kb: 220, stun: 0.45, sfx: 'zap', trauma: 0.3, hitstop: 0.06 } });
        });
      },
      super: () => ({
        id: 'cuchilla', pose: 'charge', dur: 1.05, invuln: true, keepVx: true,
        windows: [{ from: 0.42, to: 0.72, box: { x: 0, y: 50, w: 85, h: 70 }, dmg: 26, kb: 560, kbY: 300, stun: 0.8, sfx: 'zap', unblockable: true, isSuper: true, trauma: 0.85, hitstop: 0.15 }],
        start() { Sfx.zap(); },
        update(f) {
          if (this.t < 0.4) f.vx = 0;
          else if (this.t < 0.72) { if (this.pose !== 'dash') Sfx.zap(); this.pose = 'dash'; f.vx = f.facing * 900; }
          else { this.pose = 'punch'; f.vx = f.vx * 0.8; }
        },
      }),
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      g.lineStyle(3, col(f.colors.accent), 1);
      g.lineBetween(cx - 6, cy - 9, cx + 3, cy - 2); g.lineBetween(cx + 3, cy - 2, cx - 3, cy + 2); g.lineBetween(cx - 3, cy + 2, cx + 6, cy + 10);
      g.fillStyle(col(shade(f.colors.suit, 0.7)), 1); g.fillRect(J.hip.x - 14, J.hip.y - 6, 28, 6);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing, hx = J.head.x, hy = J.head.y;
      // Máscara de espejo con reflejos
      g.fillStyle(col(0xffffff), 0.55);
      g.fillPoints([{ x: hx - 6 * fx, y: hy - 14 }, { x: hx + 2 * fx, y: hy - 14 }, { x: hx - 8 * fx, y: hy + 12 }, { x: hx - 14 * fx, y: hy + 9 }], true);
      g.lineStyle(2, col(f.colors.accent), 1);
      g.lineBetween(hx + 2 * fx, hy - 2, hx + 15 * fx, hy - 2);
      g.lineStyle(2, col(shade(f.colors.head, 0.6)), 1); g.strokeCircle(hx, hy, HEAD_R);
    },
    drawFront(g, f, J) {
      const m = f.move;
      if (!m || m.id !== 'cuchilla') return;
      const hx = J.fh.x, hy = J.fh.y, acc = f.colors.accent;
      const r = m.t < 0.4 ? 10 + m.t * 40 : 26;
      g.fillStyle(acc, 0.3); g.fillCircle(hx, hy, r);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(hx, hy, r * 0.35);
      for (let k = 0; k < 6; k++) {
        let x = hx, y = hy;
        const a = Math.random() * Math.PI * 2;
        g.lineStyle(k % 2 ? 2 : 3, k % 2 ? 0xffffff : acc, 1);
        g.beginPath(); g.moveTo(x, y);
        for (let q = 0; q < 4; q++) { x += Math.cos(a) * r * 0.5 + (Math.random() - 0.5) * 14; y += Math.sin(a) * r * 0.5 + (Math.random() - 0.5) * 14; g.lineTo(x, y); }
        g.strokePath();
      }
    },
  },

  // ======================= OBSIDIANA (señor del fuego) =======================
  {
    id: 'obsidiana', name: 'OBSIDIANA', tagline: 'Guerrero de lava',
    colors: { suit: 0x2a2230, accent: 0xff6a1a, head: 0x3a2f42 },
    alt: { suit: 0x1f3a3a, accent: 0x7cff4f, head: 0x2a4a4a },
    speed: 215, jump: 690, jumps: 1, armor: 0.8, stats: { VEL: 1, FUE: 5, DEF: 5, ESP: 5 },
    passive: 'Armadura de roca: recibe menos daño',
    combo: { name: 'Gran Bola de Fuego', seq: ['back', 'fwd', 'kick'], desc: 'Una bola de fuego enorme y lenta' },
    superMove: { name: 'Lluvia de Meteoros', desc: 'Hace caer meteoros del cielo sobre el rival' },
    moves: {
      punch: () => mkPunch({ dmg: 7 }),
      kick: () => mkKick({ dmg: 9 }),
      air: () => mkAirKick(),
      combo: () => castMove(0.18, 0.55, (f, s) => {
        Sfx.fire();
        s.spawnProjectile(f, { kind: 'fireball', w: 64, h: 64, y: f.y - 80, vx: 380, life: 2.6,
          hit: { dmg: 13, kb: 340, kbY: 200, stun: 0.55, sfx: 'fire', trauma: 0.45, hitstop: 0.08 } });
      }),
      super: (f, s, opp) => ({
        id: 'meteoros', pose: 'summon', dur: 1.1, invuln: true,
        start() { Sfx.fire(); },
        update(f2, s2) {
          if (!this.a && this.t >= 0.25) { this.a = true; s2.spawnMeteor(f2, opp.x, true); }
          if (!this.b && this.t >= 0.5) { this.b = true; s2.spawnMeteor(f2, opp.x - 110, false); }
          if (!this.c && this.t >= 0.7) { this.c = true; s2.spawnMeteor(f2, opp.x + 110, false); }
        },
      }),
    },
    drawBack(g, f) {
      // Brasas que suben
      if (Math.random() < 0.6) {
        g.fillStyle(f.colors.accent, 0.8);
        g.fillCircle(f.x + (Math.random() - 0.5) * 50, f.y - Math.random() * 140, 1.5 + Math.random() * 2);
      }
    },
    drawTorso(g, f, J, col) {
      const acc = col(f.colors.accent);
      g.lineStyle(2, acc, 0.9);
      const a = { x: lerp(J.hip.x, J.sh.x, 0.2), y: lerp(J.hip.y, J.sh.y, 0.2) }, b = { x: lerp(J.hip.x, J.sh.x, 0.75), y: lerp(J.hip.y, J.sh.y, 0.75) };
      g.lineBetween(a.x - 6, a.y, b.x + 4, b.y); g.lineBetween(b.x + 4, b.y, b.x - 6, b.y - 8);
      g.lineBetween(lerp(a.x, b.x, 0.5) - 2, lerp(a.y, b.y, 0.5), lerp(a.x, b.x, 0.5) + 9, lerp(a.y, b.y, 0.5) + 4);
      // Hombreras con púas
      g.fillStyle(col(shade(f.colors.suit, 1.5)), 1);
      g.fillCircle(J.sh.x, J.sh.y + 3, 14);
      g.fillTriangle(J.sh.x - 10, J.sh.y - 6, J.sh.x - 2, J.sh.y - 6, J.sh.x - 8, J.sh.y - 18);
      g.fillTriangle(J.sh.x + 2, J.sh.y - 6, J.sh.x + 10, J.sh.y - 6, J.sh.x + 8, J.sh.y - 18);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing, hx = J.head.x, hy = J.head.y, acc = col(f.colors.accent);
      // Casco con cuernos y ranura de lava
      g.fillStyle(acc, 1);
      g.fillTriangle(hx - 8 * fx, hy - 10, hx - 2 * fx, hy - 13, hx - 20 * fx, hy - 30);
      g.fillTriangle(hx + 4 * fx, hy - 13, hx + 10 * fx, hy - 9, hx + 14 * fx, hy - 30);
      g.fillStyle(col(0x140e18), 1); g.fillRect(hx - 2 * fx - (fx < 0 ? 16 : 0), hy - 4, 17, 7);
      g.fillStyle(acc, 1); g.fillRect(hx + (fx > 0 ? 2 : -14), hy - 2, 12, 3);
    },
  },

];

function drawSword(g, elbow, hand, col) {
  const dx = hand.x - elbow.x, dy = hand.y - elbow.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  g.lineStyle(4, col(0xeef3f8), 1);
  g.lineBetween(hand.x, hand.y, hand.x + ux * 60, hand.y + uy * 60);
  g.lineStyle(6, col(0x222222), 1);
  g.lineBetween(hand.x - ux * 6, hand.y - uy * 6, hand.x + ux * 4, hand.y + uy * 4);
  g.lineStyle(3, col(0xff8a1f), 1);
  g.lineBetween(hand.x + ux * 4 - uy * 7, hand.y + uy * 4 + ux * 7, hand.x + ux * 4 + uy * 7, hand.y + uy * 4 - ux * 7);
}

function drawShield(g, cx, cy, r, f, col, alpha = 1, spin = 0) {
  g.fillStyle(col(f.colors.suit), alpha); g.fillCircle(cx, cy, r);
  g.fillStyle(col(f.colors.accent), alpha); g.fillCircle(cx, cy, r - 4);
  g.lineStyle(2, col(shade(f.colors.accent, 0.6)), alpha); g.strokeCircle(cx, cy, r - 9);
  g.fillStyle(col(f.colors.suit), alpha);
  const a = spin;
  const p = (k) => ({ x: cx + Math.cos(a + k) * 9, y: cy + Math.sin(a + k) * 9 });
  const p1 = p(-Math.PI / 2), p2 = p(Math.PI / 6), p3 = p(Math.PI * 5 / 6);
  g.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
}

const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
