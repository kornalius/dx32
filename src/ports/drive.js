import _ from 'lodash';
import Port from '../port.js';
import IO from '../io.js';
import { Floppy, Entry, _OPEN, _LOCK } from '../floppy.js';
import { mixin, rnd, io_error } from '../globals.js';


class Drive extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this._operations_queue = [];

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
      insert:  { min_time: 1000, max_time: 2000 },
      eject:   { min_time: 1000, max_time: 2000 },
      spin:    { min_time: 1000, max_time: 2000 },
      seek_by: { min_time: 100, max_time: 250, sound: 'read', min_sounds: 1, max_sounds: 1, random_sound: true },
      seek:    { min_time: 100, max_time: 250, sound: 'read', min_sounds: 1, max_sounds: 1, random_sound: true },
      read:    { min_time: 100, max_time: 500, sound: 'read', min_sounds: 1, max_sounds: 5, random_sound: true },
      cd:      { min_time: 100, max_time: 100, sound: 'read', min_sounds: 1, max_sounds: 1, random_sound: true },
      fopen:   { min_time: 100, max_time: 250, sound: 'read', min_sounds: 1, max_sounds: 1, random_sound: true },
      fclose:  { min_time: 100, max_time: 100, sound: 'read', min_sounds: 1, max_sounds: 1, random_sound: true },
      write:   { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 3, random_sound: true },
      create:  { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 3, random_sound: true },
      append:  { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 3, random_sound: true },
      flush:   { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 3, random_sound: true },
      delete:  { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 3, random_sound: true },
      format:  { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 5, max_sounds: 10, random_sound: true },
      lock:    { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 2, random_sound: true },
      unlock:  { min_time: 250, max_time: 1500, sound: 'write', min_sounds: 1, max_sounds: 2, random_sound: true },
    };

    this.current = null;
    this.floppy = null;
    this.pos = 0;

    this._spinning = null;
    this._stopSpinBound = this._stopSpin.bind(this);

    var f = new Floppy(this);
    this.insert(f);
    this.format();
    this.create('myfile.txt', 'MY DATA');
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

  _operation (op) {
    var tt = 0;
    for (var o of this._operations_queue) {
      tt += o.elapse;
    }

    op.elapse = rnd(this._operations[op.name].min_time || 500, this._operations[op.name].max_time || 500);
    this._operations_queue.push(op);

    var that = this;
    setTimeout(() => {
      that._next_operation();
    }, tt);
  }

  _next_operation () {
    var op = this._operations_queue.shift();

    if (op.name !== 'insert' && op.name !== 'eject') {
      this._startSpin();
      if (!this._checkFloppy()) {
        return;
      }
    }

    var _op = this._operations[op.name];
    if (_op.sound) {
      this._playSound(_op.sound, {}, _op.min_time, _op.max_time, _op.min_sounds || 1, op.size ? Math.max(Math.trunc(op.size / 128), 1) : _op.max_sounds || 1, _op.random_sound, true);
    }

    var entry;
    var b;
    var start;
    var parent;

    switch (op.name)
    {
      case 'insert':
        if (!this.loaded()) {
          this.floppy = op.floppy;
          this.current = new Entry(this.floppy);
          this.floppy.insert(this);
        }
        else {
          io_error(this, 0x07);
          return;
        }
        this._playSound('insert', {}, this._operations.insert.min_time, this._operations.insert.max_time);
        break;

      case 'eject':
        if (this.loaded()) {
          this.floppy.eject();
          this.current = null;
          this.floppy = null;
        }
        else {
          io_error(this, 0x08);
          return;
        }
        this._playSound('eject', {}, this._operations.eject.min_time, this._operations.eject.max_time);
        break;

      case 'format':
        this.floppy.format();
        break;

      case 'seek_by':
        this.pos += op.offset;
        break;

      case 'seek':
        if (op.pos) {
          this.pos = op.pos === -1 ? this.floppy.size - 1 : op.pos;
        }
        break;

      case 'read':
        start = 0;
        if (op.addr) {
          b = _vm.mem;
          start = op.addr;
        }
        else {
          b = new Buffer(op.size);
        }
        this.floppy.mem.copy(b, start, this.pos, this.pos + op.size);
        this._operation({ name: 'seek_by', offset: op.size });
        break;

      case 'write':
        op.buffer.copy(this.floppy.mem, this.pos, op.addr, op.size);
        this._operation({ name: 'seek_by', offset: op.size });
        this._operation({ name: 'flush' });
        break;

      case 'flush':
        this.floppy.flush();
        break;

      case 'cd':
        this.current = this.floppy._findByName(this.floppy._join(this.floppy._normalize(op.path)));
        break;

      case 'create':
        parent = this.floppy._findByName(this.floppy.dirname(op.path));
        entry = new Entry(this.floppy, this.floppy.entries.length, 0, parent ? parent._uid : 0, this.floppy.basename(op.path), this.floppy.extname(op.path), op.created, op.modified, op.attrs);
        this.floppy.entries.push(entry);
        this._operation({ name: 'flush' });
        break;

      case 'fopen':
        entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isOpened()) {
            entry.attrs |= _OPEN;
            this._operation({ name: 'flush' });
          }
          else {
            io_error(this, 0x02);
          }
        }
        break;

      case 'fread':
        entry = this._findEntry(op.id);
        if (entry) {
          this._operation({ name: 'read', addr: op.addr, size: op.size });
        }
        break;

      case 'fwrite':
        entry = this._findEntry(op.id);
        if (entry) {
          this._operation({ name: 'write', addr: op.addr, size: op.size });
        }
        break;

      case 'append':
        entry = this._findEntry(op.id);
        if (entry) {
        }
        break;

      case 'fclose':
        entry = this._findEntry(op.id);
        if (entry) {
          if (entry._isOpened()) {
            entry.attrs ^= _OPEN;
            this._operation({ name: 'flush' });
          }
          else {
            io_error(this, 0x03);
          }
        }
        break;

      case 'delete':
        entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            entry.uid = 0;
            entry.parent_uid = 0;
            entry.parent = null;
            this._operation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x09);
          }
        }
        break;

      case 'lock':
        entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            entry.attrs |= _LOCK;
            this._operation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x04);
          }
        }
        break;

      case 'unlock':
        entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            entry.attrs ^= _LOCK;
            this._operation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x05);
          }
        }
        break;

    }
  }

  _startSpin () {
    if (!this._spinning) {
      this._playSound('spin', { loop: true }, this._operations.spin.min_time, this._operations.spin.max_time);
    }
    clearTimeout(this._spinning);
    this._spinning = setTimeout(this._stopSpinBound, rnd(this._operations.spin.min_time, this._operations.spin.max_time));
  }

  _stopSpin () {
    clearTimeout(this._spinning);
    this._spinning = null;
    if (this._operations_queue.length || this._sounds_queue.length) {
      this._spinning = setTimeout(this._stopSpinBound, rnd(this._operations.spin.min_time, this._operations.spin.max_time));
      return;
    }
    this._sounds.spin.stop();
  }

  _checkFloppy () {
    if (!this.loaded()) {
      io_error(this, 0x08);
      return false;
    }
    return true;
  }

  _findEntry (x) {
    this._startSpin();
    var entry = null;
    if (this._checkFloppy()) {
      this._randomSound('read', {}, 1, 3);
      if (_.isNumber(x)) {
        entry = this.floppy._findById(x);
      }
      else if (_.isString(x)) {
        entry = this.floppy._findByName(x);
      }
    }
    if (!entry) {
      io_error(this, _.isNumber(x) ? 0x06 : 0x01);
    }
    return entry;
  }

  loaded () { return this.floppy !== null; }

  eject () {
    this._operation({ name: 'eject' });
  }

  insert (floppy) {
    this._operation({ name: 'insert', floppy });
  }

  format () {
    this._operation({ name: 'format' });
  }

  cd (path) {
    this._operation({ name: 'cd', path });
  }

  cwd () {
    return this.current.pathname();
  }

  exists (path) {
    return this._findEntry(path) !== null;
  }

  size (id) {
    var sz = 0;
    var entry = this._findEntry(id);
    if (entry) {
      this._randomSound('read', {}, 1, 3);
      for (var b of entry.blocks()) {
        sz += b.end_mark;
      }
    }
    return sz;
  }

  seek_by (offset) {
    this._operation({ name: 'seek_by', offset });
  }

  seek (pos) {
    this._operation({ name: 'seek', pos });
  }

  read (addr, size) {
    this._operation({ name: 'read', addr, size });
  }

  write (addr, size) {
    this._operation({ name: 'write', addr, size });
  }

  create (path, data = null, size = 0, start = 0, attrs = 0, created = Date.now(), modified = Date.now()) {
    this._operation({ name: 'create', path, attrs, size: size || (data ? data.length : 0), start, created, modified, data });
  }

  fopen (path) {
    this._operation({ name: 'fopen', path });
  }

  fread (id, size, addr) {
    this._operation({ name: 'fread', id, size, addr });
  }

  fwrite (id, addr, size) {
    this._operation({ name: 'fwrite', id, size, addr });
  }

  append (id, addr, size) {
    this._operation({ name: 'append', id, size, addr });
  }

  fclose (id) {
    this._operation({ name: 'fclose', id });
  }

  delete (path) {
    this._operation({ name: 'delete', path });
  }

  lock (path) {
    this._operation({ name: 'lock', path });
  }

  unlock (path) {
    this._operation({ name: 'unlock', path });
  }

}

mixin(Drive.prototype, IO.prototype);

export default Drive;
