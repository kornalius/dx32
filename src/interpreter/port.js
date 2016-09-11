

export class Port {

  constructor (port_number) {
    this.name = ''

    this.port_number = port_number
    _vm.ports[port_number] = this

    this.publics = {}
  }

  boot (cold = false) {
    this.reset()
  }

  reset () {
    if (this.mem_top && this.mem_bottom) {
      _vm.fill(0, this.mem_top, this.mem_bottom)
    }
  }

  shut () {
    this.reset()
    if (this.mem_top) {
      _vm.free(this.mem_top)
    }
    _vm.ports[this.port_number] = null
  }

  tick () {
  }

}
