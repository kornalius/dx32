import _ from 'lodash';
import DOS from '../dos.js';
import Port from '../port.js';
import Sound from '../sound.js';
import { Floppy, Entry, _OPEN, _LOCK } from '../floppy.js';
import { mixin, delay, rnd, io_error } from '../globals.js';


class Drive extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.dos = new DOS(this);

    this._loadSound({ name: 'insert', path: 'disk_insert.wav', loop: false, });
    this._loadSound({ name: 'eject', path: 'disk_eject.wav', loop: false, });
    this._loadSound({ name: 'spin', path: 'disk_spin.wav', loop: true, });
    this._loadSound({ name: 'read1', path: 'disk_read1.wav', loop: false, });
    this._loadSound({ name: 'read2', path: 'disk_read2.wav', loop: false, });
    this._loadSound({ name: 'read3', path: 'disk_read3.wav', loop: false, });
    this._loadSound({ name: 'read4', path: 'disk_read4.wav', loop: false, });
    this._loadSound({ name: 'write1', path: 'disk_write1.wav', loop: false, });
    this._loadSound({ name: 'write2', path: 'disk_write2.wav', loop: false, });

    this._operations = {
      insert: { min_time: 1000, max_time: 2000, sound: 'insert' },
      eject:  { min_time: 1000, max_time: 2000, sound: 'eject' },
      spin:   { min_time: 1000, max_time: 2500 },
      seek:   { min_time: 100, max_time: 250, sound: 'read', random_sound: true },
      read:   { min_time: 250, max_time: 500, sound: 'read', random_sound: true },
      write:  { min_time: 500, max_time: 1500, sound: 'write', random_sound: true },
    };

    this.floppy = null;
    this.pos = 0;

    this._spinning = null;
    this._stopSpinBound = this._stopSpin.bind(this);

    var that = this;
    setTimeout(() => {
      var f = new Floppy(that);
      that.insert(f);
      that.dos.format();
      that.dos.create('myfile.txt', 'MY DATA IS FUCKING COOL');
      // that.when_finished_spinning(() => { delay(500); that.eject(); });
    }, 2000);
  }

  boot (cold = false) {
    super.boot(cold);

    if (cold) {
    }
  }

  reset () {
    super.reset();

    for (var k in this._sounds) {
      var s = this._sounds[k];
      if (s.playable) {
        s.stop();
      }
    }
  }

  shut () {
    super.shut();
    this._sounds = {};
  }

  _operation (name, size = 0) {
    if (name !== 'insert' && name !== 'eject') {
      this._startSpin();
      if (!this._checkFloppy()) {
        return;
      }
    }

    var _op = this._operations[name];

    var max = 1;
    if (size) {
      max = size ? Math.max(Math.trunc(size / 128), 1) : 1;
    }

    var min_time = _op ? _op.min_time : 250;
    var max_time = _op ? _op.max_time : 500;
    var sound = _op ? _op.sound : null;

    while (max > 0) {
      var t = rnd(min_time, max_time);
      // console.log(name, '=>', size, t);

      if (sound) {
        this._playSound(sound, {}, _op.random_sound);
      }

      delay(t);

      max--;
    }
  }

  when_finished_spinning (cb) {
    if (this._spinning) {
      var that = this;
      setTimeout(() => { that.when_finished_spinning(cb); }, 500);
    }
    else {
      cb();
    }
  }

  _startSpin () {
    if (!this._spinning) {
      this._playSound('spin', { loop: true });
    }
    clearTimeout(this._spinning);
    this._spinning = setTimeout(this._stopSpinBound, rnd(this._operations.spin.min_time, this._operations.spin.max_time));
  }

  _stopSpin () {
    clearTimeout(this._spinning);
    this._spinning = null;
    this._sounds.spin.stop();
  }

  _checkFloppy () {
    if (!this.loaded()) {
      io_error(this, 0x08);
      return false;
    }
    return true;
  }

  loaded () { return this.floppy !== null; }

  eject () {
    this.dos.eject();
    if (this.loaded()) {
      this.floppy.eject();
      this.floppy = null;
      this._operation('eject');
    }
    else {
      io_error(this, 0x08);
      return;
    }
  }

  insert (floppy) {
    this.dos.insert(floppy);
    if (!this.loaded()) {
      this.floppy = floppy;
      this._operation('insert');
      this.floppy.insert(this);
    }
    else {
      io_error(this, 0x07);
      return;
    }
  }

  seek_by (offset) { this.seek(this.pos + offset); }

  seek (pos) {
    if (pos) {
      this.pos = pos === -1 ? this.floppy.size - 1 : pos;
      this._operation('seek', Math.abs(this.pos - pos));
    }
  }

  read (addr, size) {
    var start = 0;
    var b;
    if (addr) {
      b = _vm.mem;
      start = addr;
    }
    else {
      b = new Buffer(size);
    }
    this.floppy.mem.copy(b, start, this.pos, this.pos + size);
    this._operation('read', size);
    this.seek_by(size);
  }

  write (addr, size) {
    _vm.mem.copy(this.floppy.mem, this.pos, addr, size);
    this._operation('write', size);
    this.dos.flush();
    this.seek_by(size);
  }

}

mixin(Drive.prototype, Sound.prototype);

export default Drive;
