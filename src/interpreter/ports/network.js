import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { mixin } from '../../globals.js'


export class NetworkPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'net'

    this.stk_init(8092, 1)
  }

  reset () {
    super.reset()
    this.stk_reset()
  }

  shut () {
    super.shut()
    this.stk_shut()
  }

}

mixin(NetworkPort.prototype, Stack.prototype)
