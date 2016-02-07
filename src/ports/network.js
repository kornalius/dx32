import Port from '../port.js';
import { defaults } from '../globals.js';


class Network extends Port {

  constructor (vm, port_number, mem_size = defaults.network.mem_size, stack_size = defaults.network.stack_size) {
    super(vm, port_number, mem_size, stack_size);
  }

}

export default Network
