import Port from '../port.js';
import Stack from '../stack.js';
import { mixin } from '../globals.js';


class Network extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.init_stack(8092, 1);
  }

}

mixin(Network.prototype, Stack.prototype);

export default Network;
