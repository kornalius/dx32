import _ from 'lodash';
import { defaults, error } from './globals.js';


class Port {

  constructor (vm, port_number) {
    var top = vm.mm.alloc(4);
    // vm.st(top, port_number);

    this.port_number = port_number;
    vm.ports[port_number] = this;

    this.top = top;
  }

  boot (cold = false) {
    this.reset();
  }

  reset () {
  }

  shut () {
    this.reset();
    // _vm.mm.free(this.top);
    _vm.ports[port_number] = null;
  }

  tick () {
    var n = Date.now();
    this.tick(n - this._last_tick);
    this._last_tick = n;
  }

}

export default Port
