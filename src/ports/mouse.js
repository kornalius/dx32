import Port from '../port.js';


class Mouse extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

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

    var stage = vm.ports[1].stage;
    if (stage) {
      stage.interactive = true;
      stage.on('mousedown', this.onLeftButtonDown.bind(this));
      stage.on('rightdown', this.onRightButtonDown.bind(this));
      stage.on('touchstart', this.onLeftButtonDown.bind(this));
      stage.on('mousemove', this.onButtonMove.bind(this));
      stage.on('mouseup', this.onButtonUp.bind(this));
      stage.on('touchend', this.onButtonUp.bind(this));
      stage.on('mouseupoutside', this.onButtonUp.bind(this));
      stage.on('touchendoutside', this.onButtonUp.bind(this));
    }
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

  onLeftButtonDown () {
    this.push(1);
  }

  onRightButtonDown () {
    this.push(2);
  }

  onButtonMove (e) {
    this.push(3, e.data.global.x, e.data.global.y);
  }

  onButtonUp () {
    this.push(4);
  }
}

export default Mouse;
