import Port from '../port.js';
import { defaults } from '../globals.js';


class Video extends Port {

  constructor (vm, port_number, mem_size = defaults.video.mem_size, stack_size = defaults.video.stack_size) {
    super(vm, port_number, mem_size, stack_size);
  }

}

export default Video
