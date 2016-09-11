import { defaults, mixin, data_type_size, runtime_error } from '../globals.js'
import { Struct } from './struct.js'


export var mem_stacks = {}


export class Stack {

  constructor (addr, max_entries, entry_type, rolling, entry_size) {
    entry_type = entry_type || _vm.type(addr) || defaults.type
    entry_size = entry_size || data_type_size(entry_type)
    max_entries = max_entries || 255

    let sizes = max_entries * entry_size

    this.struct_init(null, null, [
      { name: 'mem_top', type: 'i32' },
      { name: 'mem_bottom', type: 'i32' },
      { name: 'mem_ptr', type: 'i32' },
      { name: 'max_entries', type: 'i16', value: max_entries },
      { name: 'entry_type', type: 'str', value: entry_type },
      { name: 'entry_size', type: 'i16', value: entry_size },
      { name: 'rolling', type: 'i8', value: rolling || 0 },
    ])

    this.mem_top = addr
    this.mem_bottom = this.mem_top + sizes - 1
    this.mem_ptr = this.mem_top

    mem_stacks[this.mem_top] = this
  }

  reset () {
    this.mem_ptr = this.mem_top
  }

  shut () {
    this.struct_shut()
    mem_stacks[this.mem_top] = undefined
  }

  push (...value) {
    let sz = this.entry_size
    let t = this.entry_type
    let top = this.mem_top
    let bottom = this.mem_bottom
    let rolling = this.rolling
    for (let v of value) {
      if (rolling && this.mem_ptr >= bottom) {
        _vm.copy(top + sz, top, this.mem_bottom - sz)
        this.mem_ptr -= sz
      }
      if (this.mem_ptr + sz < bottom) {
        this.mem_ptr += sz
        _vm.write(v, this.mem_ptr, t)
      }
      else {
        runtime_error(0x03)
        break
      }
    }
  }

  pop () {
    if (this.mem_ptr > this.mem_top) {
      let r = _vm.read(this.mem_ptr, this.type)
      this.mem_ptr -= this.entry_size
      return r.value
    }
    else {
      runtime_error(0x02)
      return 0
    }
  }

  get used () { return Math.trunc((this.mem_ptr - this.mem_top) / this.entry_size) }

}

mixin(Stack.prototype, Struct.prototype)


export class StackBuffer {

  stk_init () {
    mem_stacks = {}
  }

  stk_reset () {
    mem_stacks = {}
  }

  stk_shut () {
    mem_stacks = {}
  }

  stk_new (addr, max_entries, entry_type, rolling, entry_size) {
    let s = mem_stacks[addr]
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
    let s = mem_stacks[addr]
    if (s) {
      return s.push(...values)
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_pop (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.pop()
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_used (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.used
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_max (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.max_entries
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_size (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.entry_size
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_type (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.entry_type
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

}
