import hexy from 'hexy'
import prettyBytes from 'pretty-bytes'
import { data_type_sizes, data_type_size } from './memory.js'


export class MemoryManager {

  mm_init () {
    this.mm_blocks = []
    this.mm_last = 0
    this.mm_collect_delay = 30720
  }

  mm_tick (t) {
    if (t - this.mm_last >= this.mm_collect_delay) {
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

  free_mem () { return this.avail_mem() - this.used_mem() }

  alloc (size, type) {
    type = type || 'i8'

    if (_.isString(size)) {
      type = size
      size = data_type_size(type)
    }
    else {
      size = size || 1
    }

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

    if (n + size > _vm.mem_bottom) {
      _vm.hlt()
      return 0
    }

    this.mm_blocks.push({ mem_top: n + 1, mem_bottom: n + size, size, type, used: true })

    _vm.fill(0, n + 1, size)

    return n + 1
  }

  alloc_type (type, value) {
    let addr = this.alloc(type)
    _vm.mem_view['set' + _vm.data_view_fns[type]](addr, value)
    return addr
  }

  alloc_b (v) {
    let addr = this.alloc('i8')
    new Uint8Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_b_s (v) {
    let addr = this.alloc('s8')
    new Int8Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_w (v) {
    let addr = this.alloc('i16')
    new Uint16Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_w_s (v) {
    let addr = this.alloc('s16')
    new Int16Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_dw (v) {
    let addr = this.alloc('i32')
    new Uint32Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_dw_s (v) {
    let addr = this.alloc('s32')
    new Int32Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_f (v) {
    let addr = this.alloc('f32')
    new Float32Array(_vm.mem_buffer.buffer, addr)[0] = v
    return addr
  }

  alloc_str (str, size) {
    let addr = this.alloc(size || data_type_sizes.str, 'str')
    _vm.sts(addr, str, size)
    return addr
  }

  free (addr) {
    let b = this.mm_block(addr)
    if (b) {
      b.used = false
    }
  }

  mm_block (addr) {
    for (let b of this.mm_blocks) {
      if (b.mem_top === addr) {
        return b
      }
    }
    return null
  }

  mm_type (addr) {
    let b = this.mm_block(addr)
    return b && b.used ? b.type : null
  }

  mm_size (addr) {
    let b = this.mm_block(addr)
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
      console.log('offset:', _vm.hex(b.mem_top, 32), 'size:', this.mm_size(b.mem_top), 'type:', this.mm_type(b.mem_top))
      console.log(hexy.hexy(_vm.mem_buffer, { offset: b.mem_top, length: Math.min(255, b.size), width: 16, caps: 'upper', indent: 2 }))
    }
  }
}
