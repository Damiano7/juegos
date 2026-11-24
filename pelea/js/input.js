// Controles: teclado (dos jugadores en el mismo teclado) + joysticks opcionales.
const KEYMAPS = {
  // 1 jugador contra la máquina: flechas para moverse y A S D para atacar
  solo: {
    left: ['LEFT'], right: ['RIGHT'], up: ['UP'], down: ['DOWN'],
    punch: ['A'], kick: ['S'], special: ['D'],
  },
  p1: {
    left: ['A'], right: ['D'], up: ['W'], down: ['S'],
    punch: ['F'], kick: ['G'], special: ['H'],
  },
  p2: {
    left: ['LEFT'], right: ['RIGHT'], up: ['UP'], down: ['DOWN'],
    punch: ['NUMPAD_ONE', 'I'], kick: ['NUMPAD_TWO', 'O'], special: ['NUMPAD_THREE', 'P'],
  },
};

const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'special'];

class Controls {
  constructor(scene, mapName, padIndex) {
    this.padIndex = padIndex;
    this.keys = {};
    const map = KEYMAPS[mapName];
    this.tapped = {};
    for (const a of ACTIONS) {
      this.keys[a] = map[a].map((k) => {
        const key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[k], true, false);
        // Guardamos los toques aunque la tecla se suelte antes del próximo cuadro.
        key.on('down', () => { this.tapped[a] = true; });
        return key;
      });
    }
    this.held = {};
    this.prev = {};
    this.pressed = {};
    for (const a of ACTIONS) { this.held[a] = false; this.prev[a] = false; this.pressed[a] = false; }
  }

  readPad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && pads[this.padIndex];
    if (!p || !p.connected) return out;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const ax = p.axes[0] || 0;
    const ay = p.axes[1] || 0;
    out.left = b(14) || ax < -0.5;
    out.right = b(15) || ax > 0.5;
    out.up = b(12) || ay < -0.6 || b(3);
    out.down = b(13) || ay > 0.6;
    out.punch = b(0) || b(2);
    out.kick = b(1);
    out.special = b(5) || b(4) || b(7) || b(6);
    return out;
  }

  update() {
    const pad = this.readPad();
    for (const a of ACTIONS) {
      const k = this.keys[a].some((key) => key.isDown);
      this.prev[a] = this.held[a];
      this.held[a] = k || !!pad[a];
      this.pressed[a] = (this.held[a] && !this.prev[a]) || !!this.tapped[a];
      this.tapped[a] = false;
    }
    return this;
  }
}

// Una "intención" vacía, que usan la IA y los momentos sin control.
function emptyIntent() {
  const held = {}; const pressed = {};
  for (const a of ACTIONS) { held[a] = false; pressed[a] = false; }
  return { held, pressed };
}
