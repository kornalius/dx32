import Port from '../port.js';
import { defaults } from '../globals.js';


class CPU extends Port {

  constructor (vm, port_number, mem_size = defaults.cpu.mem_size) {
    super(vm, port_number, mem_size);
  }

  boot (cold = false) {
    super.boot(cold);

    if (cold) {
      // _vm.opcodes.qry = {
      //   fn: (id, addr) => {
      //     switch(id) {
      //       case 0x01:
      //         _vm.set(addr, 'username');
      //         break;

      //       case 0x02:
      //         _vm.set(addr, Date.now());
      //         break;
      //     }
      //   }
      // };
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
