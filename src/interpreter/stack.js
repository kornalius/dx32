import { defaults, data_type_size, runtime_error } from '../globals.js'


export var stacks = {}


export class Stack {

  constructor (addr, max_entries, entry_type, rolling, entry_size) {
    entry_type = entry_type || _vm.type(addr) || defaults.type
    entry_size = entry_size || data_type_size(entry_type)

    this.info = _vm.alloc(24 + entry_type.length + 1)

    this.top = addr
    this.max_entries = max_entries || 255
    this.entry_type = entry_type
    this.entry_size = entry_size
    this.size = this.max_entries * this.entry_size
    this.rolling = rolling || false

    if (!this.top) {
      this.top = _vm.alloc(this.size)
    }
    this.ptr = this.top

    this.bottom = this.top + this.size

    stacks[this.top] = this

    let i = _vm.seq_start(this.info)
    _vm.seq_dword(i, this.ptr)
    _vm.seq_dword(i, this.size)
    _vm.seq_dword(i, this.top)
    _vm.seq_dword(i, this.bottom)
    _vm.seq_dword(i, this.max_entries)
    _vm.seq_dword(i, this.entry_size)
    _vm.seq_str(i, this.entry_type + '\0')
    _vm.seq_end()
  }

  reset () {
    this.ptr = this.top
  }

  shut () {
    stacks[this.top] = undefined
  }

  update_info () {
    _vm.st(this.info, this.ptr)
  }

  push (...value) {
    let sz = this.entry_size
    let t = this.entry_type
    let top = this.top
    let bottom = this.bottom
    let rolling = this.rolling
    for (let v of value) {
      if (rolling && this.ptr >= bottom) {
        _vm.copy(top + sz, top, this.size - sz)
        this.ptr -= sz
      }
      if (this.ptr + sz < bottom) {
        this.ptr += sz
        _vm.write(this.ptr, v, t)
      }
      else {
        runtime_error(0x03)
        break
      }
    }
    this.update_info()
  }

  pop () {
    if (this.ptr > this.top) {
      let r = _vm.read(this.ptr, this.type)
      this.ptr -= this.entry_size
      this.update_info()
      return r
    }
    else {
      runtime_error(0x02)
      return 0
    }
  }

  get used () { return Math.trunc((this.ptr - this.top) / this.entry_size) }

}


export class StackMixin {

  stk_init () {
    stacks = {}
  }

  stk_reset () {
    stacks = {}
  }

  stk_shut () {
    stacks = {}
  }

  stk_new (addr, max_entries, entry_type, rolling, entry_size) {
    let s = stacks[addr]
    if (!s) {
      s = new Stack(...arguments)
      return s
    }
    else {
      runtime_error(0x04)
      return null
    }
  }

  stk_push (addr, ...values) {
    let s = stacks[addr]
    if (s) {
      return s.push(...values)
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_pop (addr) {
    let s = stacks[addr]
    if (s) {
      return s.pop()
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_used (addr) {
    let s = stacks[addr]
    if (s) {
      return s.used
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_max (addr) {
    let s = stacks[addr]
    if (s) {
      return s.max_entries
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_size (addr) {
    let s = stacks[addr]
    if (s) {
      return s.entry_size
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_type (addr) {
    let s = stacks[addr]
    if (s) {
      return s.entry_type
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

}
