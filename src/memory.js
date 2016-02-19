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

  ld (addr) { return this.mem.readUInt32LE(addr); }

  ldl (addr, size) {
    var b = new Buffer(size);
    this.mem.copy(b, 0, addr, addr + size);
    return b;
  }

  lds (addr, size = -1) {
    var s = '';
    var c = this.mem[addr++];
    var l = 0;
    while (addr < this.bottom && l < size) {
      if (c === 0) {
        if (size === -1) {
          break;
        }
      }
      else {
        s += String.fromCharCode(c);
      }
      c = this.mem[addr++];
      l++;
    }
    return s;
  }

  stb (addr, value) { this.mem.writeUInt8(addr, value); }

  stw (addr, value) { this.mem.writeUInt16LE(addr, value); }

  st (addr, value) { this.mem.writeUInt32LE(addr, value); }

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

  endSequence () {
    this._seq = 0;
  }

}

export default Memory
