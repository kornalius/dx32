import Port from '../port.js';
import Stack from '../stack.js';
import { mixin } from '../globals.js';


class Keyboard extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.keys = {};

    this.init_stack(1024, 2);

    window.addEventListener('keydown', this.onKeydown.bind(this));
    window.addEventListener('keyup', this.onKeyup.bind(this));
  }

  onKeydown (e) {
    this.push(1, e.which);
    if (!e.repeat) {
      this.keys[e.which] = 0;
    }
    this.keys[e.which]++;
    // e.preventDefault();
    e.stopPropagation();
  }

  onKeyup (e) {
    this.push(2, e.which);
    delete this.keys[e.which];
    // e.preventDefault();
    e.stopPropagation();
  }

  pressed (which) { return this.keys[which] || false; }

}

mixin(Keyboard.prototype, Stack.prototype);

export default Keyboard;
