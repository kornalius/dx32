import hexy from 'hexy'
import { defaults, mixin, hex } from './globals.js'
import { StackMixin } from './stack.js'

export class Memory {

  mem_init (mem_size) {
    this.mem_size = mem_size || 4
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1
    this.mem_buffer = new Buffer(this.mem_size)
  }

  mem_tick (t) {
  }

  mem_reset () {
    this.clear()
  }

  mem_shut () {
    this.mem_buffer = null
  }

  clear () { this.fill(0, 0, this.mem_size) }

  chk_bounds (addr, sz = 4) { if (addr < this.mem_top || addr + sz > this.mem_bottom) { this.hlt(0x08) } }

  db_bc (addr, ...args) {
    this.chk_bounds(addr, args.length)
    this.db(addr, ...args)
  }

  sdb_bc (addr, ...args) {
    this.chk_bounds(addr, args.length)
    this.sdb(addr, ...args)
  }

  dw_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 2)
    this.dw(addr, ...args)
  }

  sdw_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 2)
    this.sdw(addr, ...args)
  }

  dl_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.dl(addr, ...args)
  }

  sdl_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.sdl(addr, ...args)
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

  sdb (addr, ...args) {
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

  sdw (addr, ...args) {
    let size = 2
    for (let a of args) {
      this.mem_buffer.writeInt16LE(a, addr)
      addr += size
    }
  }

  dl (addr, ...args) {
    let size = 4
    for (let a of args) {
      this.mem_buffer.writeUInt32LE(a, addr)
      addr += size
    }
  }

  sdl (addr, ...args) {
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

  sldb_bc (addr) {
    this.chk_bounds(addr, 1)
    return this.sldb(addr)
  }

  ldw_bc (addr) {
    this.chk_bounds(addr, 2)
    return this.ldw(addr)
  }

  sldw_bc (addr) {
    this.chk_bounds(addr, 2)
    return this.sldw(addr)
  }

  ld_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.ld(addr)
  }

  sld_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.sld(addr)
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

  sldb (addr) { return this.mem_buffer.readInt8(addr) }

  ldw (addr) { return this.mem_buffer.readUInt16LE(addr) }

  sldw (addr) { return this.mem_buffer.readInt16LE(addr) }

  ld (addr) { return this.mem_buffer.readUInt32LE(addr) }

  sld (addr) { return this.mem_buffer.readInt32LE(addr) }

  ldf (addr) { return this.mem_buffer.readFloatLE(addr) }

  ldd (addr) { return this.mem_buffer.writeDoubleLE(addr) }

  ldl (addr, size) {
    let b = new Buffer(size)
    this.mem_buffer.copy(b, 0, addr, addr + size)
    return b
  }

  lds (addr, size = -1) {
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

  sstb_bc (addr, value) {
    this.chk_bounds(addr, 1)
    this.sstb(addr, value)
  }

  stw_bc (addr, value) {
    this.chk_bounds(addr, 2)
    this.stw(addr, value)
  }

  sstw_bc (addr, value) {
    this.chk_bounds(addr, 2)
    this.sstw(addr, value)
  }

  st_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.st(addr, value)
  }

  sst_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.sst(addr, value)
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

  sstb (addr, value) { this.mem_buffer.writeInt8(value, addr) }

  stw (addr, value) { this.mem_buffer.writeUInt16LE(value, addr) }

  sstw (addr, value) { this.mem_buffer.writeInt16LE(value, addr) }

  st (addr, value) { this.mem_buffer.writeUInt32LE(value, addr) }

  sst (addr, value) { this.mem_buffer.writeInt32LE(value, addr) }

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

  fill_bc (addr, value, size) {
    this.chk_bounds(addr, size)
    this.fill(addr, value, size)
  }

  fill (addr, value, size) { this.mem_buffer.fill(value, addr, addr + size) }

  copy_bc (src, tgt, size) {
    this.chk_bounds(src, size)
    this.chk_bounds(tgt, size)
    this.copy(src, tgt, size)
  }

  copy (src, tgt, size) { this.mem_buffer.copy(this.mem_buffer, tgt, src, src + size) }

  read (addr, type) {
    switch (type || defaults.type) {
      case 'i8': return this.ldb(addr)
      case 'i16': return this.ldw(addr)
      case 'i32': return this.ld(addr)
      case 's8': return this.sldb(addr)
      case 's16': return this.sldw(addr)
      case 's32': return this.sld(addr)
      case 'f32': return this.ldf(addr)
      case 'i64': return this.ldd(addr)
      case 'str': return this.lds(addr)
      default: return null
    }
  }

  write (addr, value = 0, type) {
    switch (type || defaults.type) {
      case 'i8': return this.stb(addr, value)
      case 'i16': return this.stw(addr, value)
      case 'i32': return this.st(addr, value)
      case 's8': return this.sstb(addr, value)
      case 's16': return this.sstw(addr, value)
      case 's32': return this.sst(addr, value)
      case 'f32': return this.stf(addr, value)
      case 'i64': return this.std(addr, value)
      case 'str': return this.sts(addr, value)
      default: return null
    }
  }

  seq_start (start) { this._seq = start }

  seq_byte (value) {
    this.stb(this._seq, value)
    this._seq++
  }

  seq_word (value) {
    this.stw(this._seq, value)
    this._seq += 2
  }

  seq_dword (value) {
    this.st(this._seq, value)
    this._seq += 4
  }

  seq_float (value) {
    this.stf(this._seq, value)
    this._seq += 4
  }

  seq_double (value) {
    this.std(this._seq, value)
    this._seq += 8
  }

  seq_str (value) {
    this.sts(this._seq, value)
    this._seq += value.length
  }

  seq_end () { this._seq = 0 }

  dump (addr = 0, size = 1024) {
    console.log('Dumping', size, ' bytes from memory at ', hex(addr))
    console.log(hexy.hexy(this.mem_buffer, { offset: addr, length: size, display_offset: addr, width: 16, caps: 'upper', indent: 2 }))
  }

}

mixin(Memory.prototype, StackMixin.prototype)
