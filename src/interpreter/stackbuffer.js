import { defaults, mixin, runtime_error } from '../globals.js'
import { Struct } from './struct.js'
import { data_type_size } from './memory.js'


export var mem_stacks = {}


export class Stack {

  constructor (addr, max_entries, entry_type, rolling, entry_size) {
    entry_type = entry_type || _vm.mm_type(addr) || defaults.type
    entry_size = entry_size || data_type_size(entry_type)
    max_entries = max_entries || 255

    let sz = max_entries * entry_size

    this.struct_init([
      { name: 'stk_ptr', type: 'i32', value: addr },
      { name: 'stk_top', type: 'i32', value: addr },
      { name: 'stk_bottom', type: 'i32', value: addr + sz - 1 },
      { name: 'stk_size', type: 'i32', value: sz },
      { name: 'max_entries', type: 'i16', value: max_entries },
      { name: 'entry_type', type: 'str', value: entry_type },
      { name: 'entry_size', type: 'i16', value: entry_size },
      { name: 'rolling', type: 'i8', value: rolling },
    ])

    mem_stacks[this.stk_top] = this
  }

  reset () {
    this.stk_ptr = this.stk_top
  }

  shut () {
    mem_stacks[this.stk_top] = undefined
    this.struct_shut()
  }

  push (...value) {
    let sz = this.entry_size
    let t = this.entry_type
    let top = this.stk_top
    let bottom = this.stk_bottom
    let rolling = this.rolling
    for (let v of value) {
      if (rolling && this.stk_ptr >= bottom) {
        this.copy(top + sz, top, this.stk_bottom - sz)
        this.stk_ptr -= sz
      }
      if (this.stk_ptr + sz < bottom) {
        this.write(v, this.stk_ptr, t)
        this.stk_ptr += sz
      }
      else {
        runtime_error(0x03)
        break
      }
    }
  }

  pop () {
    if (this.stk_ptr > this.stk_top) {
      this.stk_ptr -= this.entry_size
      return this.read(this.stk_ptr, this.type)
    }
    else {
      runtime_error(0x02)
      return 0
    }
  }

  get used () { return Math.trunc((this.stk_ptr - this.stk_top) / this.entry_size) }

}


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

  stk_esize (addr) {
    let s = mem_stacks[addr]
    if (s) {
      return s.entry_size
    }
    else {
      runtime_error(0x04)
      return 0
    }
  }

  stk_etype (addr) {
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

mixin(Stack.prototype, Struct.prototype)
