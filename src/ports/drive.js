import _ from 'lodash';
import Port from '../port.js';
import { Floppy, Entry, Block } from '../floppy.js';
import { defaults, io_error } from '../globals.js';


var queue_size = 0;

class Drive extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this._read_operations = {
      seek_by: 100,
      seek: 100,
      read: 500,
      cd: 100,
      fopen: 250,
      fclose: 100,
    };

    this._write_operations = {
      write: 1000,
      create: 2000,
      append: 1000,
      flush: 1000,
      delete: 2000,
      format: 5000,
      lock: 500,
      unlock: 500,
    };

    this.current = null;
    this.floppy = null;
    this.pos = 0;

    this._spinning = null;
    this.stopSpinBound = this._stopSpin.bind(this);

    this.sounds = {};
    this.sounds.insert = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_insert.wav') });
    this.sounds.eject = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_eject.wav') });
    this.sounds.spin = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_spin.wav'), loop: true });
    this.sounds.read1 = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_read1.wav') });
    this.sounds.read2 = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_read2.wav') });
    this.sounds.write1 = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_write1.wav') });
    this.sounds.write2 = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/disk_write2.wav') });

    this.stack = [];

    // this._startSpin();
    // this._randomSound('read', 10);

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

    for (var k in this.sounds) {
      var s = this.sounds[k];
      if (s.playable) {
        s.stop();
      }
    }
  }

  shut () {
    super.shut();
    this.sounds = {};
  }

  _queueOperation (op) {
    this.stack.push(op);
    var t = this._read_operations[op.name];
    if (!t) {
      t = this._write_operations[op.name]
    }
    if (!t) {
      t = 500;
    }
    var that = this;
    setTimeout(() => {
      that._next_operation();
    }, this.stack.length * Math.trunc(Math.random() * t));
  }

  _next_operation () {
    var op = this.stack.shift();

    this._startSpin();

    if (op.name !== 'insert' && op.name !== 'eject' && !this._checkFloppy()) {
      return;
    }

    if (this._read_operations[op.name]) {
      this._randomSound('read', (op.size ? Math.trunc(op.size / 128) : 1));
    }

    if (this._write_operations[op.name]) {
      this._randomSound('read', (op.size ? Math.trunc(op.size / 128) : 1));
    }

    switch(op.name) {
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
        this._playSound('eject');
        break;

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
        this._playSound('insert');
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
        var b;
        var start = 0;
        if (op.addr) {
          b = _vm.mem;
          start = op.addr;
        }
        else {
          b = new Buffer(op.size);
        }
        this.floppy.mem.copy(b, start, this.pos, this.pos + op.size);
        this._queueOperation({ name: 'seek_by', offset: op.size });
        break;

      case 'write':
        op.buffer.copy(this.floppy.mem, this.pos, op.addr, op.size);
        this._queueOperation({ name: 'seek_by', offset: op.size });
        this._queueOperation({ name: 'flush' });
        break;

      case 'flush':
        this.floppy.flush();
        break;

      case 'cd':
        this.current = this.floppy._findByName(this.floppy._join(this.floppy._normalize(op.path)));
        break;

      case 'create':
        var parent = this.floppy._findByName(this.floppy.dirname(op.path));
        var entry = new Entry(this.floppy, this.floppy.entries.length, 0, parent ? parent_uid : 0, this.floppy.basename(op.path), this.floppy.extname(op.path), op.created, op.modified, op.attrs);
        this.floppy.entries.push(entry);
        this._queueOperation({ name: 'flush' });
        break;

      case 'fopen':
        var entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isOpened()) {
            entry.attrs |= _OPEN;
            this._queueOperation({ name: 'flush' });
          }
          else {
            io_error(this, 0x02);
          }
        }
        break;

      case 'fread':
        var entry = this._findEntry(op.id);
        if (entry) {
          this._queueOperation({ name: 'read', addr: op.addr, size: op.size });
        }
        break;

      case 'fwrite':
        var entry = this._findEntry(op.id);
        if (entry) {
          this._queueOperation({ name: 'write', addr: op.addr, size: op.size });
        }
        break;

      case 'append':
        var entry = this._findEntry(op.id);
        if (entry) {
        }
        break;

      case 'fclose':
        var entry = this._findEntry(op.id);
        if (entry) {
          if (entry._isOpened()) {
            entry.attrs ^= _OPEN;
            this._queueOperation({ name: 'flush' });
          }
          else {
            io_error(this, 0x03);
          }
        }
        break;

      case 'delete':
        var entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            this._writeSound(2);
            entry.uid = 0;
            entry.parent_uid = 0;
            entry.parent = null;
            this._queueOperation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x09);
          }
        }
        break;

      case 'lock':
        var entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            this._writeSound(2);
            entry.attrs |= _LOCK;
            this._queueOperation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x04);
          }
        break;
      }

      case 'unlock':
        var entry = this._findEntry(op.path);
        if (entry) {
          if (!entry._isLocked()) {
            this._writeSound(2);
            entry.attrs ^= _LOCK;
            this._queueOperation({ name: 'flush' });
          }
          else {
            io_error(entry, 0x05);
          }
        break;

      }
    }
  }

  _playSound (name, options = {}) {
    var s = this.sounds[name];
    if (s) {
      s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }));
    }
  }

  _queueSound (name, options = {}) {
    var that = this;
    queue_size++;
    setTimeout(() => {
      that._playSound(name, options);
      queue_size--;
    }, queue_size * Math.trunc(Math.random() * 250 + 500));
  }

  _randomSound (name, max = 1) {
    max = Math.trunc(Math.random() * max + 1);
    while (max > 0) {
      var c = _.reduce(this.sounds, (r, v, k) => { return r + (_.startsWith(k, name) ? 1 : 0) }, 0);
      var r = Math.trunc(Math.random() * c + 1);
      this._queueSound(name + r);
      max--;
    }
  }

  _startSpin () {
    if (!this._spinning) {
      this._playSound('spin', { loop: true });
    }
    clearTimeout(this._spinning);
    this._spinning = setTimeout(this.stopSpinBound, 2500);
  }

  _stopSpin () {
    clearTimeout(this._spinning);
    this._spinning = null;
    if (this.stack.length || queue_size) {
      this._spinning = setTimeout(this.stopSpinBound, 2500);
      return;
    }
    this.sounds.spin.stop();
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
      this._randomSound('read', 3);
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
    this._queueOperation({ name: 'eject' });
  }

  insert (floppy) {
    this._queueOperation({ name: 'insert', floppy });
  }

  format () {
    this._queueOperation({ name: 'format' });
  }

  cd (path) {
    this._queueOperation({ name: 'cd', path });
  }

  cwd () {
    this._startSpin();
    this._randomSound('read', 2);
    return this.current.pathname();
  }

  exists (path) {
    return this._findEntry(path) !== null;
  }

  size (id) {
    var sz = 0;
    var entry = this._findEntry(id);
    if (entry) {
      this._randomSound('read', Math.trunc(Math.random() * entry.blocks().length));
      for (var b of entry.blocks()) {
        sz += b.end_mark;
      }
    }
    return sz;
  }

  seek_by (offset) {
    this._queueOperation({ name: 'seek_by', offset });
  }

  seek (pos) {
    this._queueOperation({ name: 'seek', pos });
  }

  read (addr, size) {
    this._queueOperation({ name: 'read', addr, size });
  }

  write (addr, size) {
    this._queueOperation({ name: 'write', addr, size });
  }

  create (path, data = null, size = 0, start = 0, attrs = 0, created = Date.now(), modified = Date.now()) {
    this._queueOperation({ name: 'create', path, attrs, size: size || (data ? data.length : 0), start, created, modified, data });
  }

  fopen (path) {
    this._queueOperation({ name: 'fopen', path });
  }

  fread (id, size, addr) {
    this._queueOperation({ name: 'fread', id, size, addr });
  }

  fwrite (id, addr, size) {
    this._queueOperation({ name: 'fwrite', id, size, addr });
  }

  append (id, addr, size) {
    this._queueOperation({ name: 'append', id, size, addr });
  }

  fclose (id) {
    this._queueOperation({ name: 'fclose', id });
  }

  delete (path) {
    this._queueOperation({ name: 'delete', path });
  }

  lock (path) {
    this._queueOperation({ name: 'lock', path });
  }

  unlock (path) {
    this._queueOperation({ name: 'unlock', path });
  }

}

export default Drive
