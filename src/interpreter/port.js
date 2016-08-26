
export class Port {

  constructor (port_number) {
    let top = _vm.mm.alloc(4)
    // _vm.st(top, port_number)

    this.name = ''

    this.port_number = port_number
    _vm.ports[port_number] = this

    this.top = top

    this.publics = {}
  }

  boot (cold = false) {
    this.reset()
  }

  reset () {
  }

  shut () {
    this.reset()
    // _vm.mm.free(this.top)
    _vm.ports[this.port_number] = null
  }

  tick () {
  }

}
