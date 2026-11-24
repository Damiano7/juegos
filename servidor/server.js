// Servidor online de "Héroes en Combate".
// Hace dos cosas: empareja al que busca rival con el que está esperando,
// y durante la partida le pasa a cada uno los mensajes del otro (sus teclas).
const http = require('http');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8787);
// HOST=0.0.0.0 permite usarlo desde otras PCs de la casa (prueba en red local)
const HOST = process.env.HOST || '127.0.0.1';
// Solo para pruebas: demora artificial al pasar mensajes (ms fijos + ms al azar)
const SIM_LAG = Number(process.env.SIM_LAG || 0), SIM_JITTER = Number(process.env.SIM_JITTER || 0);
const PROTO = 1; // versión del protocolo: si cambia, el juego pide recargar la página
const RELAY = new Set(['cur', 'lock', 'unlock', 'in', 'sum', 'again', 'chat']);

let waiting = null; // jugador esperando rival
let nextId = 1;
const startedAt = Date.now();

// ---------- Diagnóstico: ¿se traba el servidor? ----------
// Cada 100 ms medimos cuánto tarda en volver el turno: si la VPS está sin CPU, se nota acá.
const loopLag = []; // { t, ms }
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const lag = now - lastTick - 100;
  lastTick = now;
  if (lag > 20) {
    loopLag.push({ t: now, ms: lag });
    if (loopLag.length > 500) loopLag.shift();
    if (lag > 100) log(`⚠ el servidor se trabó ${lag} ms (VPS sin CPU o muy cargada)`);
  }
}, 100);
let relayed = 0;
const log = (...a) => console.log(new Date().toISOString(), ...a);

const server = http.createServer((req, res) => {
  // Página de prueba: https://tu-servidor/ muestra que está andando
  if (req.url && req.url.startsWith('/stats')) {
    const now = Date.now();
    const last = (ms) => loopLag.filter((p) => now - p.t < ms);
    const clients = [...wss.clients].map((c) => ({ id: c.id, ping_ms: c.rtt, ping_max_ms: c.rttMax, en_partida: !!c.partner }));
    const body = {
      funcionando_desde_min: Math.round((now - startedAt) / 60000),
      conectados: wss.clients.size, esperando: waiting ? 1 : 0,
      trabones_servidor_ultimo_minuto: last(60000).length,
      peor_trabon_servidor_ultimo_minuto_ms: Math.max(0, ...last(60000).map((p) => p.ms)),
      trabones_servidor_ultima_hora: last(3600000).length,
      peor_trabon_servidor_ultima_hora_ms: Math.max(0, ...last(3600000).map((p) => p.ms)),
      carga_cpu_1_5_15_min: os.loadavg().map((x) => +x.toFixed(2)), nucleos: os.cpus().length,
      memoria_libre_mb: Math.round(os.freemem() / 1048576),
      mensajes_pasados: relayed, jugadores: clients,
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(body, null, 2));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(`Servidor de Héroes en Combate funcionando. Esperando: ${waiting ? 1 : 0}\nDiagnóstico: /stats\n`);
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function unpair(ws, notify) {
  if (waiting === ws) waiting = null;
  const p = ws.partner;
  ws.partner = null;
  if (p) {
    p.partner = null;
    if (notify) send(p, { t: 'left' });
  }
}

wss.on('connection', (ws, req) => {
  if (req.socket && req.socket.setNoDelay) req.socket.setNoDelay(true);
  ws.id = nextId++;
  ws.alive = true;
  ws.partner = null;
  ws.hello = false;
  log(`#${ws.id} conectado desde ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);

  ws.rtt = 0; ws.rttMax = 0;
  ws.on('pong', () => {
    ws.alive = true;
    if (ws.pingAt) {
      ws.rtt = Date.now() - ws.pingAt;
      ws.rttMax = Math.max(ws.rttMax, ws.rtt);
      if (ws.rtt > 250) log(`#${ws.id}: ping alto ${ws.rtt} ms (su internet o la red hasta la VPS)`);
    }
  });

  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'ping') { send(ws, { t: 'pong', ts: m.ts }); return; }

    if (m.t === 'hello') {
      if (m.v !== PROTO) { send(ws, { t: 'error', msg: 'version' }); ws.close(); return; }
      ws.hello = true;
      send(ws, { t: 'hello', ok: true });
      return;
    }
    if (!ws.hello) return;

    if (m.t === 'find') {
      unpair(ws, true);
      if (waiting && waiting !== ws && waiting.readyState === 1) {
        const a = waiting, b = ws;
        waiting = null;
        a.partner = b; b.partner = a;
        send(a, { t: 'match', side: 0 });
        send(b, { t: 'match', side: 1 });
        log(`partida: #${a.id} vs #${b.id}`);
      } else {
        waiting = ws;
        send(ws, { t: 'waiting' });
      }
      return;
    }

    if (m.t === 'leave') { unpair(ws, true); return; }

    if (RELAY.has(m.t) && ws.partner) {
      relayed++;
      const p = ws.partner, txt = data.toString();
      if (SIM_LAG || SIM_JITTER) setTimeout(() => { if (p.readyState === 1) p.send(txt); }, SIM_LAG + Math.random() * SIM_JITTER);
      else p.send(txt);
    }
  });

  ws.on('close', () => {
    log(`#${ws.id} desconectado`);
    unpair(ws, true);
  });
  ws.on('error', () => {});
});

// Cortar conexiones muertas (por ejemplo, si se apagó la compu del otro)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      ws.missed = (ws.missed || 0) + 1;
      if (ws.missed >= 3) { ws.terminate(); continue; } // 15 s sin respuesta: se cortó
    } else ws.missed = 0;
    ws.alive = false;
    ws.pingAt = Date.now();
    ws.ping();
  }
}, 5000);

server.listen(PORT, HOST, () => log(`Servidor escuchando en ${HOST}:${PORT}`));
