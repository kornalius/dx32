
const _DBG_RUNNING = 0
const _DBG_STEP_OUT = -1
const _DBG_STEP_IN = -2
const _DBG_PAUSED = -3
const _DBG_STOPPED = -4

class Debugger {

  constructor (vm) {
    this.vm = vm
    this.status = _DBG_RUNNING
    this.current_line = -1
    this.lines = []
    this.callstack = []
  }

  src (text) {
    this.lines = text.split('\n')
    this.current_line = -1
  }

  line (line) {
    this.current_line = line
  }

  frame (name, enter) {
    if (enter) {
      this.callstack.push({ name })
    }
    else {
      this.callstack.pop()
    }
  }

  brk () {
    this.status = _DBG_PAUSED
  }

  step (_in = false) {
    this.status = _in ? _.isNumber(_in) ? _in : _DBG_STEP_IN : _DBG_STEP_OUT
  }

  run () {
    if (this.status === _DBG_PAUSED) {
      this.status = _DBG_RUNNING
    }
  }

  stop () {
    this.status = _DBG_STOPPED
    this.current_line = -1
  }

  list (type) {
    var l = []

    switch (type)
    {
      case 'frames':
      case 'f':
        for (var f of this.frames) {
          l.shift(f.name)
        }
        break

      default:
        for (var i = Math.max(0, this.current_line - this.lines_display); i < Math.min(this.current_line + this.lines_display, this.lines.length) i++) {
          l.push(this.lines[i])
        }
    }

    return l
  }

}

export default {
  Debugger,
  _DBG_RUNNING,
  _DBG_STEP_OUT,
  _DBG_STEP_IN,
  _DBG_PAUSED,
  _DBG_STOPPED,
}
