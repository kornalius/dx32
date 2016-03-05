
class Stack {

  init_stack (max_stack = 255, entry_size = 4) {
    this.stack_info = _vm.mm.alloc(20);

    this.max_stack = max_stack;
    this.entry_size = entry_size;
    this.stack_size = this.max_stack * this.entry_size;
    this.stack = _vm.mm.alloc(this.stack_size);
    this.stack_ptr = this.stack;

    _vm.beginSequence(this.stack_info);
    _vm.dword(this.stack);
    _vm.dword(this.stack_ptr);
    _vm.dword(this.max_stack);
    _vm.dword(this.entry_size);
    _vm.dword(this.stack_size);
    _vm.endSequence();
  }

  update_stack_ptr_info () {
    _vm.st(this.stack_info + 4, this.stack_ptr);
  }

  push (...value) {
    var sz = this.entry_size;
    for (var v of value) {
      if (this.stack_ptr < this.stack + this.stack_size) {
        this.stack_ptr += sz;
        _vm.write(this.stack_ptr, v, sz);
      }
    }
    this.update_stack_ptr_info();
  }

  pop () {
    if (this.stack_size()) {
      var sz = this.entry_size;
      _vm.read(this.stack_ptr, sz);
      this.stack_ptr -= sz;
      this.update_stack_ptr_info();
    }
  }

  stack_size () { return Math.trunc((this.stack_ptr - this.stack) / this.entry_size); }

}

export default Stack;
