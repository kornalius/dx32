import _ from 'lodash';
import Sound from './sound.js';
import Memory from './memory.js';
import { defaults, mixin, stringToBuffer, bufferToString } from './globals.js';

export const _DIR = 0x01;
export const _OPEN = 0x02;
export const _LOCK = 0x04;

export class Block {

  constructor (floppy, entry_idx, size = 0) {
    this.floppy = floppy;
    this.drive = this.floppy.drive;
    this.entry_idx = entry_idx;
    this.idx = this.floppy.blocks.length;
    this.top = this.floppy.blocks_table_top + this.floppy.block_size * this.idx * 4;
    this.set_size(size);
  }

  set_size (size) {
    if (size > this.floppy.block_size) {
      size = this.floppy.block_size;
    }
    if (size < 0) {
      size = 0;
    }
    this.size = size;
    this.bottom = this.top + this.size;
  }

  isUsed () { return this.entry_idx !== -1; }

  validPos (pos) { return pos >= this.top && pos <= this.bottom; }

  read (addr) {
    this.drive.seek(this.top);
    this.drive.read(addr, this.size);
    return this.size;
  }

  write (addr) {
    this.drive.seek(this.top);
    this.drive.write(addr, this.size);
    return this.size;
  }
}


export class Entry {

  constructor (floppy, idx, uid, parent_uid, filename, ext, size, created, modified, attrs) {
    this.floppy = floppy;
    this.drive = this.floppy.drive;
    this.idx = idx;
    this.top = this.floppy.entries_table_top + this.idx * this.floppy.entry_size;

    this.uid = uid || _.uniqueId();
    this.parent_uid = parent_uid || 0;
    this.parent = this.floppy.findEntry(this.parent_uid);
    this.filename = filename || '';
    this.ext = ext || '';
    this.size = size || 0;
    this.created = created || Date.now();
    this.modified = modified || Date.now();
    this.attrs = attrs;
  }

  read_info () {
    var ptr = this.top;
    this.uid = this.floppy.ld(ptr);
    ptr += 4;
    this.parent_uid = this.floppy.ld(ptr);
    this.parent = this.floppy.findEntry(this.parent_uid);
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

    this.drive._operation('read', ptr - this.top);

    return ptr;
  }

  write_info () {
    var ptr = this.top;
    this.floppy.st(ptr, this.uid);
    ptr += 4;
    this.floppy.st(ptr, this.parent_uid);
    ptr += 4;
    this.floppy.stl(ptr, _vm.stringBuffer(this.filename, 32));
    ptr += 32;
    this.floppy.stl(ptr, _vm.stringBuffer(this.ext, 3));
    ptr += 3;
    this.floppy.std(ptr, this.created);
    ptr += 8;
    this.floppy.std(ptr, this.modified);
    ptr += 8;
    this.floppy.stb(ptr, this.attrs);

    this.drive._operation('write', ptr - this.top);

    return ptr;
  }

  _isDir () { return this.attrs & _DIR; }

  _isOpened () { return this.attrs & _OPEN; }

  _isLocked () { return this.attrs & _LOCK; }

  isRoot () { return !this.parent_uid; }

  paths () {
    var paths = [this.drive_path];
    for (var p of this.parents()) {
      paths.push(p.filename + p._isDir() ? '' : '.' + p.ext);
    }
    return paths;
  }

  pathname () { return this.drive.dos.pathname(this.paths()); }

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
    for (var e of this.floppy.entries) {
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

  size () {
    var sz = 0;
    for (var b of this.blocks()) {
      sz += b.size;
    }
    return sz;
  }

  clear_blocks () {
    for (var b of this.blocks()) {
      b.entry_idx = -1;
    }
  }

  next_free_block () {
    var b = this.floppy._unusedBlocks();
    return b.length ? b[0] : new Block(this, this.idx);
  }

  read (addr) {
    var ptr = addr;
    for (var b of this.blocks()) {
      ptr += b.read(ptr);
    }
    return ptr - addr;
  }

  write (addr, size) {
    this.clear_blocks();
    var ptr = addr;
    while (size > 0) {
      var b = this.next_free_block();
      if (b) {
        var sz = Math.min(size, this.floppy.block_size);
        b.set_size(sz);
        _vm.copy(b.top, ptr, sz);
        ptr += b.write(ptr);
      }
      size -= this.floppy.block_size;
    }
  }
}


export class Floppy {

  constructor (drive, size = defaults.floppy.size, block_size = defaults.floppy.block_size, max_blocks = defaults.floppy.max_blocks, entry_size = defaults.floppy.entry_size, max_entries = defaults.floppy.max_entries) {
    this.drive = drive;

    this.size = size;

    this.diskname = 'UNTITLED';

    this.info_table_top = 0;
    this.info_table_size = 36;

    this.block_size = block_size;
    this.max_blocks = max_blocks;
    this.blocks_table_top = this.info_table_size + 1;
    this.blocks_table_size = this.max_blocks * 4;

    this.entry_size = entry_size;
    this.max_entries = max_entries;
    this.entries_table_top = this.blocks_table_top + this.blocks_table_size + 1;
    this.entries_table_size = this.max_entries * this.entry_size;

    this.blocks_top = this.entries_table_top + this.entries_table_size + 1;

    this.init_mem(this.size);

    this.entries = [];
    this.blocks = [];
  }

  format () {
    this.clear_mem();
    this.diskname = 'UNTITLED';
    this.entries = [];
    this.blocks = [];
    this.flush();
  }

  loaded () { return this.drive !== null; }

  insert (drive) {
    this.drive = drive;
    this._readInfoTable();
    this._readBlocksTable();
    this._readEntriesTable();
  }

  eject () {
    this.drive = null;
    this.clear_mem();
    this.diskname = 'UNTITLED';
    this.entries = [];
    this.blocks = [];
  }

  flush () {
    this._writeInfoTable();
    this._writeBlocksTable();
    this._writeEntriesTable();
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

  _readInfoTable () {
    var ptr = this.info_table_top;
    this.blocks_count = this.ldw(ptr);
    ptr += 2;
    this.entries_count = this.ldw(ptr);
    ptr += 2;
    this.diskname = this.ldl(ptr, 32).toString('ascii');
    ptr += 32;

    this.drive._operation('read', ptr - this.info_table_top);
  }

  _writeInfoTable () {
    var ptr = this.info_table_top;
    this.st(ptr, this.blocks.length);
    ptr += 2;
    this.st(ptr, this.entries.length);
    ptr += 2;
    this.stl(ptr, _vm.stringBuffer(this.diskname, 32));
    ptr += 32;

    this.drive._operation('write', ptr - this.info_table_top);
  }

  _readBlocksTable () {
    var ptr = this.blocks_table_top;
    for (var i = 0; i < this.blocks_count; i++) {
      var entry = this.ld(ptr) - 1;
      ptr += 4;
      var size = this.ldw(ptr);
      ptr += 2;
      this.blocks.push(new Block(this, entry, size));
    }

    this.drive._operation('read', ptr - this.blocks_table_top);
  }

  _writeBlocksTable () {
    var ptr = this.blocks_table_top;
    for (var b of this.blocks) {
      this.st(ptr, b.entry_idx + 1);
      ptr += 4;
      this.stw(ptr, b.size);
      ptr += 2;
    }

    this.drive._operation('write', ptr - this.blocks_table_top);
  }

  _readEntriesTable () {
    for (var i = 0; i < this.entries_count; i++) {
      var e = new Entry(this, i);
      e.read_info();
      this.entries.push(e);
    }
  }

  _writeEntriesTable () {
    for (var e of this.entries) {
      e.write_info();
    }
  }

  findEntry (v) {
    for (var e of this.entries) {
      this.drive._operation('read');
      if (_.isNumber(v) && e.uid === v) {
        return e;
      }
      else if (_.isString(v) && e.paths() === v) {
        return e;
      }
    }
    return null;
  }

  dumpInfo () {
    this.dump(this.info_table_top, this.info_table_size);
  }

  dumpEntries () {
    this.dump(this.entries_table_top);
  }

  dumpBlocks () {
    this.dump(this.blocks_table_top, this.blocks_table_size);
  }

  fromString (str) {
    this.mem.fill(0);
    this.mem = stringToBuffer(str);
  }

  toString () {
    return bufferToString(this.mem);
  }
}

mixin(Floppy.prototype, Memory.prototype, Sound.prototype);

