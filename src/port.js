import _ from 'lodash';
import { defaults, error } from './globals.js';


class Port {

  constructor (vm, port_number, mem_size = defaults.port.mem_size) {
    var start = 0;
    for (var k in _vm.ports) {
      start += _vm.ports[k].mem_size;
    }

    this.port_number = port_number;
    vm.ports[port_number] = this;

    this.mem_size = mem_size;

    this.top = start;
    this.bottom = this.top + this.mem_size;
  }

  boot (cold = false) {
    this.reset();
  }

  reset () {
  }

  shut () {
    this.reset();
    delete _vm.ports[port_number];
  }

  tick () {
    var n = Date.now();
    this.tick(n - this._last_tick);
    this._last_tick = n;
  }

}

export default Port
