import Port from '../port.js';
import { defaults } from '../globals.js';


class Mouse extends Port {

  constructor (vm, port_number, mem_size = defaults.mouse.mem_size, stack_size = defaults.mouse.stack_size) {
    super(vm, port_number, mem_size, stack_size);
  }

}

export default Mouse
