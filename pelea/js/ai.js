// La máquina: decide cada cierto tiempo qué hacer, según la dificultad.
const AI_LEVELS = {
  facil:   { name: 'FÁCIL',   react: 0.5,  block: 0.12, aggr: 0.45, combo: 0.12, superUse: 0.5, jump: 0.06 },
  normal:  { name: 'NORMAL',  react: 0.3,  block: 0.38, aggr: 0.65, combo: 0.3,  superUse: 0.8, jump: 0.1 },
  dificil: { name: 'DIFÍCIL', react: 0.16, block: 0.7,  aggr: 0.85, combo: 0.5,  superUse: 1.0, jump: 0.14 },
};
const AI_ORDER = ['facil', 'normal', 'dificil'];

class AIController {
  constructor(fighter, level) {
    this.f = fighter;
    this.L = AI_LEVELS[level] || AI_LEVELS.normal;
    this.timer = 0.6;
    this.plan = { left: false, right: false, down: false, up: false, until: 0 };
    this.clock = 0;
  }

  getIntent(dt, opp, scene) {
    const f = this.f, L = this.L;
    this.clock += dt;
    const intent = emptyIntent();
    if (!f.canAct || f.busy) { this.timer = Math.min(this.timer, L.react * 0.5); return intent; }

    this.timer -= dt;
    const dx = opp.x - f.x;
    const dist = Math.abs(dx);
    const toward = dx > 0 ? 'right' : 'left';
    const away = dx > 0 ? 'left' : 'right';

    if (this.timer <= 0) {
      this.timer = L.react * (0.6 + Math.random() * 0.8);
      const R = Math.random();
      const incoming = scene.projectiles.some((p) => p.owner === opp && Math.abs(p.x - f.x) < 260 && Math.sign(p.vx) === Math.sign(f.x - p.x));
      const threatened = (opp.move && !opp.move.isSuper && dist < 170) || incoming;
      this.plan = { until: this.clock + 0.3 };

      if (opp.ko) {
        // nada
      } else if (threatened && R < L.block) {
        if (incoming && Math.random() < 0.4) intent.pressed.up = true;
        else this.plan = { down: true, until: this.clock + 0.4 };
      } else if (f.power >= 100 && Math.random() < L.superUse && dist < 520 && opp.stuckT <= 0) {
        intent.pressed.special = true;
      } else if (opp.stuckT > 0 && dist < 110) {
        intent.pressed[Math.random() < 0.5 ? 'punch' : 'kick'] = true;
      } else if (opp.stuckT > 0) {
        this.plan = { [toward]: true, until: this.clock + 0.4 };
      } else if (dist < 100) {
        const r = Math.random();
        if (r < L.combo * 0.6 && f.comboCd <= 0) { f.startCombo(scene, opp); }
        else if (r < 0.5) intent.pressed.punch = true;
        else if (r < 0.8) intent.pressed.kick = true;
        else if (r < 0.9) this.plan = { [away]: true, until: this.clock + 0.25 };
        else intent.pressed.up = true;
      } else if (dist < 420 && Math.random() < L.combo && f.comboCd <= 0) {
        f.startCombo(scene, opp);
      } else if (Math.random() < L.aggr) {
        this.plan = { [toward]: true, until: this.clock + 0.3 + Math.random() * 0.4 };
        if (Math.random() < L.jump) intent.pressed.up = true;
      } else if (Math.random() < 0.3) {
        this.plan = { [away]: true, until: this.clock + 0.25 };
      }
    }

    if (this.clock < this.plan.until) {
      for (const k of ['left', 'right', 'down', 'up']) if (this.plan[k]) intent.held[k] = true;
    }
    // Protón usa los propulsores si está en el aire
    if (f.def.fuel && !f.onGround && Math.random() < 0.5) intent.held.up = true;
    return intent;
  }
}
