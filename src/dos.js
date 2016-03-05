import { Entry, _OPEN, _LOCK } from './floppy.js';
import { io_error } from './globals.js';

export const _PATHSEP = '/';
export const _EXTSEP = '.';
export const _CURRENT = '.';
export const _PARENT = '..';

class DOS {

  constructor (drive) {
    this.drive = drive;
    this.current = null;
    this.drive_path = '#' + _vm.port_name(this.drive.port_number);
  }

  _split (path) { return path.split(_PATHSEP); }

  _join (paths) { return paths.join(_PATHSEP); }

  _normalize (path) {
    var cwd = this.cwd();
    var newparts = [];
    var paths = this._split(path);
    var i = 0;
    var len = paths.length;
    var p = paths[i];
    while (i < len) {
      if (p === _CURRENT) {
        newparts = newparts.concat(cwd);
      }
      else if (p === _PARENT) {
        newparts = newparts.concat(cwd.slice(0, cwd.length - 1));
      }
      else {
        newparts.push(p);
      }
      i++;
      p = paths[i];
    }
    return newparts;
  }

  pathname (paths) { return this._join(paths); }

  dirname (path) {
    var parts = this._normalize(path);
    if (_.last(parts).indexOf(_EXTSEP)) {
      parts.pop();
    }
    return this._join(parts);
  }

  basename (path) { return _.first(this.filename(path).split(_EXTSEP)); }

  extname (path) { return _.last(this.filename(path).split(_EXTSEP)); }

  filename (path) { return _.last(this._normalize(path)); }

  eject () {
    this.current = null;
  }

  insert (floppy) {
    this.current = new Entry(floppy);
  }

  format () {
    if (this.drive.loaded()) {
      this.drive.floppy.format();
    }
  }

  cd (path) { this.current = this.drive.floppy.findEntry(this.drive.floppy._join(this.drive.floppy._normalize(path))); }

  cwd () { return this.pathname(this.current.paths()); }

  exists (path) { return this.drive.floppy.findEntry(path) !== null; }

  size (id) {
    var sz = 0;
    var entry = this.drive.floppy.findEntry(id);
    if (entry) {
      var blocks = entry.blocks();
      for (var b of blocks) {
        sz += b.size;
      }
      this._operation('read', blocks.length * 4);
    }
    return sz;
  }

  flush () {
    if (this.drive.loaded()) {
      this.drive.floppy.flush();
    }
  }

  create (path, data = null, size = 0, attrs = 0, created = Date.now(), modified = Date.now()) {
    var parent = this.drive.floppy.findEntry(this.dirname(path));
    if (data && size === 0) {
      size = data.length;
    }
    var entry = new Entry(this.drive.floppy, this.drive.floppy.entries.length, 0, parent ? parent._uid : 0, this.basename(path), this.extname(path), created, modified, attrs);
    this.drive.floppy.entries.push(entry);
    entry.write(data, size);
    this.flush();
  }

  fopen (path) {
    var entry = this.findEntry(path);
    if (entry) {
      if (!entry._isOpened()) {
        entry.attrs |= _OPEN;
        this.flush();
      }
      else {
        io_error(this, 0x02);
      }
    }
  }

  fread (id, size, addr) {
    var entry = this.findEntry(id);
    if (entry) {
      this.read(addr, size);
    }
  }

  fwrite (id, addr, size) {
    var entry = this.findEntry(id);
    if (entry) {
      this.write(addr, size);
    }
  }

  append (id, addr, size) {
    var entry = this.findEntry(id);
    if (entry) {
      // this.seek(size());
    }
  }

  fclose (id) {
    var entry = this.findEntry(id);
    if (entry) {
      if (entry._isOpened()) {
        entry.attrs ^= _OPEN;
        this.flush();
      }
      else {
        io_error(this, 0x03);
      }
    }
  }

  delete (path) {
    var entry = this.findEntry(path);
    if (entry) {
      if (!entry._isLocked()) {
        entry.uid = 0;
        entry.parent_uid = 0;
        entry.parent = null;
        this.flush();
      }
      else {
        io_error(entry, 0x09);
      }
    }
  }

  lock (path) {
    var entry = this.findEntry(path);
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs |= _LOCK;
        this.flush();
      }
      else {
        io_error(entry, 0x04);
      }
    }
  }

  unlock (path) {
    var entry = this.findEntry(path);
    if (entry) {
      if (!entry._isLocked()) {
        entry.attrs ^= _LOCK;
        this.flush();
      }
      else {
        io_error(entry, 0x05);
      }
    }
  }

}

export default DOS;
