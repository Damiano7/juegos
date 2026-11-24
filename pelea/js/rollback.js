// Rollback para el modo online.
// El juego no espera las teclas del rival: adivina que sigue apretando lo mismo y avanza.
// Cuando llegan las teclas reales y eran distintas, vuelve atrás unos cuadros y recalcula.
const ROLLBACK_MAX = 18; // cuántos cuadros puede adelantarse sin confirmar (18/60 s = 300 ms)

// Todo lo que cambia durante la pelea y define el resultado (no lo visual).
const FIGHTER_STATE = ['x', 'y', 'vx', 'vy', 'facing', 'hp', 'power', 'wins', 'onGround', 'jumpsLeft', 'fuel',
  'hurtT', 'stuckT', 'flashT', 'comboCd', 'blocking', 'jetting', 'ko', 'victory', 'hasShield', 'regenAcc',
  'animT', 'clock', 'superWasReady'];

function cloneMove(m) {
  if (!m) return null;
  const c = Object.assign({}, m);
  if (m.windows) c.windows = m.windows.map((w) => Object.assign({}, w));
  return c;
}

Fighter.prototype.saveState = function () {
  const s = {};
  for (const k of FIGHTER_STATE) s[k] = this[k];
  s.move = cloneMove(this.move);
  s.buffer = this.buffer.map((e) => Object.assign({}, e));
  return s;
};

Fighter.prototype.loadState = function (s) {
  for (const k of FIGHTER_STATE) this[k] = s[k];
  this.move = cloneMove(s.move);
  this.buffer = s.buffer.map((e) => Object.assign({}, e));
};

// Mientras se recalcula el pasado, no suenan los efectos (ya sonaron la primera vez).
let SIM_SILENT = false;
for (const k of Object.keys(Sfx)) {
  if (k === 'unlock' || k === 'toggleMute') continue;
  const fn = Sfx[k];
  Sfx[k] = function (...args) { if (SIM_SILENT) return undefined; return fn.apply(this, args); };
}

// Huella de un estado guardado (para comprobar que las dos computadoras coinciden)
function snapHash(s) {
  const v = [];
  for (const f of s.f) v.push(f.hp, f.x, f.y, f.power, f.wins);
  v.push(s.proj.length, s.timeLeft);
  let h = 2166136261;
  const str = v.map((x) => (Math.round(x * 1000) / 1000).toFixed(3)).join('|');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
