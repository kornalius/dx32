import Port from '../port.js';
import { defaults } from '../globals.js';


class Disk extends Port {

  constructor (vm, port_number, mem_size = defaults.disk.mem_size, stack_size = defaults.disk.stack_size) {
    super(vm, port_number, mem_size, stack_size);
  }

}

export default Disk
