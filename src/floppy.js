import _ from 'lodash';
import Drive from './ports/drive.js';
import Memory from './memory.js';
import { defaults, mixin, io_error } from './globals.js';

const _DIR =  0x01;
const _OPEN = 0x02;
const _LOCK = 0x04;

const _PATHSEP = '/';
const _EXTSEP =  '.';
const _CURRENT = '.';
const _PARENT =  '..';


export class Block {

  constructor (floppy, idx, entry_idx, end_mark) {
    this.floppy = floppy;
    this.drive = this.floppy.drive;
    this.idx = idx;
    this.entry_idx = entry_idx;
    this.end_mark = end_mark;
    this.top = this.floppy.blocks_table_top + this.idx * 4;
  }

  isUsed () { return this.entry_idx !== -1; }

  _validPos (pos) {
    return (pos >= this.top && pos <= this.bottom)
  }

  // _read (addr) {
  //   this.drive.read(this.idx, addr);
  //   return this;
  // }

  // _write (addr) {
  //   this.drive.write(this.idx, addr);
  //   return this;
  // }
}


export class Entry {

  constructor (floppy, idx, uid, parent_uid, filename, ext, created, modified, attrs) {
    this.floppy = floppy;
    this.drive = this.floppy.drive;
    this.idx = idx;
    this.top = this.floppy.entries_table_top + 4 + this.idx * this.floppy.entry_size;

    if (uid) {
      this.uid = uid;
    }
    else {
      this.uid = _.uniqueId();
    }
    this.parent_uid = parent_uid;
    this.parent = this.floppy._findById(this.parent_uid);
    this.filename = filename;
    this.ext = ext;
    this.created = created || Date.now();
    this.modified = modified || Date.now();
    this.attrs = attrs;
  }

  _read () {
    var ptr = this.top;
    this.uid = this.floppy.ld(ptr);
    ptr += 4;
    this.parent_uid = this.floppy.ld(ptr);
    this.parent = this.floppy._findById(this.parent_uid);
    ptr += 4;
    this.filename = this.floppy.ldl(ptr, 32).toString('ascii');
    ptr += 32;
    this.ext = this.floppy.ldl(ptr, 3).toString('ascii');
    ptr += 3;
    this.created = this.floppy.ldd(ptr);
    ptr += 8;
    this.modified = this.floppy.ldd(ptr);
    ptr += 8;
    this.attrs = this.floppy.ldb(ptr);
  }

  _write () {
    var fn = new Buffer(32);
    fn.write(this.filename, 0, Math.min(this.filename.length, 32), 'ascii');

    var ext = new Buffer(3);
    ext.write(this.ext, 0, Math.min(this.ext.length, 3), 'ascii');

    var ptr = this.top;
    this.floppy.st(ptr, this.uid);
    ptr += 4;
    this.floppy.st(ptr, this.parent_uid);
    ptr += 4;
    this.floppy.stl(ptr, fn, 32);
    ptr += 32;
    this.floppy.stl(ptr, ext, 3);
    ptr += 3;
    this.floppy.std(ptr, this.created);
    ptr += 8;
    this.floppy.std(ptr, this.modified);
    ptr += 8;
    this.floppy.stb(ptr, this.attrs);
  }

  _isDir () { return this.attrs & _DIR; }

  _isOpened () { return this.attrs & _OPEN; }

  _isLocked () { return this.attrs & _LOCK; }

  isRoot () { return !this.parent_uid; }

  pathname () {
    var paths = [];
    for (var p of this.parents()) {
      paths.push(p.filename + p._isDir() ? '' : '.' + p.ext);
    }
    return paths;
  }

  parents () {
    var entries = [];
    var p = this;
    while (p) {
      entries.unshift(p);
      p = p.parent;
    }
    return entries;
  }

  children () {
    var entries = [];
    for (var e of this.drive.entries) {
      if (e.parent_uid === this.uid) {
        entries.push(e);
      }
    }
    return entries;
  }

  blocks () {
    var blocks = [];
    for (var b of this.floppy.blocks) {
      if (b.entry_idx === this.idx) {
        blocks.push(b);
      }
    }
    return blocks;
  }
}


export class Floppy {

  constructor (drive, size = defaults.floppy.size, block_size = defaults.floppy.block_size, max_blocks = defaults.floppy.max_blocks, entry_size = defaults.floppy.entry_size, max_entries = defaults.floppy.max_entries) {
    this.drive = drive;

    this.size = size;

    this.block_size = block_size;
    this.max_blocks = max_blocks;
    this.blocks_table_top = 0;
    this.blocks_table_size = this.max_blocks * 4;

    this.entry_size = entry_size;
    this.max_entries = max_entries;
    this.entries_table_top = this.blocks_table_top + this.blocks_table_size;
    this.entries_table_size = this.max_entries * this.entry_size;

    this.blocks_top = this.entries_table_top + this.entries_table_size;

    this.mem = new Buffer(this.size);
    this.entries = [];
    this.blocks = [];
  }

  format () {
    this.mem.fill(0);
    this.entries = [];
    this.blocks = [];
    this.flush();
  }

  loaded () { return this.drive !== null; }

  insert (drive) {
    this.drive = drive;
    this._readBlocksTable();
    this._readEntriesTable();
  }

  eject () {
    this.drive = null;
    this.mem.fill(0, 0, this.size - 1);
    this.entries = [];
    this.blocks = [];
  }

  flush () {
    this._writeBlocksTable();
    this._writeEntriesTable();
  }

  _unusedBlock () {
    for (var b of this.blocks) {
      if (!b.isUsed()) {
        return b;
      }
    }
    return null;
  }

  _unusedBlocks () {
    var blocks = [];
    for (var b of this.blocks) {
      if (!b.isUsed()) {
        blocks.push(b);
      }
    }
    return blocks;
  }

  _usedBlocks () {
    var blocks = [];
    for (var b of this.blocks) {
      if (b.isUsed()) {
        blocks.push(b);
      }
    }
    return blocks;
  }

  _readBlocksTable () {
    var max = this.ld(this.entries_table_top);
    var ptr = this.blocks_table_top + 4;
    for (var i = 0; i < max; i++) {
      var m = this.ld(ptr);
      ptr += 4;
      var entry = (m >> 8 & 0xFFFF) - 1;
      var mark = m & 0xFF;
      this.blocks.push(new Block(this, i, entry, mark));
    }
  }

  _writeBlocksTable () {
    this.st(this.blocks_table_top, this.blocks.length);
    var ptr = this.blocks_table_top + 4;
    for (var b of this.blocks) {
      this.st(ptr, (b.entry_idx + 1) | (b.end_mark & 0xFF));
      ptr += 4;
    }
  }

  _readEntriesTable () {
    var max = this.ld(this.entries_table_top);
    for (var i = 0; i < max; i++) {
      var e = new Entry(this, i);
      e._read();
      this.entries.push(e);
    }
  }

  _writeEntriesTable () {
    this.st(this.entries_table_top, this.entries.length);
    for (var e of this.entries) {
      e._write();
    }
  }

  _split (path) { return path.split(_PATHSEP); }

  _join (paths) { return paths.join(_PATHSEP); }

  _normalize (path) {
    var cwd = this.drive.cwd();
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

  _findByName (path) {
    path = this._join(this._normalize(path));
    for (var e of this.entries) {
      if (e.pathname() === path) {
        return e;
      }
    }
    return null;
  }

  _findById (uid) {
    for (var e of this.entries) {
      if (e.uid === uid) {
        return e;
      }
    }
    return null;
  }

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

  _entriesForFile (path) {
    var entry = this._findByName(path);
    return entry ? entry.parents() : null;
  }

  dumpEntries () {
    this.dump(this.entries_table_top);
  }

  dumpBlocks () {
    this.dump(this.blocks_table_top, this.blocks_table_size);
  }
}

mixin(Floppy.prototype, Memory.prototype);

