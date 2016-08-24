import { runtime_error } from '../globals.js'


const _INT_STOPPED = 0
const _INT_RUNNING = 1
const _INT_PAUSED = 2

class Interrupt {

  int_init () {
    this.interrupts = {}
  }

  int_find (name) { return this.interrupts[name] }

  int_create (name, fn, ms = 500) {
    if (!this.int_find(name)) {
      this.interrupts[name] = { name, status: _INT_RUNNING, ms, fn, last: 0 }
    }
    else {
      runtime_error(this, 0x05)
    }
  }

  int_resume (name) {
    if (this.int_find(name)) {
      this.interrupts[name].status = _INT_RUNNING
      this.interrupts[name].last = performance.now()
    }
    else {
      runtime_error(this, 0x06)
    }
  }

  int_pause (name) {
    if (this.int_find(name)) {
      this.interrupts[name].status = _INT_PAUSED
    }
    else {
      runtime_error(this, 0x06)
    }
  }

  int_stop (name) {
    if (this.int_find(name)) {
      delete this.interrupts[name]
    }
    else {
      runtime_error(this, 0x06)
    }
  }

  int_stop_all () {
    for (var k in this.interrupts) {
      this.int_stop(k)
    }
    this.interrupts = {}
  }

  int_tick (t) {
    for (var k in this.interrupts) {
      var i = this.interrupts[k]
      if (i.status === _INT_RUNNING) {
        var delay = t - i.last
        if (delay >= i.ms) {
          i.fn.apply(this, [delay - i.ms])
          i.last = t
        }
      }
    }
  }
}

export default {
  Interrupt,
  _INT_STOPPED,
  _INT_RUNNING,
  _INT_PAUSED,
}
