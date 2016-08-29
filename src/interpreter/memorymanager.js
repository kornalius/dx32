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
    let size = 0
    for (let b of this.blocks) {
      if (b.used) {
        size += b.size
      }
    }
    return size
  }

  free_mem () {
    return this.avail_mem() - this.used_mem()
  }

  alloc (size = 1, type = 'i8') {
    let n = 0

    for (let b of this.blocks) {
      if (b.mem_bottom > n) {
        n = b.mem_bottom
      }

      if (!b.used && b.size >= size) {
        if (b.size === size) {
          b.used = true
          return b.mem_top
        }
        let ob = b.mem_bottom
        b.mem_bottom = b.mem_top + size
        b.size = size
        b.used = true

        this.blocks.push({ mem_top: b.mem_bottom + 1, mem_bottom: ob, size: ob - (b.mem_bottom + 1), type, used: false })

        return b.mem_top
      }
    }

    if (n + 1 + size > _vm.mem_bottom) {
      _vm.hlt()
      return 0
    }

    this.blocks.push({ mem_top: n + 1, mem_bottom: n + 1 + size, size, type, used: true })

    return n + 1
  }

  alloc_b (v) {
    let addr = this.alloc(1, 'i8')
    _vm.mem_buffer.writeUInt8LE(v, addr)
    return addr
  }

  alloc_b_s (v) {
    let addr = this.alloc(1, 's8')
    _vm.mem_buffer.writeInt8LE(v, addr)
    return addr
  }

  alloc_w (v) {
    let addr = this.alloc(2, 'i16')
    _vm.mem_buffer.writeUInt16LE(v, addr)
    return addr
  }

  alloc_w_s (v) {
    let addr = this.alloc(2, 's16')
    _vm.mem_buffer.writeInt16LE(v, addr)
    return addr
  }

  alloc_dw (v) {
    let addr = this.alloc(4, 'i32')
    _vm.mem_buffer.writeUInt32LE(v, addr)
    return addr
  }

  alloc_dw_s (v) {
    let addr = this.alloc(4, 's32')
    _vm.mem_buffer.writeInt32LE(v, addr)
    return addr
  }

  alloc_f (v) {
    let addr = this.alloc(4, 'f32')
    _vm.mem_buffer.writeFloatLE(v, addr)
    return addr
  }

  alloc_dd (v) {
    let addr = this.alloc(8, 'i64')
    _vm.mem_buffer.writeDoubleLE(v, addr)
    return addr
  }

  alloc_str (str, len = 0) {
    len = len || str.length
    let addr = this.alloc(len + 1, 'str')
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

  type (addr) {
    for (let b of this.blocks) {
      if (b.mem_top === addr && b.used) {
        return b.type
      }
    }
    return null
  }

  size (addr) {
    for (let b of this.blocks) {
      if (b.mem_top === addr && b.used) {
        return b.size
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
