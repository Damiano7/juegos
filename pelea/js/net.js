// Conexión con el servidor online.
// Las dos computadoras calculan la misma pelea; por internet solo viajan las teclas.
const NET_PROTO = 1;      // tiene que coincidir con el servidor
const GAME_BUILD = 4;     // versión del juego: los dos jugadores tienen que tener la misma
// Cuadros de retraso de las teclas (4/60 s ≈ 67 ms): da tiempo a que lleguen las del otro.
// Para probar se puede cambiar con ?delay=6 en la dirección. Se usa el mayor de los dos jugadores.
const INPUT_DELAY = (() => {
  const q = Number(new URLSearchParams(location.search).get('delay'));
  return q >= 2 && q <= 12 ? Math.round(q) : 4;
})();

// ---------- Medidor de red ----------
const NetStats = {
  t0: performance.now(),
  events: [],      // { t, tipo, ms, ... }
  srvPings: [],    // { t, ms }
  rivalPings: [],  // { t, ms }
  stalls: 0, stallTotal: 0, stallMax: 0,
  gaps: 0, gapMax: 0,
  hitches: 0, hitchMax: 0,
  rivalFps: 0,
  lastIn: 0,
  reset() {
    this.t0 = performance.now();
    this.events = []; this.srvPings = []; this.rivalPings = [];
    this.stalls = 0; this.stallTotal = 0; this.stallMax = 0;
    this.gaps = 0; this.gapMax = 0; this.hitches = 0; this.hitchMax = 0;
    this.lastIn = 0;
  },
  now() { return Math.round(performance.now() - this.t0); },
  event(tipo, ms, extra) {
    this.events.push({ t: this.now(), tipo, ms: Math.round(ms), ...(extra || {}) });
    if (this.events.length > 2000) this.events.shift();
  },
  // Máximo y promedio de los últimos `secs` segundos
  window(list, secs) {
    const from = this.now() - secs * 1000;
    const v = list.filter((p) => p.t >= from).map((p) => p.ms);
    if (!v.length) return { avg: 0, max: 0 };
    return { avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.max(...v) };
  },
};

// Teclas → número (7 "apretadas ahora" + 7 "recién apretadas")
function encodeIntent(it) {
  let b = 0;
  ACTIONS.forEach((a, i) => {
    if (it.held[a]) b |= 1 << i;
    if (it.pressed[a]) b |= 1 << (i + 7);
  });
  return b;
}
function decodeIntent(b) {
  const it = emptyIntent();
  ACTIONS.forEach((a, i) => {
    it.held[a] = !!(b & (1 << i));
    it.pressed[a] = !!(b & (1 << (i + 7)));
  });
  return it;
}

function serverUrl() {
  const q = new URLSearchParams(location.search).get('server');
  return q || ONLINE_SERVER;
}

const Net = {
  ws: null,
  status: 'off',     // off | connecting | ready | waiting | matched | error
  error: '',
  side: 0,           // 0 = juega a la izquierda, 1 = a la derecha
  ping: 0,
  fightId: 0,
  inputs: new Map(), // fightId -> Map(frame -> teclas del rival)
  rival: { cur: 0, locked: false, again: false, left: false },
  delay: INPUT_DELAY,
  sums: new Map(),
  listeners: new Set(),

  connect() {
    this.close();
    this.status = 'connecting'; this.error = '';
    let ws;
    try { ws = new WebSocket(serverUrl()); } catch (e) { this.fail('noserver'); return; }
    this.ws = ws;
    const timeout = setTimeout(() => { if (this.status === 'connecting') { this.fail('noserver'); ws.close(); } }, 8000);
    ws.onopen = () => { this.send({ t: 'hello', v: NET_PROTO }); };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (ws !== this.ws) return;
      this.handle(m);
    };
    ws.onclose = () => {
      clearTimeout(timeout);
      if (ws !== this.ws) return;
      if (this.status === 'connecting') this.fail('noserver');
      else if (this.status !== 'error' && this.status !== 'off') { this.rival.left = true; this.fail('lost'); }
    };
    ws.onerror = () => {};
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      this.send({ t: 'ping', ts: performance.now() });
      // Ping de punta a punta con el rival (pasa por el servidor) y mis cuadros por segundo
      if (this.status === 'matched') this.send({ t: 'chat', echo: performance.now(), fps: Math.round(window.game ? game.loop.actualFps : 0) });
    }, 1000);
  },

  fail(reason) {
    this.status = 'error'; this.error = reason;
    this.emit({ t: 'status' });
  },

  close() {
    clearInterval(this.pingTimer);
    if (this.ws) { const w = this.ws; this.ws = null; try { w.close(); } catch { /* nada */ } }
    this.status = 'off';
  },

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  },

  find() {
    this.inputs.clear(); this.sums.clear();
    this.fightId = 0;
    this.rival = { cur: 0, locked: false, again: false, left: false };
    this.send({ t: 'find' });
  },

  leave() {
    this.send({ t: 'leave' });
    this.close();
  },

  handle(m) {
    switch (m.t) {
      case 'hello': this.status = 'ready'; this.find(); break;
      case 'waiting': this.status = 'waiting'; break;
      case 'match':
        this.status = 'matched'; this.side = m.side;
        this.rival = { cur: m.side === 0 ? 3 : 0, locked: false, again: false, left: false };
        this.delay = INPUT_DELAY;
        NetStats.reset();
        this.send({ t: 'chat', ver: GAME_BUILD, delay: INPUT_DELAY });
        break;
      case 'chat':
        if (m.ver !== undefined) this.rival.ver = m.ver;
        if (m.delay !== undefined) this.delay = Math.max(INPUT_DELAY, Math.min(12, m.delay));
        if (m.echo !== undefined) { this.send({ t: 'chat', echoBack: m.echo }); if (m.fps) NetStats.rivalFps = m.fps; }
        if (m.echoBack !== undefined) {
          const ms = performance.now() - m.echoBack;
          NetStats.rivalPings.push({ t: NetStats.now(), ms: Math.round(ms) });
          if (NetStats.rivalPings.length > 600) NetStats.rivalPings.shift();
          if (ms > 250) NetStats.event('ping_rival_alto', ms);
        }
        break;
      case 'error': this.fail(m.msg === 'version' ? 'version' : 'server'); return;
      case 'pong': {
        this.ping = Math.round(performance.now() - m.ts);
        NetStats.srvPings.push({ t: NetStats.now(), ms: this.ping });
        if (NetStats.srvPings.length > 600) NetStats.srvPings.shift();
        if (this.ping > 200) NetStats.event('ping_servidor_alto', this.ping);
        return;
      }
      case 'left': this.rival.left = true; break;
      case 'cur': this.rival.cur = m.i; break;
      case 'lock': this.rival.cur = m.i; this.rival.locked = true; break;
      case 'unlock': this.rival.locked = false; break;
      case 'again': if (m.g === this.fightId) this.rival.again = true; break;
      case 'in': {
        // Huecos: si pasa mucho tiempo sin recibir teclas del rival, algo frenó la red (o su PC)
        const now = performance.now();
        if (NetStats.lastIn) {
          const gap = now - NetStats.lastIn;
          if (gap > 120 && gap < 5000) { NetStats.gaps++; NetStats.gapMax = Math.max(NetStats.gapMax, gap); NetStats.event('hueco_llegada', gap, { cuadro: m.f }); }
        }
        NetStats.lastIn = now;
        if (!this.inputs.has(m.g)) this.inputs.set(m.g, new Map());
        this.inputs.get(m.g).set(m.f, m.b);
        return;
      }
      case 'sum': this.sums.set(m.g + ':' + m.f, m.h); return;
      default: break;
    }
    this.emit(m);
  },

  // Empieza una pelea nueva (las dos computadoras cuentan igual)
  newFight() {
    this.fightId++;
    this.rival.again = false;
    for (const g of [...this.inputs.keys()]) if (g < this.fightId) this.inputs.delete(g);
    if (!this.inputs.has(this.fightId)) this.inputs.set(this.fightId, new Map());
    return this.fightId;
  },

  on(fn) { this.listeners.add(fn); },
  off(fn) { this.listeners.delete(fn); },
  emit(m) { for (const fn of [...this.listeners]) fn(m); },
};

// Huella del estado de la pelea, para detectar si las dos computadoras se desincronizan.
function fightHash(scene) {
  const v = [];
  for (const f of scene.fighters) v.push(f.hp, f.x, f.y, f.power, f.wins);
  v.push(scene.projectiles.length, scene.timeLeft);
  let h = 2166136261;
  const s = v.map((x) => (Math.round(x * 1000) / 1000).toFixed(3)).join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Arma el informe de red para mandarlo y analizarlo
function netReport(scene) {
  const S = NetStats;
  return {
    juego: GAME_BUILD, lado: Net.side, retraso_cuadros: Net.delay, duracion_s: Math.round(S.now() / 1000),
    navegador: navigator.userAgent, pantalla: `${screen.width}x${screen.height}`,
    resumen: {
      ping_servidor: S.window(S.srvPings, 99999), ping_rival: S.window(S.rivalPings, 99999),
      pausas_por_lag: S.stalls, pausas_total_ms: Math.round(S.stallTotal), pausa_mas_larga_ms: Math.round(S.stallMax),
      huecos_de_llegada: S.gaps, hueco_mas_largo_ms: Math.round(S.gapMax),
      trabones_de_esta_pc: S.hitches, trabon_mas_largo_ms: Math.round(S.hitchMax),
      fps_propios: scene ? Math.round(scene.game.loop.actualFps) : 0, fps_rival: S.rivalFps,
      desincronizado: !!(scene && scene.desync),
    },
    pings_servidor: S.srvPings, pings_rival: S.rivalPings, eventos: S.events,
  };
}
function downloadNetReport(scene) {
  const data = JSON.stringify(netReport(scene), null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const d = new Date();
  a.download = `informe-lag-${Net.side === 0 ? 'izquierda' : 'derecha'}-${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
}
