import hexy from 'hexy'
import { defaults, runtime_error, hex, data_type_size } from './globals.js'


export class Memory {

  mem_init (mem_size) {
    this.stacks = {}
    this.mem_size = mem_size || 4
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1
    this.mem_buffer = new Buffer(this.mem_size)
  }

  mem_tick (t) {
  }

  mem_reset () {
    this.clear()
    this.stacks = {}
  }

  mem_shut () {
    this.mem_buffer = null
    this.stacks = {}
  }

  clear () { this.fill(0, 0, this.mem_size) }

  chk_bounds (addr, sz = 4) { if (addr < this.mem_top || addr + sz > this.mem_bottom) { this.hlt(0x06) } }

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

  dl_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.dl(addr, ...args)
  }

  dl_s_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.dl_s(addr, ...args)
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

  dl (addr, ...args) {
    let size = 4
    for (let a of args) {
      this.mem_buffer.writeUInt32LE(a, addr)
      addr += size
    }
  }

  dl_s (addr, ...args) {
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

  stb (addr, value) { this.mem_buffer.writeUInt8LE(value, addr) }

  stb_s (addr, value) { this.mem_buffer.writeInt8LE(value, addr) }

  stw (addr, value) { this.mem_buffer.writeUInt16LE(value, addr) }

  stw_s (addr, value) { this.mem_buffer.writeInt16LE(value, addr) }

  st (addr, value) { this.mem_buffer.writeUInt32LE(value, addr) }

  st_s (addr, value) { this.mem_buffer.writeInt32LE(value, addr) }

  stf (addr, value) { this.mem_buffer.writeFloatLE(value, addr) }

  std (addr, value) { this.mem_buffer.writeDoubleLE(value, addr) }

  stl (addr, buffer, size = 0) { buffer.copy(this.mem_buffer, addr, 0, size || buffer.length) }

  sts (addr, str, len = 0) {
    len = len || str.length
    for (let i = 0; i < len; i++) {
      this.mem_buffer[addr++] = str.charCodeAt(i)
    }
    this.mem_buffer[addr] = 0
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
      case 's8': return this.ldb_s(addr)
      case 's16': return this.ldw_s(addr)
      case 's32': return this.ld_s(addr)
      case 'f32': return this.ldf(addr)
      case 'i64': return this.ldd(addr)
      default: return null
    }
  }

  write (addr, value = 0, type) {
    switch (type || defaults.type) {
      case 'i8': return this.stb(addr, value)
      case 'i16': return this.stw(addr, value)
      case 'i32': return this.st(addr, value)
      case 's8': return this.stb_s(addr, value)
      case 's16': return this.stw_s(addr, value)
      case 's32': return this.st_s(addr, value)
      case 'f32': return this.stf(addr, value)
      case 'i64': return this.std(addr, value)
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

  seq_end () { this._seq = 0 }

  dump (addr = 0, size = 1024) {
    console.log('Dumnping', size, ' bytes from memory at ', hex(addr))
    console.log(hexy.hexy(this.mem_buffer, { offset: addr, length: size, display_offset: addr, width: 16, caps: 'upper', indent: 2 }))
  }

  stack (addr, count, entry_type = 'i8') {
    let entry_size = data_type_size(entry_type)
    this.stacks[addr] = { top: addr, bottom: addr + (count - 1) * entry_size, ptr: addr, count, entry_type, entry_size }
  }

  push (addr, ...values) {
    let s = this.stacks[addr]
    if (s) {
      let sz = s.entry_size
      for (let v of values) {
        if (s.ptr + sz < s.bottom) {
          this.write(s.ptr, v, s.entry_type)
          s.ptr += sz
        }
        else {
          runtime_error(0x03)
          break
        }
      }
    }
    else {
      runtime_error(0x04)
    }
  }

  pop (addr) {
    let s = this.stacks[addr]
    if (s) {
      let sz = s.entry_size
      if (s.ptr - sz >= s.top) {
        s.ptr -= sz
        let r = this.read(s.ptr, s.entry_type)
        return r
      }
      else {
        runtime_error(0x02)
        return 0
      }
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

}
