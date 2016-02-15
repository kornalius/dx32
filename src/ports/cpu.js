import Port from '../port.js';
import { defaults } from '../globals.js';


class CPU extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);
  }

  boot (cold = false) {
    super.boot(cold);

    if (cold) {
    }

  }

  reset () {
    super.reset();
  }

  shut () {
    super.shut();
  }

}

export default CPU
