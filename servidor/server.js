// Servidor online de "Héroes en Combate".
// Hace dos cosas: empareja al que busca rival con el que está esperando,
// y durante la partida le pasa a cada uno los mensajes del otro (sus teclas).
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8787);
const PROTO = 1; // versión del protocolo: si cambia, el juego pide recargar la página
const RELAY = new Set(['cur', 'lock', 'unlock', 'in', 'sum', 'again', 'chat']);

let waiting = null; // jugador esperando rival
let nextId = 1;
const log = (...a) => console.log(new Date().toISOString(), ...a);

const server = http.createServer((req, res) => {
  // Página de prueba: https://tu-servidor/ muestra que está andando
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(`Servidor de Héroes en Combate funcionando. Esperando: ${waiting ? 1 : 0}\n`);
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
  ws.id = nextId++;
  ws.alive = true;
  ws.partner = null;
  ws.hello = false;
  log(`#${ws.id} conectado desde ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);

  ws.on('pong', () => { ws.alive = true; });

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

    if (RELAY.has(m.t) && ws.partner) ws.partner.send(data.toString());
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
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    ws.ping();
  }
}, 10000);

server.listen(PORT, '127.0.0.1', () => log(`Servidor escuchando en 127.0.0.1:${PORT}`));
