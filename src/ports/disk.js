import Port from '../port.js';
import { defaults } from '../globals.js';


class Disk extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);
  }

}

export default Disk
