// Test Phaser Container and Graphics parentContainer
const fs = require('fs');

// Mock DOM
global.window = global;
global.document = {
    createElement: () => ({ getContext: () => ({}) }),
    documentElement: {},
};
global.navigator = { userAgent: 'node' };

const Phaser = require('./lib/phaser.min.js');

const game = new Phaser.Game({
    type: Phaser.HEADLESS,
    width: 800,
    height: 600,
    scene: {
        create() {
            const box = this.add.container(135, 0);
            const g = this.add.graphics({ x: 0, y: 282 });
            console.log("g before box.add:", { x: g.x, y: g.y, parentContainer: g.parentContainer ? 'exists' : null });
            box.add(g);
            console.log("g after box.add:", { x: g.x, y: g.y, parentContainer: g.parentContainer ? 'exists' : null });
            
            const cont2 = this.add.container(g.x, g.y);
            console.log("cont2 created, parentContainer:", cont2.parentContainer ? 'exists' : null);
            if (g.parentContainer) {
                g.parentContainer.add(cont2);
                console.log("cont2 added to box, parentContainer:", cont2.parentContainer === box ? 'is box' : 'not box');
            }
            
            // Check world transform
            const matrix = cont2.getWorldTransformMatrix();
            console.log("cont2 world transform matrix:", { tx: matrix.tx, ty: matrix.ty });
            
            process.exit(0);
        }
    }
});
