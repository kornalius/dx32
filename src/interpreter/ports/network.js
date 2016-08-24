import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { mixin } from '../../globals.js'


class NetworkPort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)
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

export default {
  NetworkPort,
}
