import { Port } from '../port.js'


export class NetworkPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'net'

    this.stack = _vm.stk_new(null, 8092, false, 'i8')
  }

  reset () {
    super.reset()
    this.stack.reset()
  }

  shut () {
    super.shut()
    this.stack.shut()
  }

}
