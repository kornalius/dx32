import { runtime_error } from '../globals.js'


export const _INT_STOPPED = 0
export const _INT_RUNNING = 1
export const _INT_PAUSED = 2

export class Interrupt {

  int_init () {
    this.interrupts = {}
  }

  int_reset () {
    this.int_stop_all()
  }

  int_shut () {
    this.int_reset()
  }

  int_find (name) { return this.interrupts[name] }

  int_create (name, fn, ms = 500) {
    if (!this.int_find(name)) {
      this.interrupts[name] = { name, status: _INT_RUNNING, ms, fn, last: 0 }
    }
    else {
      runtime_error(0x06)
    }
  }

  int_resume (name) {
    if (this.int_find(name)) {
      this.interrupts[name].status = _INT_RUNNING
      this.interrupts[name].last = performance.now()
    }
    else {
      runtime_error(0x07)
    }
  }

  int_pause (name) {
    if (this.int_find(name)) {
      this.interrupts[name].status = _INT_PAUSED
    }
    else {
      runtime_error(0x07)
    }
  }

  int_stop (name) {
    if (this.int_find(name)) {
      delete this.interrupts[name]
    }
    else {
      runtime_error(0x07)
    }
  }

  int_stop_all () {
    for (let k in this.interrupts) {
      this.int_stop(k)
    }
    this.interrupts = {}
  }

  int_tick (t) {
    for (let k in this.interrupts) {
      let i = this.interrupts[k]
      if (i.status === _INT_RUNNING) {
        let delay = t - i.last
        if (delay >= i.ms) {
          i.fn.apply(this, [delay - i.ms])
          i.last = t
        }
      }
    }
  }

}
