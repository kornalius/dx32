import _ from 'lodash';
import { defaults, error } from './globals.js';
import hexy from 'hexy';


class MemoryManager {

  constructor (vm) {
    this.blocks = [];
    this.vm = vm;

    setInterval( (() => {
      this.collect();
    }).bind(this), 30 * 1024);
  }

  alloc (sz) {
    var n = 0;

    for (var b of this.blocks) {

      if (b.bottom > n) {
        n = b.bottom;
      }

      if (!b.used && b.size >= sz) {
        if (b.size === sz) {
          b.used = true;
          return b.top;
        }
        var ob = b.bottom;
        b.bottom = b.top + sz;
        b.size = sz;
        b.used = true;

        this.blocks.push({ top: b.bottom + 1, bottom: ob, size: ob - (b.bottom + 1), used: false });

        return b.top;
      }
    }

    if (n + 1 + sz > this.vm.bottom) {
      this.vm.hlt();
      return;
    }

    this.blocks.push({ top: n + 1, bottom: n + 1 + sz, size: sz, used: true });

    return n + 1;
  }

  free (addr) {
    for (var b of this.blocks) {
      if (b.top === addr) {
        b.used = false;
        break;
      }
    }
  }

  size (addr) {
    for (var b of this.blocks) {
      if (b.top === addr) {
        return b.bottom - b.top;
      }
    }
    return -1;
  }

  collect () {
    var n = [];
    for (var b of this.blocks) {
      if (!b.used) {
        n.push(b);
      }
    }
    this.blocks = n;
  }

  dump () {
    console.log('memory blocks dump');
    for (var b of this.blocks) {
      console.log(hexy.hexy(this.vm.mem, { offset: b.top, length: Math.min(255, b.size), display_offset: b.top, width: 16, caps: 'upper', indent: 2 }));
    }
  }
}

export default MemoryManager;
