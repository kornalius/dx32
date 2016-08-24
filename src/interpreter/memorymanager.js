import hexy from 'hexy'
import prettyBytes from 'pretty-bytes'


class MemoryManager {

  constructor (vm, mem, mem_size) {
    this.vm = vm

    this.mem = mem
    this.mem_size = mem_size
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1

    this.blocks = []

    var that = this
    setInterval(() => {
      that.collect()
    }, 30 * 1024)
  }

  avail_mem () { return this.mem_size }

  used_mem () {
    var sz = 0
    for (var b of this.blocks) {
      if (b.used) {
        sz += b.size
      }
    }
    return sz
  }

  free_mem () {
    return this.avail_mem() - this.used_mem()
  }

  alloc (sz, type = 'b') {
    var n = 0

    for (var b of this.blocks) {

      if (b.mem_bottom > n) {
        n = b.mem_bottom
      }

      if (!b.used && b.size >= sz) {
        if (b.size === sz) {
          b.used = true
          return b.mem_top
        }
        var ob = b.mem_bottom
        b.mem_bottom = b.mem_top + sz
        b.size = sz
        b.used = true

        this.blocks.push({ mem_top: b.mem_bottom + 1, mem_bottom: ob, size: ob - (b.mem_bottom + 1), used: false, type })

        return b.mem_top
      }
    }

    if (n + 1 + sz > this.vm.mem_bottom) {
      this.vm.hlt()
      return 0
    }

    this.blocks.push({ mem_top: n + 1, mem_bottom: n + 1 + sz, size: sz, used: true, type })

    return n + 1
  }

  alloc_b (v) {
    var addr = this.alloc(1, 'b')
    this.vm.mem[addr] = v
    return addr
  }

  alloc_w (v) {
    var addr = this.alloc(2, 'w')
    this.vm.mem.writeUInt16LE(v, addr)
    return addr
  }

  alloc_d (v) {
    var addr = this.alloc(4, 'd')
    this.vm.mem.writeUInt32LE(v, addr)
    return addr
  }

  alloc_s (str, len = 0) {
    len = len || str.length
    var addr = this.alloc(len + 1, 's')
    var a = addr
    for (var i = 0; i < len; i++) {
      this.vm.mem[a++] = str.charCodeAt(i)
    }
    this.vm.mem[a] = 0
    return addr
  }

  free (addr) {
    for (var b of this.blocks) {
      if (b.mem_top === addr) {
        b.used = false
        break
      }
    }
  }

  size (addr) {
    for (var b of this.blocks) {
      if (b.mem_top === addr) {
        return b.mem_bottom - b.mem_top
      }
    }
    return -1
  }

  collect () {
    var n = []
    for (var b of this.blocks) {
      if (!b.used) {
        n.push(b)
      }
    }
    this.blocks = n
  }

  dump () {
    console.log('memory blocks dump', 'avail:', prettyBytes(this.avail_mem()), 'used:', prettyBytes(this.used_mem()), 'free:', prettyBytes(this.free_mem()))
    for (var b of this.blocks) {
      console.log(hexy.hexy(this.vm.mem, { offset: b.mem_top, length: Math.min(255, b.size), display_offset: b.mem_top, width: 16, caps: 'upper', indent: 2 }))
    }
  }
}

export default {
  MemoryManager,
}
