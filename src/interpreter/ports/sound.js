import { Port } from '../port.js'
import { Sound } from '../sound.js'


class SoundPort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)
    this.snd_init()
  }

  reset () {
    super.reset()
    this.snd_reset()
  }

  shut () {
    super.shut()
    this.snd_shut()
  }

}

mixin(SoundPort.prototype, SoundMixin.prototype)

export default {
  SoundPort,
}
