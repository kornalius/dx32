import Port from '../port.js';
import Stack from '../stack.js';
import { mixin } from '../globals.js';


class Mouse extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.init_stack(vm.mm.alloc(32), 1024, 2);

    var stage = vm.ports[1].stage;
    if (stage) {
      stage.interactive = true;
      stage.on('mousedown', this.onLeftButtonDown.bind(this));
      stage.on('rightdown', this.onRightButtonDown.bind(this));
      stage.on('touchstart', this.onLeftButtonDown.bind(this));
      stage.on('mousemove', this.onButtonMove.bind(this));
      stage.on('mouseup', this.onButtonUp.bind(this));
      stage.on('touchend', this.onButtonUp.bind(this));
      stage.on('mouseupoutside', this.onButtonUp.bind(this));
      stage.on('touchendoutside', this.onButtonUp.bind(this));
    }
  }

  onLeftButtonDown () {
    this.push(1);
  }

  onRightButtonDown () {
    this.push(2);
  }

  onButtonMove (e) {
    this.push(3, e.data.global.x, e.data.global.y);
  }

  onButtonUp () {
    this.push(4);
  }
}

mixin(Mouse.prototype, Stack.prototype);

export default Mouse;
