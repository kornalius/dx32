
const _RUNNING = 0;
const _STEP_OUT = -1;
const _STEP_IN = -2;
const _PAUSED = -3;
const _STOPPED = -4;


class Debugger {

  constructor (vm) {
    this.vm = vm;
    this.status = _RUNNING;
    this.current = -1;
    this.lines = [];
  }

  src (text) {
    this.lines = text.split('\n');
    this.current = -1;
  }

  line (line) {
    this.current = line;
  }

  brk () {
    this.status = _PAUSED;
  }

  step (_in = false) {
    this.status = _in ? _STEP_IN : _STEP_OUT;
  }

  run () {
    this.status = _RUNNING;
  }

  stop () {
    this.status = _STOPPED;
    this.current = -1;
  }
}

export default Debugger;
