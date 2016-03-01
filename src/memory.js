import hexy from 'hexy';

class Memory {

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

  stl (addr, buffer, size) { buffer.copy(this.mem, addr, 0, size); }

  sts (addr, str) {
    for (var i = 0; i < str.length; i++) {
      this.mem[addr++] = str.charCodeAt(i);
    }
    this.mem[addr] = 0;
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

}

export default Memory;
