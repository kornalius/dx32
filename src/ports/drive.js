import _ from 'lodash';
import Port from '../port.js';
import Floppy from '../floppy.js';
import { defaults, io_error } from '../globals.js';


class Drive extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);
    this.current = [];
    this.floppy = null;
    this.pos = 0;
    this.spinning = false;
  }

  _checkFloppy () {
    if (!this.loaded()) {
      io_error(this, 0x08);
      return false;
    }
    return true;
  }

  _checkSpinning () {
    if (!this.spinning) {
      io_error(this, 0x10);
      return false;
    }
    return true;
  }

  _findEntry (x) {
    var entry = null;
    if (this._checkFloppy()) {
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

  insert (floppy) {
    if (!this.loaded()) {
      this.floppy = floppy;
      this.floppy.insert(this);
    }
    else {
      io_error(this, 0x07);
    }
    return this;
  }

  eject () {
    if (this.loaded()) {
      this.floppy.eject();
      this.floppy = null;
    }
    else {
      io_error(this, 0x08);
    }
    return this;
  }

  startSpin () {
    this.spinning = true;
  }

  stopSpin () {
    this.spinning = false;
  }

  cd (path) {
    if (this._checkFloppy()) {
      this.current = this.floppy._findByName(this._join(this._normalize(path)));
    }
    return this.current;
  }

  cwd () { return this.current.path(); }

  seekBy (x) {
    this.pos += x;
    return this;
  }

  seek (pos) {
    if (pos) {
      this.pos = pos === -1 ? this.floppy.size - 1 : pos;
    }
    return this.pos;
  }

  read (size, addr = 0) {
    if (!this._checkSpinning()) { return null; }
    var b;
    var start = 0;
    if (addr) {
      b = _vm.mem;
      start = addr;
    }
    else {
      b = new Buffer(size);
    }
    this.floppy.mem.copy(b, start, this.pos, this.pos + size);
    this.pos += size;
    return b;
  }

  read_byte () {
    if (!this._checkSpinning()) { return null; }
    var v = this.floppy.ldb(this.pos);
    this.pos++;
    return v;
  }

  read_word () {
    if (!this._checkSpinning()) { return null; }
    var v = this.floppy.ldw(this.pos);
    this.pos += 2;
    return v;
  }

  read_dword () {
    if (!this._checkSpinning()) { return null; }
    var v = this.floppy.ld(this.pos);
    this.pos += 4;
    return v;
  }

  write (buffer, addr, size) {
    if (this._checkSpinning()) {
      buffer.copy(this.floppy.mem, this.pos, addr, size);
      this.pos += size;
    }
    return this;
  }

  write_byte (value) {
    if (this._checkSpinning()) {
      this.floppy.stb(this.pos, value);
      this.pos++;
    }
    return this;
  }

  write_word (value) {
    if (this._checkSpinning()) {
      this.floppy.stw(this.pos, value);
      this.pos += 2;
    }
    return this;
  }

  write_dword (value) {
    if (this._checkSpinning()) {
      this.floppy.st(this.pos, value);
      this.pos += 4;
    }
    return this;
  }

  create (path, attrs = 0, size = 0, start = 0, created, modified) {
    if (!this._checkSpinning()) { return null; }
    var parent = this.floppy._findByName(this.dirname(path));
    var entry = new Entry(this, this.entries.length, 0, parent ? parent_uid : 0, this.basename(path), this.extname(path), created, modified, attrs);
    this.entries.push(entry);
    this.floppy.flush();
    return entry;
  }

  fopen (path) {
    var entry = this._findEntry(path);
    if (entry) {
      if (!entry._isOpened()) {
        entry.attrs |= _OPEN;
        this.floppy.flush();
      }
      else {
        io_error(this, 0x02);
      }
    }
    return this;
  }

  fread (id, size, addr) {
    var entry = this._findEntry(id);
    if (entry) {
    }
    return this;
  }

  fwrite (id, addr, size) {
    var entry = this._findEntry(id);
    if (entry) {
      this.floppy.flush();
    }
    return this;
  }

  append (id, addr, size) {
    var entry = this._findEntry(id);
    if (entry) {
        this.floppy.flush();
    }
    return this;
  }

  fclose (id) {
    var entry = this._findEntry(id);
    if (entry) {
      if (entry._isOpened()) {
        entry.attrs ^= _OPEN;
        this.floppy.flush();
      }
      else {
        io_error(this, 0x03);
      }
    }
    return this;
  }

  exists (path) { return this._findEntry(path) !== null; }

  size (id) {
    var sz = 0;
    var entry = this._findEntry(id);
    if (entry) {
      for (var b of entry.blocks()) {
        sz += b.end_mark;
      }
    }
    return sz;
  }

  delete (path) {
    var entry = this._findEntry(path);
    if (entry) {
      if (!entry._isLocked()) {
        entry.uid = 0;
        entry.parent_uid = 0;
        entry.parent = null;
        this.floppy.flush();
      }
      else {
        io_error(entry, 0x09);
      }
    }
    return this;
  }

  lock (id) {
    var entry = this._findEntry(id);
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs |= _LOCK;
        this.floppy.flush();
      }
      else {
        io_error(entry, 0x04);
      }
    }
    return this;
  }

  unlock (id) {
    var entry = this._findEntry(id);
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs ^= _LOCK;
        this.floppy.flush();
      }
      else {
        io_error(entry, 0x05);
      }
    }
    return this;
  }

}

export default Drive
