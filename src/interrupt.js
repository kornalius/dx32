import { runtime_error } from './globals.js';

const _STOPPED = 0;
const _RUNNING = 1;
const _PAUSED = 2;

class Interrupt {

  init_interrupts () {
    this.interrupts = {};
    this.paused = [];
  }

  find_int (name) { return this.interrupts[name]; }

  int (name, fn, ms = 500) {
    if (!this.find_int(name)) {
      this.interrupts[name] = { name, status: _RUNNING, ms, fn, last: 0 };
    }
    else {
      runtime_error(this, 0x05);
    }
  }

  resume_int (name) {
    if (this.find_int(name)) {
      this.interrupts[name].status = _RUNNING;
      this.interrupts[name].last = performance.now();
    }
    else {
      runtime_error(this, 0x06);
    }
  }

  pause_int (name) {
    if (this.find_int(name)) {
      this.interrupts[name].status = _PAUSED;
    }
    else {
      runtime_error(this, 0x06);
    }
  }

  stop_int (name) {
    if (this.find_int(name)) {
      delete this.interrupts[name];
    }
    else {
      runtime_error(this, 0x06);
    }
  }

  stop_ints () {
    for (var k in this.interrupts) {
      this.stop_int(k);
    }
    this.interrupts = {};
  }

  process_ints () {
    var t = performance.now();
    for (var k in this.interrupts) {
      var i = this.interrupts[k];
      if (i.status === _RUNNING) {
        var delay = t - i.last;
        if (delay >= i.ms) {
          i.fn.apply(this, [delay - i.ms]);
          i.last = t;
        }
      }
    }
  }
}

export default Interrupt;
