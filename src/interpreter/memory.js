import hexy from 'hexy'
import { mixin, hex, data_read, data_write } from '../globals.js'
import { StackBuffer } from './stackbuffer.js'

export class Memory {

  mem_init (mem_size) {
    this.mem_size = mem_size || 4
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1
    this.mem_buffer = new Buffer(this.mem_size)
    this.mem_seq = {}
  }

  mem_tick (t) {
  }

  mem_reset () {
    this.clear()
  }

  mem_shut () {
    this.mem_buffer = null
  }

  clear () { this.fill(0, this.mem_top, this.mem_bottom) }

  chk_bounds (addr, sz = 4) { if (addr < this.mem_top || addr + sz > this.mem_bottom) { this.hlt(0x08) } }

  db_bc (addr, ...args) {
    this.chk_bounds(addr, args.length)
    this.db(addr, ...args)
  }

  db_s_bc (addr, ...args) {
    this.chk_bounds(addr, args.length)
    this.db_s(addr, ...args)
  }

  dw_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 2)
    this.dw(addr, ...args)
  }

  dw_s_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 2)
    this.dw_s(addr, ...args)
  }

  ddw_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.ddw(addr, ...args)
  }

  ddw_s_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.ddw_s(addr, ...args)
  }

  df_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.df(addr, ...args)
  }

  dd_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 8)
    this.dd(addr, ...args)
  }

  db (addr, ...args) {
    for (let a of args) {
      this.mem_buffer.writeUInt8(a, addr)
      addr++
    }
  }

  db_s (addr, ...args) {
    for (let a of args) {
      this.mem_buffer.writeInt8(a, addr)
      addr++
    }
  }

  dw (addr, ...args) {
    let size = 2
    for (let a of args) {
      this.mem_buffer.writeUInt16LE(a, addr)
      addr += size
    }
  }

  dw_s (addr, ...args) {
    let size = 2
    for (let a of args) {
      this.mem_buffer.writeInt16LE(a, addr)
      addr += size
    }
  }

  ddw (addr, ...args) {
    let size = 4
    for (let a of args) {
      this.mem_buffer.writeUInt32LE(a, addr)
      addr += size
    }
  }

  ddw_s (addr, ...args) {
    let size = 4
    for (let a of args) {
      this.mem_buffer.writeInt32LE(a, addr)
      addr += size
    }
  }

  df (addr, ...args) {
    let size = 4
    for (let a of args) {
      this.mem_buffer.writeFloatLE(a, addr)
      addr += size
    }
  }

  dd (addr, ...args) {
    let size = 8
    for (let a of args) {
      this.mem_buffer.writeDoubleLE(a, addr)
      addr += size
    }
  }

  ldb_bc (addr) {
    this.chk_bounds(addr, 1)
    return this.ldb(addr)
  }

  ldb_s_bc (addr) {
    this.chk_bounds(addr, 1)
    return this.ldb_s(addr)
  }

  ldw_bc (addr) {
    this.chk_bounds(addr, 2)
    return this.ldw(addr)
  }

  ldw_s_bc (addr) {
    this.chk_bounds(addr, 2)
    return this.ldw_s(addr)
  }

  ld_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.ld(addr)
  }

  ld_s_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.ld_s(addr)
  }

  ldf_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.ldf(addr)
  }

  ldd_bc (addr) {
    this.chk_bounds(addr, 8)
    return this.ldd(addr)
  }

  ldl_bc (addr, size) {
    this.chk_bounds(addr, size)
    return this.ldl(addr, size)
  }

  lds_bc (addr, size = -1) {
    this.chk_bounds(addr, size)
    return this.lds(addr, size)
  }

  ldb (addr) { return this.mem_buffer.readUInt8(addr) }

  ldb_s (addr) { return this.mem_buffer.readInt8(addr) }

  ldw (addr) { return this.mem_buffer.readUInt16LE(addr) }

  ldw_s (addr) { return this.mem_buffer.readInt16LE(addr) }

  ld (addr) { return this.mem_buffer.readUInt32LE(addr) }

  ld_s (addr) { return this.mem_buffer.readInt32LE(addr) }

  ldf (addr) { return this.mem_buffer.readFloatLE(addr) }

  ldd (addr) { return this.mem_buffer.readDoubleLE(addr) }

  ldl (addr, size) {
    let b = new Buffer(size)
    this.mem_buffer.copy(b, 0, addr, addr + size)
    return b
  }

  lds (addr, size = -1) {
    if (_.isString(addr)) {
      return addr
    }

    let s = ''
    let l = 0
    while (addr < this.mem_bottom && (size === -1 || l < size)) {
      let c = this.mem_buffer[addr++]
      if (c === 0) {
        if (size === -1) {
          break
        }
      }
      else {
        s += String.fromCharCode(c)
      }
      l++
    }
    return s
  }

  stb_bc (addr, value) {
    this.chk_bounds(addr, 1)
    this.stb(addr, value)
  }

  stb_s_bc (addr, value) {
    this.chk_bounds(addr, 1)
    this.stb_s(addr, value)
  }

  stw_bc (addr, value) {
    this.chk_bounds(addr, 2)
    this.stw(addr, value)
  }

  stw_s_bc (addr, value) {
    this.chk_bounds(addr, 2)
    this.stw_s(addr, value)
  }

  st_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.st(addr, value)
  }

  st_s_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.st_s(addr, value)
  }

  stf_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.stf(addr, value)
  }

  std_bc (addr, value) {
    this.chk_bounds(addr, 8)
    this.std(addr, value)
  }

  stl_bc (addr, buffer, size = 0) {
    this.chk_bounds(addr, size)
    this.stl(addr, buffer, size)
  }

  sts_bc (addr, str, len = 0) {
    this.chk_bounds(addr, len)
    this.sts(addr, str, len)
  }

  stb (addr, value) { this.mem_buffer.writeUInt8(value, addr) }

  stb_s (addr, value) { this.mem_buffer.writeInt8(value, addr) }

  stw (addr, value) { this.mem_buffer.writeUInt16LE(value, addr) }

  stw_s (addr, value) { this.mem_buffer.writeInt16LE(value, addr) }

  st (addr, value) { this.mem_buffer.writeUInt32LE(value, addr) }

  st_s (addr, value) { this.mem_buffer.writeInt32LE(value, addr) }

  stf (addr, value) { this.mem_buffer.writeFloatLE(value, addr) }

  std (addr, value) { this.mem_buffer.writeDoubleLE(value, addr) }

  stl (addr, buffer, size = 0) { buffer.copy(this.mem_buffer, addr, 0, size || buffer.length) }

  sts (addr, str, len = 0) {
    len = len || str.length
    let mem = this.mem_buffer
    for (let i = 0; i < len; i++) {
      mem[addr++] = str.charCodeAt(i)
    }
    mem[addr] = 0
  }

  fill_bc (value, top, bottom) {
    this.chk_bounds(top, bottom - top)
    this.fill(value, top, bottom)
  }

  fill (value, top, bottom) { this.mem_buffer.fill(value, top, bottom) }

  copy_bc (src, tgt, size) {
    this.chk_bounds(src, size)
    this.chk_bounds(tgt, size)
    this.copy(src, tgt, size)
  }

  copy (src, tgt, size) { this.mem_buffer.copy(this.mem_buffer, tgt, src, src + size) }

  read (addr, type) { return data_read(this.mem_buffer, addr, type) }

  write (value, addr, type) { return data_write(value, this.mem_buffer, addr, type) }

  dump (addr = 0, size = 1024) {
    console.log('Dumping', size, ' bytes from memory at ', hex(addr))
    console.log(hexy.hexy(this.mem_buffer, { offset: addr, length: size, width: 16, caps: 'upper', indent: 2 }))
  }

}

mixin(Memory.prototype, StackBuffer.prototype)
