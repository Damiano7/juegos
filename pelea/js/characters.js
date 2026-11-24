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
    colors: { suit: 0xc81e28, accent: 0x194896, head: 0xc81e28 },
    alt: { suit: 0x16161d, accent: 0xffffff, head: 0x16161d },
    speed: 310, jump: 830, jumps: 2, stats: { VEL: 5, FUE: 2, DEF: 2, ESP: 4 },
    passive: 'Doble salto (tocá ↑ dos veces)',
    combo: { name: 'Disparo de Red', seq: ['down', 'fwd', 'punch'], label: '↓  →  GOLPE', desc: 'Pega al rival en el lugar con su telaraña' },
    superMove: { name: 'Red Gigante', desc: 'Una red enorme que atrapa e inmoviliza al rival' },
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
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Base roja
      g.fillStyle(col(0xc81e28), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Red de telarañas en la máscara
      g.lineStyle(1.2, col(0x111111), 0.65);
      g.lineBetween(hx, hy - HEAD_R, hx, hy + HEAD_R);
      g.lineBetween(hx - HEAD_R, hy, hx + HEAD_R, hy);
      g.lineBetween(hx - 10, hy - 10, hx + 10, hy + 10);
      g.lineBetween(hx - 10, hy + 10, hx + 10, hy - 10);
      g.strokeCircle(hx, hy, 5);
      g.strokeCircle(hx, hy, 10);
      g.strokeCircle(hx, hy, HEAD_R);
      // Ojos de Spider-Man (grandes, angulares y con marco negro grueso)
      // Ojo frontal (hacia donde mira)
      g.fillStyle(col(0x111111), 1);
      g.fillTriangle(hx + 1 * fx, hy + 5, hx + 10 * fx, hy - 6, hx + 11 * fx, hy + 3);
      g.fillStyle(col(0xffffff), 1);
      g.fillTriangle(hx + 2 * fx, hy + 4, hx + 9 * fx, hy - 4, hx + 10 * fx, hy + 2);
      // Ojo trasero en perspectiva
      g.fillStyle(col(0x111111), 1);
      g.fillTriangle(hx - 2 * fx, hy + 5, hx - 8 * fx, hy - 5, hx - 9 * fx, hy + 2);
      g.fillStyle(col(0xffffff), 1);
      g.fillTriangle(hx - 3 * fx, hy + 4, hx - 7 * fx, hy - 3, hx - 8 * fx, hy + 1);
    },
  },

  // ======================= DEADPOOL (DOBLE FILO) =======================
  {
    id: 'doblefilo', name: 'DEADPOOL', tagline: 'El mercenario bocazas',
    colors: { suit: 0xb81818, accent: 0x1a1a1a, head: 0xb81818 },
    alt: { suit: 0x3e4248, accent: 0x141414, head: 0x3e4248 },
    speed: 285, jump: 770, jumps: 1, regen: 6, stats: { VEL: 4, FUE: 4, DEF: 2, ESP: 4 },
    passive: 'Factor curativo (se regenera solo)',
    combo: { name: 'Corte de Katana', seq: ['fwd', 'fwd', 'punch'], label: '→  →  GOLPE', desc: 'Arremete cortando con sus dos katanas' },
    superMove: { name: 'Tornado Asesino', desc: 'Gira a toda velocidad rebanando con sus katanas' },
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
          if (Math.random() < 0.6) s.spark(f.x - f.facing * 20, f.y - 70, 0xb81818, 1);
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
      // Dos katanas cruzadas en la espalda (vaina negra con mango rojo)
      const fx = J.facing;
      const m = f.move;
      if (!m || (m.pose !== 'slash' && m.pose !== 'dash' && m.pose !== 'spin')) {
        g.lineStyle(5, col(0x181818), 1);
        g.lineBetween(J.sh.x - 20 * fx, J.sh.y - 26, J.hip.x + 14 * fx, J.hip.y + 10);
        g.lineBetween(J.sh.x - 4 * fx, J.sh.y - 28, J.hip.x + 22 * fx, J.hip.y + 4);
        // Mangos de las katanas
        g.lineStyle(4, col(0xb81818), 1);
        g.lineBetween(J.sh.x - 20 * fx, J.sh.y - 26, J.sh.x - 28 * fx, J.sh.y - 36);
        g.lineBetween(J.sh.x - 4 * fx, J.sh.y - 28, J.sh.x - 10 * fx, J.sh.y - 38);
        g.lineStyle(2, col(0x181818), 1);
        g.strokeCircle(J.sh.x - 28 * fx, J.sh.y - 36, 2);
        g.strokeCircle(J.sh.x - 10 * fx, J.sh.y - 38, 2);
      }
    },
    drawTorso(g, f, J, col) {
      const fx = J.facing;
      // Paneles negros laterales en el torso
      g.fillStyle(col(0x181818), 1);
      g.fillPoints([
        { x: J.sh.x - 10 * fx, y: J.sh.y + 2 },
        { x: J.sh.x - 4 * fx, y: J.sh.y + 2 },
        { x: J.hip.x - 3 * fx, y: J.hip.y - 6 },
        { x: J.hip.x - 11 * fx, y: J.hip.y - 6 }
      ], true);
      // Arnés táctico negro en el pecho
      g.lineStyle(3, col(0x181818), 1);
      g.lineBetween(J.sh.x - 8 * fx, J.sh.y + 1, J.hip.x + 7 * fx, J.hip.y - 5);
      // Cinturón marrón con cartucheras
      g.lineStyle(6, col(0x52331b), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
      // Hebilla redonda de Deadpool
      g.fillStyle(col(0xb81818), 1);
      g.fillCircle(J.hip.x, J.hip.y - 3, 5);
      g.fillStyle(col(0x181818), 1);
      g.fillCircle(J.hip.x - 2, J.hip.y - 3, 3);
      g.fillCircle(J.hip.x + 2, J.hip.y - 3, 3);
      g.fillStyle(col(0xffffff), 1);
      g.fillCircle(J.hip.x - 2, J.hip.y - 3, 1);
      g.fillCircle(J.hip.x + 2, J.hip.y - 3, 1);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Base roja
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Los parches negros icónicos de Deadpool
      g.fillStyle(col(0x181818), 1);
      g.fillEllipse(hx + 5 * fx, hy, 10, 15);
      g.fillEllipse(hx - 5 * fx, hy, 8, 13);
      // Ojos blancos expresivos
      g.fillStyle(col(0xffffff), 1);
      // Ojo frontal (triangular/almendrado)
      g.fillTriangle(hx + 2 * fx, hy + 2, hx + 8 * fx, hy - 2, hx + 8 * fx, hy + 2);
      // Ojo trasero (entrecerrado clásico de Deadpool)
      g.fillRect(hx - 8 * fx - (fx < 0 ? 4 : 0), hy, 5, 2);
      // Puntera de tela detrás de la máscara
      g.fillStyle(col(f.colors.head), 1);
      g.fillTriangle(hx - 9 * fx, hy - 9, hx - 16 * fx, hy - 14, hx - 6 * fx, hy - 13);
      g.lineStyle(1.5, col(0x181818), 0.8);
      g.strokeCircle(hx, hy, HEAD_R);
    },
    drawBackHand(g, f, J, col) {
      if (f.move && f.move.pose === 'spin') drawSword(g, J.be, J.bh, col);
    },
    drawFront(g, f, J, col) {
      const m = f.move;
      if (m && (m.pose === 'slash' || m.pose === 'dash' || m.pose === 'spin')) drawSword(g, J.fe, J.fh, col);
      if (m && m.pose === 'spin') {
        g.lineStyle(3, 0xff2222, 0.6);
        g.strokeEllipse(f.x, f.y - 70, 150, 50);
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeEllipse(f.x, f.y - 40, 130, 40);
      }
    },
  },

  // ======================= IRON MAN (PROTÓN) =======================
  {
    id: 'proton', name: 'IRON MAN', tagline: 'El Hombre de Hierro',
    colors: { suit: 0x9e1313, accent: 0xf5b81b, head: 0x9e1313 },
    alt: { suit: 0x7c8894, accent: 0x222a33, head: 0x7c8894 },
    speed: 260, jump: 750, jumps: 1, fuel: 1.4, stats: { VEL: 2, FUE: 3, DEF: 3, ESP: 5 },
    passive: 'Propulsores: mantené ↑ en el aire para volar',
    combo: { name: 'Disparo Repulsor', seq: ['down', 'fwd', 'kick'], label: '↓  →  PATADA', desc: 'Dispara una ráfaga de energía desde el guantelete' },
    superMove: { name: 'Unirrayo del Pecho', desc: 'Descarga un colosal rayo láser desde su reactor arc' },
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
      // Hombreras doradas
      g.fillStyle(col(f.colors.accent), 1);
      g.fillCircle(J.sh.x, J.sh.y + 2, 13);
      // Placas doradas en la cintura
      g.fillStyle(col(f.colors.accent), 0.9);
      g.fillRect(J.hip.x - 10, J.hip.y - 8, 20, 5);
      // Reactor Arc circular brillante en el centro del pecho
      g.fillStyle(col(0x1a2430), 1);
      g.fillCircle(cx, cy, 11);
      g.fillStyle(col(0x00f0ff), 1);
      g.fillCircle(cx, cy, 8);
      g.fillStyle(0xffffff, 0.95);
      g.fillCircle(cx, cy, 4);
      g.lineStyle(1.5, col(0x00f0ff), 0.8);
      g.strokeCircle(cx, cy, 11);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Casco rojo base
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Placa frontal dorada de Iron Man
      g.fillStyle(col(f.colors.accent), 1);
      g.fillPoints([
        { x: hx - 4 * fx, y: hy - 11 },
        { x: hx + 8 * fx, y: hy - 11 },
        { x: hx + 12 * fx, y: hy - 3 },
        { x: hx + 8 * fx, y: hy + 8 },
        { x: hx - 2 * fx, y: hy + 10 },
        { x: hx - 6 * fx, y: hy + 2 }
      ], true);
      // Ojos rasgados luminosos cian / blanco
      g.fillStyle(col(0x00f0ff), 1);
      g.fillRect(hx + (fx > 0 ? 1 : -9), hy - 3, 9, 3);
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(hx + (fx > 0 ? 2 : -8), hy - 2.5, 7, 1.8);
      g.lineStyle(1.5, col(shade(f.colors.suit, 0.6)), 0.9);
      g.strokeCircle(hx, hy, HEAD_R);
    },
    drawFront(g, f, J, col) {
      // Llamas de propulsores en botas al volar
      if (f.jetting || (!f.onGround && f.move && f.move.id === 'laser')) {
        for (const foot of [J.ff, J.bf]) {
          const len = 20 + Math.random() * 16;
          g.fillStyle(0x00e5ff, 0.8);
          g.fillTriangle(foot.x - 7, foot.y + 4, foot.x + 7, foot.y + 4, foot.x, foot.y + 4 + len);
          g.fillStyle(0xffffff, 0.95);
          g.fillTriangle(foot.x - 3, foot.y + 4, foot.x + 3, foot.y + 4, foot.x, foot.y + 4 + len * 0.5);
        }
      }
      // Rayo láser de pecho (Unibeam)
      const m = f.move;
      if (m && m.id === 'laser') {
        const hx = (J.fh.x + J.bh.x) / 2, hy = (J.fh.y + J.bh.y) / 2;
        if (m.t < 0.32) {
          const r = 8 + m.t * 60;
          g.fillStyle(0x00f0ff, 0.4); g.fillCircle(hx, hy, r);
          g.fillStyle(0xffffff, 0.95); g.fillCircle(hx, hy, r * 0.45);
        } else if (m.t < 1.45) {
          const endX = f.facing > 0 ? VIEW.r + 40 : VIEW.l - 40;
          const wob = Math.sin(m.t * 60) * 4;
          const y = f.y - 83;
          g.fillStyle(0x00f0ff, 0.35); g.fillRect(Math.min(hx, endX), y - 30 - wob, Math.abs(endX - hx), 60 + wob * 2);
          g.fillStyle(0x00f0ff, 0.85); g.fillRect(Math.min(hx, endX), y - 18, Math.abs(endX - hx), 36);
          g.fillStyle(0xffffff, 1); g.fillRect(Math.min(hx, endX), y - 8, Math.abs(endX - hx), 16);
          g.fillStyle(0xffffff, 0.95); g.fillCircle(hx, y, 24 + wob);
        }
      }
    },
  },

  // ======================= CAPITÁN AMÉRICA (CENTINELA) =======================
  {
    id: 'centinela', name: 'CAPITÁN AMÉRICA', tagline: 'El Primer Vengador',
    colors: { suit: 0x194896, accent: 0xc82020, head: 0x194896 },
    alt: { suit: 0x1d2733, accent: 0x8294a6, head: 0x1d2733 },
    speed: 245, jump: 740, jumps: 1, blockChip: 0, stats: { VEL: 2, FUE: 3, DEF: 5, ESP: 4 },
    passive: 'Escudo de Vibranium: bloquear no consume vida',
    combo: { name: 'Lanzamiento de Escudo', seq: ['back', 'fwd', 'punch'], label: '←  →  GOLPE', desc: 'Lanza su escudo de estrellas y regresa' },
    superMove: { name: 'Impacto Heroico', desc: 'Salta por los cielos y azota el piso con su escudo' },
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
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Casco azul base
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Apertura de rostro (piel de Cap en mentón/boca)
      g.fillStyle(col(0xf0c298), 1);
      g.fillPoints([
        { x: hx - 5 * fx, y: hy + 3 },
        { x: hx + 11 * fx, y: hy + 2 },
        { x: hx + 8 * fx, y: hy + 12 },
        { x: hx - 3 * fx, y: hy + 12 }
      ], true);
      // Tira del mentón marrón
      g.lineStyle(2, col(0x5a3518), 1);
      g.lineBetween(hx - 5 * fx, hy + 3, hx - 2 * fx, hy + 11);
      // Letra "A" blanca en la frente
      g.lineStyle(2, col(0xffffff), 1);
      g.lineBetween(hx + 0 * fx, hy - 10, hx - 3 * fx, hy - 2);
      g.lineBetween(hx + 0 * fx, hy - 10, hx + 3 * fx, hy - 2);
      g.lineBetween(hx - 2 * fx, hy - 5, hx + 2 * fx, hy - 5);
      // Alitas blancas en el lateral
      g.fillStyle(col(0xffffff), 1);
      g.fillTriangle(hx - 7 * fx, hy - 5, hx - 14 * fx, hy - 10, hx - 8 * fx, hy - 8);
      g.lineStyle(1.5, col(shade(f.colors.suit, 0.6)), 0.8);
      g.strokeCircle(hx, hy, HEAD_R);
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      // Rayas rojas y blancas en el abdomen
      const w = 18, h = 8;
      g.fillStyle(col(0xffffff), 1);
      g.fillRect(J.hip.x - w / 2, J.hip.y - 10, w, h);
      g.fillStyle(col(0xc82020), 1);
      g.fillRect(J.hip.x - w / 2 + 3, J.hip.y - 10, 4, h);
      g.fillRect(J.hip.x - w / 2 + 11, J.hip.y - 10, 4, h);
      // Cinturón marrón táctico
      g.lineStyle(5, col(0x52331b), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 2, J.hip.x + 13, J.hip.y - 2);
      // Gran Estrella Blanca en el centro del pecho
      g.fillStyle(col(0xffffff), 1);
      const starR = 6;
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? starR : starR * 0.45;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      g.fillPoints(pts, true);
    },
    drawFront(g, f, J, col) {
      if (!f.hasShield) return;
      const m = f.move;
      let cx = lerp(J.fe.x, J.fh.x, 0.6) + 8 * J.facing, cy = lerp(J.fe.y, J.fh.y, 0.6);
      if (m && m.pose === 'slamUp') { cx = J.fh.x; cy = J.fh.y - 10; }
      drawShield(g, cx, cy, 24, f, col, f.blocking ? 1 : 0.92);
    },
  },
  // ======================= NARUTO (REMOLINO) =======================
  {
    id: 'remolino', name: 'NARUTO', tagline: 'Héroe de la Aldea de la Hoja',
    colors: { suit: 0xf06810, accent: 0x182442, head: 0xf8cba0, hair: 0xf5d818 },
    alt: { suit: 0x222222, accent: 0xc81e1e, head: 0xf8cba0, hair: 0xf5d818 },
    speed: 290, jump: 790, jumps: 1, powerMul: 1.5, stats: { VEL: 3, FUE: 3, DEF: 3, ESP: 5 },
    passive: 'Chakra de Kurama: llena el súper más rápido',
    combo: { name: 'Jutsu Clones de Sombra', seq: ['down', 'down', 'punch'], desc: 'Invoca clones de sombra que corren a golpear' },
    superMove: { name: 'Gran Rasengan', desc: 'Una esfera de chakra giratoria que arrasa al rival' },
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
      // Espiral roja del clan Uzumaki en la espalda
      const fx = J.facing || 1;
      const cx = J.sh.x - 8 * fx, cy = J.sh.y + 6;
      g.fillStyle(col(0xc81e1e), 1);
      g.fillCircle(cx, cy, 5);
      g.fillStyle(col(f.colors.suit), 1);
      g.fillCircle(cx, cy, 2);
    },
    drawTorso(g, f, J, col) {
      // Chaqueta naranja con cuello blanco y hombros azules
      g.fillStyle(col(0x182442), 1);
      g.fillCircle(J.sh.x, J.sh.y + 1, 13);
      g.fillStyle(col(0xffffff), 1);
      g.fillRect(J.sh.x - 10, J.sh.y - 2, 20, 4); // cuello blanco
      // Vendaje blanco en la pierna
      g.fillStyle(col(0xffffff), 0.9);
      g.fillRect(J.hip.x - 8, J.hip.y - 4, 16, 4);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Cara piel
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Pelo rubio en puntas de Naruto
      g.fillStyle(col(f.colors.hair), 1);
      g.fillTriangle(hx - 14 * fx, hy - 4, hx - 5 * fx, hy - 16, hx - 22 * fx, hy - 14);
      g.fillTriangle(hx - 8 * fx, hy - 11, hx + 4 * fx, hy - 18, hx - 6 * fx, hy - 25);
      g.fillTriangle(hx + 1 * fx, hy - 12, hx + 14 * fx, hy - 10, hx + 8 * fx, hy - 22);
      g.fillTriangle(hx + 8 * fx, hy - 8, hx + 18 * fx, hy - 5, hx + 15 * fx, hy - 16);
      g.fillEllipse(hx, hy - 11, 24, 8);
      // Banda ninja de Konoha (azul oscuro)
      g.fillStyle(col(0x182442), 1);
      g.fillRect(hx - 14, hy - 11, 28, 6);
      // Placa metálica de la aldea de la hoja
      g.fillStyle(col(0xd4dce8), 1);
      g.fillRoundedRect(hx - 8, hy - 11, 16, 6, 2);
      // Símbolo de la hoja en la placa
      g.lineStyle(1.5, col(0x222222), 1);
      g.strokeCircle(hx, hy - 8, 1.8);
      // Tres marcas de bigotes en la mejilla
      g.lineStyle(1.2, col(0x5a2d0c), 0.85);
      g.lineBetween(hx + 4 * fx, hy + 2, hx + 9 * fx, hy + 1);
      g.lineBetween(hx + 3 * fx, hy + 5, hx + 8 * fx, hy + 5);
      g.lineBetween(hx + 4 * fx, hy + 8, hx + 9 * fx, hy + 8);
      // Ojo azul decidido
      g.fillStyle(col(0xffffff), 1);
      g.fillEllipse(hx + 7 * fx, hy - 1, 6, 5);
      g.fillStyle(col(0x1a70c8), 1);
      g.fillCircle(hx + 8 * fx, hy - 1, 2);
      g.lineStyle(1.5, col(0x4a2a0a), 1);
      g.lineBetween(hx + 3 * fx, hy - 5, hx + 11 * fx, hy - 4);
    },
    drawFront(g, f, J) {
      const m = f.move;
      if (!m || m.id !== 'espiral') return;
      const r = m.t < 0.42 ? 6 + m.t * 52 : 28;
      const hx = J.fh.x + J.facing * (r * 0.6), hy = J.fh.y;
      g.fillStyle(0xbfe9ff, 0.35); g.fillCircle(hx, hy, r + 10);
      g.fillStyle(0x7fd0ff, 0.7); g.fillCircle(hx, hy, r);
      g.fillStyle(0xffffff, 1); g.fillCircle(hx, hy, r * 0.5);
      g.lineStyle(3, 0x00f0ff, 0.95);
      for (let k = 0; k < 3; k++) {
        const a = m.t * 22 + k * 2.1;
        g.beginPath(); g.arc(hx, hy, r * (0.55 + k * 0.17), a, a + 2.2, false); g.strokePath();
      }
    },
  },

  // ======================= BORUTO (CENTELLA) =======================
  {
    id: 'centella', name: 'BORUTO', tagline: 'Ninja prodigio de la nueva era',
    colors: { suit: 0x1e1e24, accent: 0xeb1b74, head: 0xf8cba0, hair: 0xf2df38 },
    alt: { suit: 0x182838, accent: 0x30d5c8, head: 0xf8cba0, hair: 0xf2df38 },
    speed: 330, jump: 820, jumps: 1, stats: { VEL: 5, FUE: 3, DEF: 2, ESP: 4 },
    passive: 'Reflejos relámpago: el ninja más veloz',
    combo: { name: 'Shuriken de Rayo', seq: ['fwd', 'fwd', 'kick'], desc: 'Lanza shurikens imbuidos en electricidad' },
    superMove: { name: 'Rasengan Desvaneciente', desc: 'Lanza un Rasengan invisible que aparece frente al rival' },
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
      // Chaqueta negra con franjas fucsia / rosa neón
      g.lineStyle(4, col(0xeb1b74), 1);
      g.lineBetween(J.sh.x - 12, J.sh.y + 4, J.sh.x + 12, J.sh.y + 4);
      g.lineBetween(J.sh.x - 8, J.sh.y + 6, J.hip.x - 8, J.hip.y - 4);
      g.lineBetween(J.sh.x + 8, J.sh.y + 6, J.hip.x + 8, J.hip.y - 4);
      // Remera blanca debajo
      g.fillStyle(col(0xffffff), 1);
      g.fillRect(cx - 4, cy - 8, 8, 12);
      // Cinturón blanco
      g.lineStyle(4, col(0xffffff), 1);
      g.lineBetween(J.hip.x - 13, J.hip.y - 3, J.hip.x + 13, J.hip.y - 3);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Cara piel
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Pelo rubio ondulado con brote característico (tallo/ahoge en la cima)
      g.fillStyle(col(f.colors.hair), 1);
      g.fillEllipse(hx - 2 * fx, hy - 11, 26, 12);
      g.fillTriangle(hx - 12 * fx, hy - 7, hx - 22 * fx, hy - 4, hx - 10 * fx, hy + 2);
      g.fillTriangle(hx + 2 * fx, hy - 12, hx + 14 * fx, hy - 9, hx + 8 * fx, hy - 18);
      // Brote de hoja en la coronilla
      g.lineStyle(3, col(f.colors.hair), 1);
      g.lineBetween(hx, hy - 15, hx + 3 * fx, hy - 22);
      g.lineBetween(hx + 3 * fx, hy - 22, hx + 8 * fx, hy - 20);
      // Banda ninja negra de Konoha
      g.fillStyle(col(0x1a1a20), 1);
      g.fillRect(hx - 14, hy - 10, 28, 5);
      // Placa plateada
      g.fillStyle(col(0xd4dce8), 1);
      g.fillRoundedRect(hx - 8, hy - 10, 16, 5, 2);
      // Dos marcas de bigotes en la mejilla
      g.lineStyle(1.2, col(0x5a2d0c), 0.85);
      g.lineBetween(hx + 4 * fx, hy + 3, hx + 8 * fx, hy + 3);
      g.lineBetween(hx + 4 * fx, hy + 6, hx + 8 * fx, hy + 6);
      // Ojos celestes
      g.fillStyle(col(0xffffff), 1);
      g.fillEllipse(hx + 7 * fx, hy + 1, 6, 4.5);
      g.fillStyle(col(0x28a8e0), 1);
      g.fillCircle(hx + 8 * fx, hy + 1, 1.8);
    },
    drawFront(g, f, J, col) {
      if (Math.abs(f.vx) > 200 && f.onGround && Math.random() < 0.5) {
        g.lineStyle(2, col(0xeb1b74), 0.8);
        const x = f.x - f.facing * 20, y = f.y - 30 - Math.random() * 70;
        g.lineBetween(x, y, x - f.facing * 18, y + 6);
      }
    },
  },

  // ======================= KAKASHI (ESPEJO) =======================
  {
    id: 'espejo', name: 'KAKASHI', tagline: 'El ninja que copia (Sharingan)',
    colors: { suit: 0x1c2432, accent: 0x3a5634, head: 0xf8cba0, hair: 0xd4d8df },
    alt: { suit: 0x14141a, accent: 0x8a1818, head: 0xf8cba0, hair: 0xd4d8df },
    speed: 300, jump: 780, jumps: 1, stats: { VEL: 4, FUE: 4, DEF: 3, ESP: 4 },
    passive: 'Ojo Sharingan: su combo copia el combo del rival',
    combo: { name: 'Copia Sharingan', seq: ['back', 'back', 'punch'], desc: 'Copia y ejecuta el combo de su rival', copies: true },
    superMove: { name: 'Cuchilla Relámpago (Raikiri)', desc: 'Carga un rayo en la mano y atraviesa al rival' },
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
      // Chaleco táctico Jonin verde oliva con bolsillos
      g.fillStyle(col(0x3a5634), 1);
      g.fillRect(cx - 10, cy - 10, 20, 16);
      g.lineStyle(2, col(0x283e24), 1);
      g.strokeRect(cx - 10, cy - 10, 20, 16);
      // Bolsillos frontales
      g.fillStyle(col(0x283e24), 1);
      g.fillRect(cx - 8, cy - 3, 6, 6);
      g.fillRect(cx + 2, cy - 3, 6, 6);
      // Cuello alto del chaleco
      g.lineStyle(5, col(0x3a5634), 1);
      g.lineBetween(J.sh.x - 12, J.sh.y + 2, J.sh.x + 12, J.sh.y + 2);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Cara piel base
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Máscara azul oscuro cubriendo nariz y boca
      g.fillStyle(col(0x1c2432), 1);
      g.fillPoints([
        { x: hx - 14, y: hy - 1 },
        { x: hx + 14, y: hy - 1 },
        { x: hx + 10, y: hy + 13 },
        { x: hx - 10, y: hy + 13 }
      ], true);
      // Pelo plateado/grisáceo de punta hacia el costado
      g.fillStyle(col(f.colors.hair), 1);
      g.fillTriangle(hx - 14 * fx, hy - 4, hx - 6 * fx, hy - 18, hx - 24 * fx, hy - 22);
      g.fillTriangle(hx - 6 * fx, hy - 12, hx + 6 * fx, hy - 20, hx - 4 * fx, hy - 28);
      g.fillTriangle(hx + 2 * fx, hy - 12, hx + 14 * fx, hy - 12, hx + 6 * fx, hy - 24);
      g.fillTriangle(hx + 8 * fx, hy - 6, hx + 18 * fx, hy - 8, hx + 14 * fx, hy - 18);
      // Banda ninja inclinada cubriendo el ojo izquierdo
      g.fillStyle(col(0x182442), 1);
      g.fillPoints([
        { x: hx - 14, y: hy - 11 },
        { x: hx + 14, y: hy - 7 },
        { x: hx + 13, y: hy - 2 },
        { x: hx - 14, y: hy - 5 }
      ], true);
      // Placa metálica
      g.fillStyle(col(0xd4dce8), 1);
      g.fillRoundedRect(hx - 7, hy - 10, 14, 5, 2);
      // Ojo derecho: Sharingan rojo brillante con pupila negra
      g.fillStyle(col(0xffffff), 1);
      g.fillEllipse(hx + 6 * fx, hy + 2, 6, 4.5);
      g.fillStyle(col(0xe51818), 1);
      g.fillCircle(hx + 6 * fx, hy + 2, 2.2);
      g.fillStyle(col(0x111111), 1);
      g.fillCircle(hx + 6 * fx, hy + 2, 1);
    },
    drawFront(g, f, J) {
      const m = f.move;
      if (!m || m.id !== 'cuchilla') return;
      const hx = J.fh.x, hy = J.fh.y;
      const r = m.t < 0.4 ? 12 + m.t * 40 : 28;
      // Chidori / Raikiri: Rayos celestes y blancos chispeantes
      g.fillStyle(0x00f0ff, 0.4); g.fillCircle(hx, hy, r);
      g.fillStyle(0xffffff, 0.95); g.fillCircle(hx, hy, r * 0.4);
      for (let k = 0; k < 7; k++) {
        let x = hx, y = hy;
        const a = Math.random() * Math.PI * 2;
        g.lineStyle(k % 2 ? 2 : 3, k % 2 ? 0xffffff : 0x00e5ff, 1);
        g.beginPath(); g.moveTo(x, y);
        for (let q = 0; q < 4; q++) {
          x += Math.cos(a) * r * 0.5 + (Math.random() - 0.5) * 16;
          y += Math.sin(a) * r * 0.5 + (Math.random() - 0.5) * 16;
          g.lineTo(x, y);
        }
        g.strokePath();
      }
    },
  },

  // ======================= MADARA (OBSIDIANA) =======================
  {
    id: 'obsidiana', name: 'MADARA', tagline: 'El legendario líder Uchiha',
    colors: { suit: 0x141624, accent: 0x8c1b1b, head: 0xead8c8, hair: 0x0c0c14 },
    alt: { suit: 0xd8d8de, accent: 0x38bdf8, head: 0xead8c8, hair: 0xffffff },
    speed: 215, jump: 690, jumps: 1, armor: 0.8, stats: { VEL: 1, FUE: 5, DEF: 5, ESP: 5 },
    passive: 'Armadura Susanoo: absorbe gran parte del daño',
    combo: { name: 'Katon: Gran Bola de Fuego', seq: ['back', 'fwd', 'kick'], desc: 'Lanza una colosal bola de fuego abrasadora' },
    superMove: { name: 'Tengai Shinsei: Meteoros', desc: 'Invoca gigantescos meteoros celestiales del cielo' },
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
    drawBack(g, f, J, col) {
      // Melena larga salvaje de Madara cayendo por la espalda
      if (J && J.sh) {
        const fx = J.facing || 1;
        g.fillStyle(col(0x0c0c14), 1);
        g.fillTriangle(J.sh.x - 12 * fx, J.sh.y - 10, J.sh.x - 36 * fx, J.sh.y + 36, J.sh.x - 16 * fx, J.sh.y + 42);
        g.fillTriangle(J.sh.x - 8 * fx, J.sh.y - 8, J.sh.x - 24 * fx, J.sh.y + 44, J.sh.x - 2 * fx, J.sh.y + 38);
      }
      // Brasas de fuego ascendentes
      if (Math.random() < 0.6) {
        g.fillStyle(0xff4500, 0.8);
        g.fillCircle(f.x + (Math.random() - 0.5) * 50, f.y - Math.random() * 140, 1.5 + Math.random() * 2);
      }
    },
    drawTorso(g, f, J, col) {
      const cx = lerp(J.hip.x, J.sh.x, 0.62), cy = lerp(J.hip.y, J.sh.y, 0.62);
      // Coraza de samurái roja segmented
      g.fillStyle(col(0x8c1b1b), 1);
      g.fillRect(cx - 10, cy - 10, 20, 16);
      g.lineStyle(2, col(0x111118), 1);
      g.lineBetween(cx - 10, cy - 4, cx + 10, cy - 4);
      g.lineBetween(cx - 10, cy + 2, cx + 10, cy + 2);
      // Hombreras de samurái rojas con placas
      g.fillStyle(col(0x8c1b1b), 1);
      g.fillCircle(J.sh.x, J.sh.y + 2, 13);
      g.fillTriangle(J.sh.x - 10, J.sh.y - 4, J.sh.x - 2, J.sh.y - 4, J.sh.x - 8, J.sh.y - 16);
      g.fillTriangle(J.sh.x + 2, J.sh.y - 4, J.sh.x + 10, J.sh.y - 4, J.sh.x + 8, J.sh.y - 16);
    },
    drawHead(g, f, J, col) {
      const fx = J.facing || 1, hx = J.head.x, hy = J.head.y;
      // Cara piel pálida
      g.fillStyle(col(f.colors.head), 1);
      g.fillCircle(hx, hy, HEAD_R);
      // Mechones salvajes negros de Madara alrededor del rostro
      g.fillStyle(col(0x0c0c14), 1);
      g.fillTriangle(hx - 14 * fx, hy - 4, hx - 6 * fx, hy - 18, hx - 26 * fx, hy - 22);
      g.fillTriangle(hx - 6 * fx, hy - 12, hx + 4 * fx, hy - 20, hx - 6 * fx, hy - 28);
      g.fillTriangle(hx + 2 * fx, hy - 12, hx + 15 * fx, hy - 10, hx + 10 * fx, hy - 24);
      g.fillTriangle(hx + 8 * fx, hy - 6, hx + 18 * fx, hy - 8, hx + 14 * fx, hy - 18);
      // Mechones cayendo hacia los lados del rostro
      g.fillTriangle(hx - 12 * fx, hy, hx - 18 * fx, hy + 14, hx - 7 * fx, hy + 8);
      g.fillTriangle(hx + 7 * fx, hy + 2, hx + 14 * fx, hy + 14, hx + 10 * fx, hy + 6);
      // Ojos Sharingan / Rinnegan rojos siniestros con marcas
      g.fillStyle(col(0xe51818), 1);
      g.fillEllipse(hx + 5 * fx, hy + 1, 6, 4);
      g.fillEllipse(hx - 5 * fx, hy + 1, 5, 3.5);
      g.fillStyle(col(0x0c0c14), 1);
      g.fillCircle(hx + 5 * fx, hy + 1, 1.5);
      g.fillCircle(hx - 5 * fx, hy + 1, 1.2);
      g.lineStyle(2, col(0x0c0c14), 1);
      g.lineBetween(hx + 1 * fx, hy - 3, hx + 9 * fx, hy - 1);
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
  g.lineStyle(3, col(0xb81818), 1);
  g.lineBetween(hand.x + ux * 4 - uy * 7, hand.y + uy * 4 + ux * 7, hand.x + ux * 4 + uy * 7, hand.y + uy * 4 - ux * 7);
}

function drawShield(g, cx, cy, r, f, col, alpha = 1, spin = 0) {
  // Escudo de Capitán América: Anillos concéntricos rojo, blanco, rojo, azul + Estrella blanca
  g.fillStyle(col(0xc82020), alpha); // Anillo exterior rojo
  g.fillCircle(cx, cy, r);
  g.fillStyle(col(0xf0f0f5), alpha); // Anillo blanco
  g.fillCircle(cx, cy, r * 0.78);
  g.fillStyle(col(0xc82020), alpha); // Anillo interior rojo
  g.fillCircle(cx, cy, r * 0.56);
  g.fillStyle(col(0x194896), alpha); // Círculo central azul
  g.fillCircle(cx, cy, r * 0.36);
  // Estrella blanca de 5 puntas en el centro
  g.fillStyle(col(0xffffff), alpha);
  const starR = r * 0.35;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2 + spin;
    const rad = i % 2 === 0 ? starR : starR * 0.42;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  }
  g.fillPoints(pts, true);
  g.lineStyle(1.5, col(0x111111), alpha * 0.4);
  g.strokeCircle(cx, cy, r);
}

const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
