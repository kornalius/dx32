import Port from '../port.js';
import { defaults } from '../globals.js';


class Keyboard extends Port {

  constructor (vm, port_number, mem_size = defaults.keyboard.mem_size, stack_size = defaults.keyboard.stack_size) {
    super(vm, port_number, mem_size, stack_size);
  }

}

export default Keyboard
