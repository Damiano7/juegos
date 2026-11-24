// Arranque del juego.
function startGame() {
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#140a26',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: [MenuScene, SelectScene, OnlineScene, FightScene],
});
Object.assign(window, { game });
}
// Esperar a que carguen las tipografías antes de arrancar.
Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('bold 20px Rajdhani')]).catch(() => {}).then(startGame);
