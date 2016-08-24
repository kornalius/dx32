import hexy from 'hexy'
import { runtime_error, buffer_to_string } from './globals.js'


class Memory {

  mem_init (mem_size) {
    this.frame_stacks = {}
    this.mem_size = mem_size
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1
    this.mem = new Buffer(this.mem_size)
  }

  mem_tick (t) {
  }

  mem_reset () {
    this.clear()
    this.frame_stacks = {}
  }

  mem_shut () {
    this.mem = null
    this.frame_stacks = {}
  }

  chk_bounds (addr, sz = 4) { if (addr < this.mem_top || addr + sz > this.mem_bottom) { this.hlt(0x06) } }

  db_bc (addr, ...args) {
    this.chk_bounds(addr, args.length)
    this.db(addr, ...args)
  }

  dw_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 2)
    this.dw(addr, ...args)
  }

  dd_bc (addr, ...args) {
    this.chk_bounds(addr, args.length * 4)
    this.dd(addr, ...args)
  }

  ldb_bc (addr) {
    this.chk_bounds(addr, 1)
    return this.ldb(addr)
  }

  ldw_bc (addr) {
    this.chk_bounds(addr, 2)
    return this.ldw(addr)
  }

  ldd_bc (addr) {
    this.chk_bounds(addr, 8)
    return this.ldd(addr)
  }

  ld_bc (addr) {
    this.chk_bounds(addr, 4)
    return this.ld(addr)
  }

  ldl_bc (addr, size) {
    this.chk_bounds(addr, size)
    return this.ldl(addr, size)
  }

  lds_bc (addr, size = -1) {
    this.chk_bounds(addr, size)
    return this.lds(addr, size)
  }

  stb_bc (addr, value) {
    this.chk_bounds(addr, 1)
    this.stb(addr, value)
  }

  stw_bc (addr, value) {
    this.chk_bounds(addr, 2)
    this.stw(addr, value)
  }

  std_bc (addr, value) {
    this.chk_bounds(addr, 8)
    this.std(addr, value)
  }

  st_bc (addr, value) {
    this.chk_bounds(addr, 4)
    this.st(addr, value)
  }

  stl_bc (addr, buffer, size = 0) {
    this.chk_bounds(addr, size)
    this.stl(addr, buffer, size)
  }

  sts_bc (addr, str, len = 0) {
    this.chk_bounds(addr, len)
    this.sts(addr, str, len)
  }

  db (addr, ...args) {
    for (var a of args) {
      this.mem[addr++] = a
    }
  }

  dw (addr, ...args) {
    for (var a of args) {
      this.mem.writeUInt16LE(a, addr)
      addr += 2
    }
  }

  dd (addr, ...args) {
    for (var a of args) {
      this.mem.writeUInt32LE(a, addr)
      addr += 4
    }
  }

  ldb (addr) {
    return this.mem[addr]
  }

  ldw (addr) {
    return this.mem.readUInt16LE(addr)
  }

  ldd (addr) {
    return this.mem.writeDoubleLE(addr)
  }

  ld (addr) {
    return this.mem.readUInt32LE(addr)
  }

  ldl (addr, size) {
    var b = new Buffer(size)
    this.mem.copy(b, 0, addr, addr + size)
    return b
  }

  lds (addr, size = -1) {
    var s = ''
    var l = 0
    while (addr < this.mem_bottom && (size === -1 || l < size)) {
      var c = this.mem[addr++]
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

  stb (addr, value) {
    this.mem[addr] = value
  }

  stw (addr, value) {
    this.mem.writeUInt16LE(value, addr)
  }

  std (addr, value) {
    this.mem.writeDoubleLE(value, addr)
  }

  st (addr, value) {
    this.mem.writeUInt32LE(value, addr)
  }

  stl (addr, buffer, size = 0) {
    buffer.copy(this.mem, addr, 0, size || buffer.length)
  }

  sts (addr, str, len = 0) {
    len = len || str.length
    for (var i = 0; i < len; i++) {
      this.mem[addr++] = str.charCodeAt(i)
    }
    this.mem[addr] = 0
  }

  read (addr, size = 4) {
    switch (size)
    {
      case 1: return this.ldb(addr)
      case 2: return this.ldw(addr)
      case 4: return this.ld(addr)
      case 8: return this.ldd(addr)
      default: return null
    }
  }

  write (addr, value = 0, size = 4) {
    switch (size)
    {
      case 1:
        this.stb(addr, value)
        break
      case 2:
        this.stw(addr, value)
        break
      case 4:
        this.st(addr, value)
        break
      case 8:
        this.std(addr, value)
        break
    }
  }

  fill_bc (addr, value, size) {
    this.chk_bounds(addr, size)
    this.fill(addr, value, size)
  }

  copy_bc (src, tgt, size) {
    this.chk_bounds(src, size) this.chk_bounds(tgt, size)
    this.copy(src, tgt, size)
  }

  fill (addr, value, size) {
    this.mem.fill(value, addr, addr + size)
  }

  copy (src, tgt, size) {
    this.mem.copy(this.mem, tgt, src, src + size)
  }

  seq_start (start) {
    this._seq = start
  }

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

  seq_double (value) {
    this.std(this._seq, value)
    this._seq += 8
  }

  seq_end () {
    this._seq = 0
  }

  dump (addr = 0, size = 1024) {
    console.log('Dumnping', size, ' bytes from memory at ', _vm.hex(addr))
    console.log(hexy.hexy(this.mem, { offset: addr, length: size, display_offset: addr, width: 16, caps: 'upper', indent: 2 }))
  }

  frame_stack (addr, count, entry_size) {
    this.frame_stacks[addr] = { top: addr, bottom: addr + (count - 1) * entry_size, ptr: addr, count, entry_size }
  }

  frame_push (addr, ...values) {
    var s = this.frame_stacks[addr]
    if (s) {
      var sz = s.entry_size
      for (var v of values) {
        if (s.ptr + sz < s.mem_bottom) {
          this.st(s.ptr, v)
          s.ptr += sz
        }
        else {
          runtime_error(this, 0x03)
          break
        }
      }
    }
    else {
      runtime_error(this, 0x04)
    }
  }

  frame_pop (addr) {
    var s = this.frame_stacks[addr]
    if (s) {
      var sz = s.entry_size
      if (s.ptr - sz >= s.mem_top) {
        s.ptr -= sz
        var r = this.ld(s.ptr)
        return r
      }
      else {
        runtime_error(this, 0x02)
        return 0
      }
    }
    else {
      runtime_error(this, 0x04)
      return 0
    }
  }

  clear () {
    this.fill(0, 0, this.mem_size)
  }

}

export default {
  Memory,
}
