
class Port {

  constructor (vm, port_number) {
    var top = vm.mm.alloc(4);
    // vm.st(top, port_number);

    this.port_number = port_number;
    vm.ports[port_number] = this;

    this.top = top;
  }

  boot (cold = false) {
    this.reset();
  }

  reset () {
  }

  shut () {
    this.reset();
    // _vm.mm.free(this.top);
    _vm.ports[this.port_number] = null;
  }

  tick () {
  }

}

export default Port;
