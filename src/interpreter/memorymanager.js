import hexy from 'hexy'
import prettyBytes from 'pretty-bytes'


export class MemoryManager {

  mm_init () {
    this.mm_blocks = []
    this.mm_last = 0
  }

  mm_tick (t) {
    if (t - this.mm_last >= 30720) {
      this.mm_collect()
      this.mm_last = t
    }
  }

  mm_reset () {
    this.mm_collect()
  }

  mm_shut () {
    this.mm_collect()
    this.mm_blocks = []
    this.mm_last = 0
  }

  avail_mem () { return this.mem_size }

  used_mem () {
    let size = 0
    for (let b of this.mm_blocks) {
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

    for (let b of this.mm_blocks) {
      if (b.mem_bottom > n) {
        n = b.mem_bottom
      }

      if (!b.used && b.size >= size) {
        if (b.size === size) {
          b.used = true
          return b.mem_top
        }
        let ob = b.mem_bottom
        b.mem_bottom = b.mem_top + size - 1
        b.size = size
        b.used = true

        this.mm_blocks.push({ mem_top: b.mem_bottom + 1, mem_bottom: ob, size: ob - (b.mem_bottom + 1), type, used: false })

        return b.mem_top
      }
    }

    if (n + 1 + size > _vm.mem_bottom) {
      _vm.hlt()
      return 0
    }

    this.mm_blocks.push({ mem_top: n + 1, mem_bottom: n + 1 + size, size, type, used: true })

    _vm.mem_buffer.fill(0, n + 1, n + 1 + size)

    return n + 1
  }

  alloc_b (v) {
    let addr = this.alloc(1, 'i8')
    _vm.mem_buffer.writeUInt8(v, addr)
    return addr
  }

  alloc_b_s (v) {
    let addr = this.alloc(1, 's8')
    _vm.mem_buffer.writeInt8(v, addr)
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

  block (addr) {
    for (let b of this.mm_blocks) {
      if (b.mem_top === addr) {
        return b
      }
    }
    return null
  }

  free (addr) {
    let b = this.block(addr)
    if (b) {
      b.used = false
    }
  }

  type (addr) {
    let b = this.block(addr)
    return b && b.used ? b.type : null
  }

  size (addr) {
    let b = this.block(addr)
    return b && b.used ? b.size : -1
  }

  mm_collect () {
    let n = []
    for (let b of this.mm_blocks) {
      if (!b.used) {
        n.push(b)
      }
    }
    this.mm_blocks = n
  }

  dump () {
    console.log('memory blocks dump...', 'avail:', prettyBytes(this.avail_mem()), 'used:', prettyBytes(this.used_mem()), 'free:', prettyBytes(this.free_mem()))
    for (let b of this.mm_blocks) {
      console.log('')
      console.log('offset:', _vm.hex(b.mem_top, 32), 'size:', this.size(b.mem_top), 'type:', this.type(b.mem_top))
      console.log(hexy.hexy(_vm.mem_buffer, { offset: b.mem_top, length: Math.min(255, b.size), width: 16, caps: 'upper', indent: 2 }))
    }
  }
}
