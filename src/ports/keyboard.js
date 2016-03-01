import Port from '../port.js';


class Keyboard extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.keys = {};

    this.info = vm.mm.alloc(32);

    this.max_stack = 1024;
    this.entry_size = 2;
    this.stack_size = this.max_stack * this.entry_size;
    this.stack = vm.mm.alloc(this.stack_size);
    this.stack_ptr = this.stack;

    _vm.beginSequence(this.info);
    _vm.dword(this.stack);
    _vm.dword(this.stack_ptr);
    _vm.dword(this.max_stack);
    _vm.dword(this.entry_size);
    _vm.dword(this.stack_size);
    _vm.endSequence();

    window.addEventListener('keydown', this.onKeydown.bind(this));
    window.addEventListener('keyup', this.onKeyup.bind(this));
  }

  updateInfo () {
    _vm.mem.writeUInt32LE(this.stack_ptr, this.info + 4);
  }

  push (...value) {
    for (var v of value) {
      if (this.stack_ptr < this.stack + this.stack_size) {
        this.stack_ptr += 2;
        _vm.mem.writeUInt16LE(v, this.stack_ptr);
      }
    }
    this.updateInfo();
  }

  pop () {
    if (this.size()) {
      _vm.mem.readUInt16LE(this.stack_ptr);
      this.stack_ptr -= 2;
      this.updateInfo();
    }
  }

  size () { return this.stack_ptr - this.stack; }

  onKeydown (e) {
    this.push(1, e.which);
    if (!e.repeat) {
      this.keys[e.which] = 0;
    }
    this.keys[e.which]++;
    // e.preventDefault();
    e.stopPropagation();
  }

  onKeyup (e) {
    this.push(2, e.which);
    delete this.keys[e.which];
    // e.preventDefault();
    e.stopPropagation();
  }

  pressed (which) { return this.keys[which] || false; }

}

export default Keyboard;
