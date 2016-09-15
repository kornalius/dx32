import hexy from 'hexy'
import prettyBytes from 'pretty-bytes'
import { data_type_size } from './memory.js'


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

  mm_alloc (type, count) {
    count = count || 1
    let size = data_type_size(type) * count
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
        b.count = count
        b.used = true

        this.mm_blocks.push({ mem_top: b.mem_bottom + 1, mem_bottom: ob, size: ob - (b.mem_bottom + 1), count, type, used: false })

        return b.mem_top
      }
    }

    if (n + size > _vm.mem_bottom) {
      _vm.hlt()
      return 0
    }

    let addr = n + 1

    this.mm_blocks.push({ mem_top: addr, mem_bottom: addr + size - 1, size, count, type, used: true })

    _vm.fill(0, addr, size)

    return addr
  }

  alloc (type, count, ...value) {
    let addr = this.mm_alloc(type, count)

    if (value) {
      let size = data_type_size(type) * count
      let a = addr
      for (let v of value) {
        _vm.write(v, a, type)
        a += size
      }
    }

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
