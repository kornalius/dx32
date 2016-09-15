import _ from 'lodash'
import { string_buffer } from '../../globals.js'
import { Block } from './block.js'


export const _ENTRY_DIR = 0x01
export const _ENTRY_OPEN = 0x02
export const _ENTRY_LOCK = 0x04

export class Entry {

  constructor (floppy, idx, uid, parent_uid, filename, ext, size, created, modified, attrs) {
    this.floppy = floppy
    this.drive = this.floppy.drive
    this.idx = idx

    this.mem_size = 60
    this.mem_top = this.floppy.entries_table_top + this.idx * this.floppy.entry_size
    this.mem_bottom = this.mem_top + this.mem_size - 1

    this.uid = uid || _.uniqueId()
    this.parent_uid = parent_uid || 0
    this.parent = this.floppy.find_entry(this.parent_uid)
    this.filename = filename || ''
    this.ext = ext || ''
    this.size = size || 0
    this.created = created || Date.now()
    this.modified = modified || Date.now()
    this.attrs = attrs
  }

  read_info () {
    let ptr = this.mem_top
    this.uid = this.floppy.ldd(ptr)
    ptr += 4
    this.parent_uid = this.floppy.ldd(ptr)
    this.parent = this.floppy.find_entry(this.parent_uid)
    ptr += 4
    this.filename = this.floppy.ldl(ptr, 32).toString('ascii')
    ptr += 32
    this.ext = this.floppy.ldl(ptr, 3).toString('ascii')
    ptr += 3
    this.created = this.floppy.ldd(ptr)
    ptr += 4
    this.modified = this.floppy.ldd(ptr)
    ptr += 4
    this.attrs = this.floppy.ldb(ptr)

    this.drive.operation('read', ptr - this.mem_top)

    return ptr
  }

  write_info () {
    let ptr = this.mem_top
    this.floppy.std(ptr, this.uid)
    ptr += 4
    this.floppy.std(ptr, this.parent_uid)
    ptr += 4
    this.floppy.stl(ptr, string_buffer(this.filename, 32))
    ptr += 32
    this.floppy.stl(ptr, string_buffer(this.ext, 3))
    ptr += 3
    this.floppy.std(ptr, this.created)
    ptr += 4
    this.floppy.std(ptr, this.modified)
    ptr += 4
    this.floppy.stb(ptr, this.attrs)

    this.drive.operation('write', ptr - this.mem_top)

    return ptr
  }

  is_dir () { return this.attrs & _ENTRY_DIR }

  is_opened () { return this.attrs & _ENTRY_OPEN }

  is_locked () { return this.attrs & _ENTRY_LOCK }

  is_root () { return !this.parent_uid }

  paths () {
    let paths = [this.drive_path]
    for (let p of this.parents()) {
      paths.push(p.filename + p.is_dir() ? '' : '.' + p.ext)
    }
    return paths
  }

  pathname () { return this.drive.dos.pathname(this.paths()) }

  parents () {
    let entries = []
    let p = this
    while (p) {
      entries.unshift(p)
      p = p.parent
    }
    return entries
  }

  children () {
    let entries = []
    for (let e of this.floppy.entries) {
      if (e.parent_uid === this.uid) {
        entries.push(e)
      }
    }
    return entries
  }

  blocks () {
    let blocks = []
    for (let b of this.floppy.blocks) {
      if (b.entry_idx === this.idx) {
        blocks.push(b)
      }
    }
    return blocks
  }

  size () {
    let sz = 0
    for (let b of this.blocks()) {
      sz += b.mem_size
    }
    return sz
  }

  clear_blocks () {
    for (let b of this.blocks()) {
      b.entry_idx = -1
    }
  }

  next_free_block () {
    let b = this.floppy.unused_blocks()
    return b.length ? b[0] : new Block(this, this.idx)
  }

  read (addr) {
    let ptr = addr
    for (let b of this.blocks()) {
      ptr += b.read(ptr)
    }
    return ptr - addr
  }

  write (addr, size) {
    this.clear_blocks()
    while (size > 0) {
      let b = this.next_free_block()
      if (b) {
        let sz = Math.min(size, this.floppy.block_size)
        b.set_size(sz)
        _vm.copy(b.mem_top, addr, sz)
        addr += b.write(addr)
      }
      size -= this.floppy.block_size
    }
  }
}
