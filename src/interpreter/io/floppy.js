import _ from 'lodash'
import { Sound } from '../sound.js'
import { Memory } from '../memory.js'
import { Block } from './block.js'
import { Entry } from './entry.js'
import { defaults, mixin, string_buffer } from '../../globals.js'


export class Floppy {

  constructor (drive, size = defaults.floppy.size, block_size = defaults.floppy.block_size, max_blocks = defaults.floppy.max_blocks, entry_size = defaults.floppy.entry_size, max_entries = defaults.floppy.max_entries) {
    this.drive = drive

    this.mem_size = size

    this.diskname = 'UNTITLED'

    this.info_table_top = 0
    this.info_table_size = 36

    this.block_size = block_size
    this.max_blocks = max_blocks
    this.blocks_table_top = this.info_table_size + 1
    this.blocks_table_size = this.max_blocks * 4

    this.entry_size = entry_size
    this.max_entries = max_entries
    this.entries_table_top = this.blocks_table_top + this.blocks_table_size + 1
    this.entries_table_size = this.max_entries * this.entry_size

    this.blocks_top = this.entries_table_top + this.entries_table_size + 1

    this.mem_init(new ArrayBuffer(this.mem_size))

    this.entries = []
    this.blocks = []
  }

  format () {
    this.clear()
    this.diskname = 'UNTITLED'
    this.entries = []
    this.blocks = []
    this.flush()
  }

  loaded () { return this.drive !== null }

  insert (drive) {
    this.drive = drive
    this.read_info_table()
    this.read_blocks_table()
    this.read_entries_table()
  }

  eject () {
    this.drive = null
    this.clear()
    this.diskname = 'UNTITLED'
    this.entries = []
    this.blocks = []
  }

  flush () {
    this.write_info_table()
    this.write_blocks_table()
    this.write_entries_table()
  }

  unused_blocks () {
    let blocks = []
    for (let b of this.blocks) {
      if (!b.is_used()) {
        blocks.push(b)
      }
    }
    return blocks
  }

  used_blocks () {
    let blocks = []
    for (let b of this.blocks) {
      if (b.is_used()) {
        blocks.push(b)
      }
    }
    return blocks
  }

  read_info_table () {
    let ptr = this.info_table_top
    this.blocks_count = this.ldw(ptr)
    ptr += 2
    this.entries_count = this.ldw(ptr)
    ptr += 2
    this.diskname = this.ldl(ptr, 32).toString('ascii')
    ptr += 32

    this.drive.operation('read', ptr - this.info_table_top)
  }

  write_info_table () {
    let ptr = this.info_table_top
    this.std(ptr, this.blocks.length)
    ptr += 2
    this.std(ptr, this.entries.length)
    ptr += 2
    this.stl(ptr, string_buffer(this.diskname, 32))
    ptr += 32

    this.drive.operation('write', ptr - this.info_table_top)
  }

  read_blocks_table () {
    let ptr = this.blocks_table_top
    for (let i = 0; i < this.blocks_count; i++) {
      let entry = this.ldd(ptr) - 1
      ptr += 4
      let size = this.ldw(ptr)
      ptr += 2
      this.blocks.push(new Block(this, entry, size))
    }

    this.drive.operation('read', ptr - this.blocks_table_top)
  }

  write_blocks_table () {
    let ptr = this.blocks_table_top
    for (let b of this.blocks) {
      this.std(ptr, b.entry_idx + 1)
      ptr += 4
      this.stw(ptr, b.mem_size)
      ptr += 2
    }

    this.drive.operation('write', ptr - this.blocks_table_top)
  }

  read_entries_table () {
    for (let i = 0; i < this.entries_count; i++) {
      let e = new Entry(this, i)
      e.read_info()
      this.entries.push(e)
    }
  }

  write_entries_table () {
    for (let e of this.entries) {
      e.write_info()
    }
  }

  find_entry (v) {
    for (let e of this.entries) {
      this.drive.operation('read')
      if (_.isNumber(v) && e.uid === v) {
        return e
      }
      else if (_.isString(v) && e.paths() === v) {
        return e
      }
    }
    return null
  }

  dump_info () {
    this.dump(this.info_table_top, this.info_table_size)
  }

  dump_entries () {
    this.dump(this.entries_table_top)
  }

  dump_blocks () {
    this.dump(this.blocks_table_top, this.blocks_table_size)
  }
}

mixin(Floppy.prototype, Memory.prototype, Sound.prototype)

