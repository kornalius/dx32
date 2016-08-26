

export class Stack {

  stk_init (max_stack, entry_size) {
    this.stack_info = _vm.mm.alloc(20)

    this.max_stack = max_stack || 255
    this.entry_size = entry_size || 4
    this.stack_size = this.max_stack * this.entry_size
    this.stack_addr = _vm.mm.alloc(this.stack_size)
    this.stack_ptr = this.stack_addr

    _vm.seq_start(this.stack_info)
    _vm.seq_dword(this.stack_addr)
    _vm.seq_dword(this.stack_ptr)
    _vm.seq_dword(this.max_stack)
    _vm.seq_dword(this.entry_size)
    _vm.seq_dword(this.stack_size)
    _vm.seq_end()
  }

  stk_reset () {
    this.stack_ptr = this.stack_addr
  }

  stk_shut () {
  }

  stk_update_info () {
    _vm.st(this.stack_info + 4, this.stack_ptr)
  }

  stk_psh (...value) {
    let sz = this.entry_size
    for (let v of value) {
      if (this.stack_ptr < this.stack_addr + this.stack_size) {
        this.stack_ptr += sz
        _vm.write(this.stack_ptr, v, sz)
      }
    }
    this.stk_update_info()
  }

  stk_pop () {
    if (this.stk_sz()) {
      let sz = this.entry_size
      _vm.read(this.stack_ptr, sz)
      this.stack_ptr -= sz
      this.stk_update_info()
    }
  }

  stk_sz () { return Math.trunc((this.stack_ptr - this.stack_addr) / this.entry_size) }

}
