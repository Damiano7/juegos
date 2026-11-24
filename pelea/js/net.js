// Conexión con el servidor online.
// Las dos computadoras calculan la misma pelea; por internet solo viajan las teclas.
const NET_PROTO = 1;      // tiene que coincidir con el servidor
const INPUT_DELAY = 4;    // cuadros de retraso (4/60 s ≈ 67 ms): da tiempo a que lleguen las teclas del otro

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
    this.pingTimer = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 2000);
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
        break;
      case 'error': this.fail(m.msg === 'version' ? 'version' : 'server'); return;
      case 'pong': this.ping = Math.round(performance.now() - m.ts); return;
      case 'left': this.rival.left = true; break;
      case 'cur': this.rival.cur = m.i; break;
      case 'lock': this.rival.cur = m.i; this.rival.locked = true; break;
      case 'unlock': this.rival.locked = false; break;
      case 'again': if (m.g === this.fightId) this.rival.again = true; break;
      case 'in': {
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
