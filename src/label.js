import _ from 'lodash';


class Label {

  constructor (frame, addr, size = 4, len = 1) {
    this.frame = frame;
    this.port = frame.port;

    this.addr = addr;
    this.size = size;
    this.len = len;
    this._sz = size * len;

    this.alloc();
  }

  alloc () {
  }

  free () {
  }

  isFn () { return _.isFunction(this.addr); }

  get () {
    switch (this._sz)
    {
      case 1:
        return _vm.rb(this.addr);
      case 2:
        return _vm.rw(this.addr);
      case 4:
        return _vm.rd(this.addr);
      default:
        var b = new Buffer(this._sz);
        _vm.mem.copy(b, 0, this.addr, this.addr + this._sz);
        return b;
    }
  }

  set (value) {
    switch (this._sz)
    {
      case 1:
        return _vm.wb(this.addr, value);
      case 2:
        return _vm.ww(this.addr, value);
      case 4:
        return _vm.wd(this.addr, value);
      default:
        value.copy(_vm.mem, this.addr, 0, this._sz - 1);
        break;
    }
  }

  call (...args) {
    if (!_vm.halted && !_vm.paused) {
      this._last_tick = Date.now();
      if (_.isFunction(this.addr)) {
        this.addr(...args);
      }
      else {
        _vm.hlt(this, 0x04);
      }
    }
  }

}

export default Label;
