import { _VM_RUNNING, _VM_PAUSED, _VM_STOPPED } from './vm.js'


export const _DBG_STEP_OUT = -1
export const _DBG_STEP_IN = -2

export class Debugger {

  dbg_init () {
    this.dbg_lines_display = 10
    this.dbg_reset()
  }

  dbg_tick () {
  }

  dbg_reset () {
    this.dbg_current_line = -1
    this.dbg_lines = []
    this.dbg_frames = []
  }

  dbg_shut () {
  }

  dbg_src (text) {
    this.dbg_lines = text.split('\n')
    this.dbg_current_line = -1
  }

  dbg_line (line) {
    this.dbg_current_line = line
  }

  dbg_frame (name, enter) {
    if (enter) {
      this.dbg_frames.push({ name })
    }
    else {
      this.dbg_frames.pop()
    }
  }

  dbg_brk () {
    this.status = _VM_PAUSED
  }

  dbg_step (inside = false) {
    this.status = inside ? _.isNumber(inside) ? inside : _DBG_STEP_IN : _DBG_STEP_OUT
  }

  dbg_run () {
    if (this.status === _VM_PAUSED) {
      this.status = _VM_RUNNING
    }
  }

  dbg_stop () {
    this.status = _VM_STOPPED
    this.dbg_current_line = -1
  }

  dbg_list (type) {
    let l = []

    switch (type) {
      case 'frames':
      case 'f':
        for (let f of this.dbg_frames) {
          l.shift(f.name)
        }
        break

      default:
        for (let i = Math.max(0, this.dbg_current_line - this.dbg_lines_display); i < Math.min(this.dbg_current_line + this.dbg_lines_display, this.dbg_lines.length); i++) {
          l.push(this.dbg_lines[i])
        }
    }

    return l
  }

}
