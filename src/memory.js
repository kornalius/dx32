import hexy from 'hexy';
import { runtime_error } from './globals.js';

class Memory {

  init_mem (mem_size) {
    this.stacks = {};
    this.mem_size = mem_size;
    this.top = 0;
    this.bottom = this.mem_size - 1;
    this.mem = new Buffer(this.mem_size);
  }

  db (addr, ...args) {
    for (var a of args) {
      this.mem[addr++] = a;
    }
  }

  dw (addr, ...args) {
    for (var a of args) {
      this.mem.writeUInt16LE(a, addr);
      addr += 2;
    }
  }

  dd (addr, ...args) {
    for (var a of args) {
      this.mem.writeUInt32LE(a, addr);
      addr += 4;
    }
  }

  ldb (addr) { return this.mem[addr]; }

  ldw (addr) { return this.mem.readUInt16LE(addr); }

  ldd (addr) { return this.mem.writeDoubleLE(addr); }

  ld (addr) { return this.mem.readUInt32LE(addr); }

  ldl (addr, size) {
    var b = new Buffer(size);
    this.mem.copy(b, 0, addr, addr + size);
    return b;
  }

  lds (addr, size = -1) {
    var s = '';
    var l = 0;
    while (addr < this.bottom && (size === -1 || l < size)) {
      var c = this.mem[addr++];
      if (c === 0) {
        if (size === -1) {
          break;
        }
      }
      else {
        s += String.fromCharCode(c);
      }
      l++;
    }
    return s;
  }

  stb (addr, value) { this.mem.writeUInt8(value, addr); }

  stw (addr, value) { this.mem.writeUInt16LE(value, addr); }

  std (addr, value) { this.mem.writeDoubleLE(value, addr); }

  st (addr, value) { this.mem.writeUInt32LE(value, addr); }

  stl (addr, buffer, size = 0) { buffer.copy(this.mem, addr, 0, size || buffer.length); }

  sts (addr, str, len = 0) {
    len = len || str.length;
    for (var i = 0; i < len; i++) {
      this.mem[addr++] = str.charCodeAt(i);
    }
    this.mem[addr] = 0;
  }

  stringBuffer (str, len = 0) {
    len = len || str.length;
    var b = new Buffer(len);
    b.write(str, 0, str.length, 'ascii');
    return b;
  }

  read (addr, size = 4) {
    switch (size)
    {
      case 1: return this.ldb(addr);
      case 2: return this.ldw(addr);
      case 4: return this.ld(addr);
      default: return null;
    }
  }

  write (addr, value = 0, size = 4) {
    switch (size)
    {
      case 1:
        this.stb(addr, value);
        break;
      case 2:
        this.stw(addr, value);
        break;
      case 4:
        this.st(addr, value);
        break;
    }
  }

  fill (addr, value, size) {
    this.mem.fill(value, addr, addr + size);
  }

  copy (src, tgt, size) {
    this.mem.copy(this.mem, tgt, src, src + size);
  }

  beginSequence (start) {
    this._seq = start;
  }

  byte (value) {
    this.stb(this._seq, value);
    this._seq++;
  }

  word (value) {
    this.stw(this._seq, value);
    this._seq += 2;
  }

  dword (value) {
    this.st(this._seq, value);
    this._seq += 4;
  }

  double (value) {
    this.std(this._seq, value);
    this._seq += 8;
  }

  endSequence () {
    this._seq = 0;
  }

  dump (addr = 0, size = 1024) {
    console.log('Dumnping', size, ' bytes from memory at ', _vm.hex(addr));
    console.log(hexy.hexy(this.mem, { offset: addr, length: size, display_offset: addr, width: 16, caps: 'upper', indent: 2 }));
  }

  stk (addr, count, entry_size) {
    this.stacks[addr] = { top: addr, bottom: addr + (count - 1) * entry_size, ptr: addr, count, entry_size };
  }

  psh (addr, ...values) {
    var s = this.stacks[addr];
    if (s) {
      var sz = s.entry_size;
      for (var v of values) {
        if (s.ptr + sz < s.bottom) {
          this.st(s.ptr, v);
          s.ptr += sz;
        }
        else {
          runtime_error(this, 0x03);
          break;
        }
      }
    }
    else {
      runtime_error(this, 0x04);
    }
  }

  pop (addr) {
    var s = this.stacks[addr];
    if (s) {
      var sz = s.entry_size;
      if (s.ptr - sz >= s.top) {
        s.ptr -= sz;
        var r = this.ld(s.ptr);
        return r;
      }
      else {
        runtime_error(this, 0x02);
        return 0;
      }
    }
    else {
      runtime_error(this, 0x04);
      return 0;
    }
  }

  clear_mem () {
    this.fill(0, 0, this.mem_size);
  }

}

export default Memory;
