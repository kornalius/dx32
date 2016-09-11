import { Port } from '../port.js'


export class CPUPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'cpu'

    this.mem_top = _vm.alloc(1)
    this.mem_bottom = this.mem_top
  }

}
