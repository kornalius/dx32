import _ from 'lodash';
import { defaults, error } from './globals.js';
import hexy from 'hexy';


class Dict {

  constructor (vm) {
    this.vm = vm;
  }

  make (addr, d) {
    for (var k in d) {
      var key = this.vm.mm.alloc_s(k);
      var value = d[k];
      if (_.isString(value)) {
        value = this.vm.mm.alloc_s(value);
      }
      this.vm.st(addr, key);
      this.vm.st(addr + 4, value);
      addr += 8;
    }
  }

  mix (addr, ...d) {
  }
}

export default Dict;
