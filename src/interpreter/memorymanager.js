import hexy from 'hexy'
import prettyBytes from 'pretty-bytes'


export class MemoryManager {

  constructor (mem_buffer, mem_size) {
    this.mem_buffer = mem_buffer
    this.mem_size = mem_size
    this.mem_top = 0
    this.mem_bottom = this.mem_size - 1

    this.blocks = []

    let that = this
    setInterval(() => {
      that.collect()
    }, 30 * 1024)
  }

  avail_mem () { return this.mem_size }

  used_mem () {
    let sz = 0
    for (let b of this.blocks) {
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
    let n = 0

    for (let b of this.blocks) {
      if (b.mem_bottom > n) {
        n = b.mem_bottom
      }

      if (!b.used && b.size >= sz) {
        if (b.size === sz) {
          b.used = true
          return b.mem_top
        }
        let ob = b.mem_bottom
        b.mem_bottom = b.mem_top + sz
        b.size = sz
        b.used = true

        this.blocks.push({ mem_top: b.mem_bottom + 1, mem_bottom: ob, size: ob - (b.mem_bottom + 1), used: false, type })

        return b.mem_top
      }
    }

    if (n + 1 + sz > _vm.mem_bottom) {
      _vm.hlt()
      return 0
    }

    this.blocks.push({ mem_top: n + 1, mem_bottom: n + 1 + sz, size: sz, used: true, type })

    return n + 1
  }

  alloc_b (v) {
    let addr = this.alloc(1, 'b')
    _vm.mem_buffer[addr] = v
    return addr
  }

  alloc_w (v) {
    let addr = this.alloc(2, 'w')
    _vm.mem_buffer.writeUInt16LE(v, addr)
    return addr
  }

  alloc_d (v) {
    let addr = this.alloc(4, 'd')
    _vm.mem_buffer.writeUInt32LE(v, addr)
    return addr
  }

  alloc_s (str, len = 0) {
    len = len || str.length
    let addr = this.alloc(len + 1, 's')
    let a = addr
    for (let i = 0; i < len; i++) {
      _vm.mem_buffer[a++] = str.charCodeAt(i)
    }
    _vm.mem_buffer[a] = 0
    return addr
  }

  free (addr) {
    for (let b of this.blocks) {
      if (b.mem_top === addr) {
        b.used = false
        break
      }
    }
  }

  size (addr) {
    for (let b of this.blocks) {
      if (b.mem_top === addr) {
        return b.mem_bottom - b.mem_top
      }
    }
    return -1
  }

  collect () {
    let n = []
    for (let b of this.blocks) {
      if (!b.used) {
        n.push(b)
      }
    }
    this.blocks = n
  }

  dump () {
    console.log('memory blocks dump', 'avail:', prettyBytes(this.avail_mem()), 'used:', prettyBytes(this.used_mem()), 'free:', prettyBytes(this.free_mem()))
    for (let b of this.blocks) {
      console.log(hexy.hexy(_vm.mem_buffer, { offset: b.mem_top, length: Math.min(255, b.size), display_offset: b.mem_top, width: 16, caps: 'upper', indent: 2 }))
    }
  }
}
