import hexy from 'hexy';
import prettyBytes from 'pretty-bytes';


class MemoryManager {

  constructor (vm, mem, mem_size) {
    this.vm = vm;

    this.mem = mem;
    this.mem_size = mem_size;
    this.top = 0;
    this.bottom = this.mem_size - 1;

    this.blocks = [];

    var that = this;
    setInterval(() => {
      that.collect();
    }, 30 * 1024);
  }

  avail_mem () { return this.mem_size; }

  used_mem () {
    var sz = 0;
    for (var b of this.blocks) {
      if (b.used) {
        sz += b.size;
      }
    }
    return sz;
  }

  free_mem () {
    return this.avail_mem() - this.used_mem();
  }

  alloc (sz) {
    var n = 0;

    for (var b of this.blocks) {

      if (b.bottom > n) {
        n = b.bottom;
      }

      if (!b.used && b.size >= sz) {
        if (b.size === sz) {
          b.used = true;
          return b.top;
        }
        var ob = b.bottom;
        b.bottom = b.top + sz;
        b.size = sz;
        b.used = true;

        this.blocks.push({ top: b.bottom + 1, bottom: ob, size: ob - (b.bottom + 1), used: false });

        return b.top;
      }
    }

    if (n + 1 + sz > this.vm.bottom) {
      this.vm.hlt();
      return 0;
    }

    this.blocks.push({ top: n + 1, bottom: n + 1 + sz, size: sz, used: true });

    return n + 1;
  }

  alloc_b (v) {
    var addr = this.alloc(1);
    this.vm.mem[addr] = v;
    return addr;
  }

  alloc_w (v) {
    var addr = this.alloc(2);
    this.vm.mem.writeUInt16LE(v, addr);
    return addr;
  }

  alloc_d (v) {
    var addr = this.alloc(4);
    this.vm.mem.writeUInt32LE(v, addr);
    return addr;
  }

  alloc_s (str, len = 0) {
    len = len || str.length;
    var addr = this.alloc(len + 1);
    var a = addr;
    for (var i = 0; i < len; i++) {
      this.vm.mem[a++] = str.charCodeAt(i);
    }
    this.vm.mem[a] = 0;
    return addr;
  }

  free (addr) {
    for (var b of this.blocks) {
      if (b.top === addr) {
        b.used = false;
        break;
      }
    }
  }

  size (addr) {
    for (var b of this.blocks) {
      if (b.top === addr) {
        return b.bottom - b.top;
      }
    }
    return -1;
  }

  collect () {
    var n = [];
    for (var b of this.blocks) {
      if (!b.used) {
        n.push(b);
      }
    }
    this.blocks = n;
  }

  dump () {
    console.log('memory blocks dump', 'avail:', prettyBytes(this.avail_mem()), 'used:', prettyBytes(this.used_mem()), 'free:', prettyBytes(this.free_mem()));
    for (var b of this.blocks) {
      console.log(hexy.hexy(this.vm.mem, { offset: b.top, length: Math.min(255, b.size), display_offset: b.top, width: 16, caps: 'upper', indent: 2 }));
    }
  }
}

export default MemoryManager;
