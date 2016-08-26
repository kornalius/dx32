import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { Sound } from '../sound.js'


export class SoundPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'snd'

    this.snd_init()

    this.publics = {
      load: this.snd_load,
      name: this.snd_name,
      play: this.snd_play,
      stop: this.snd_stop,
      free: this.snd_free,
      note: this.snd_note,
      poly: this.snd_poly,
      poly_add: this.snd_poly_add,
      poly_rem: this.snd_poly_remove,
    }
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

mixin(SoundPort.prototype, Sound.prototype)
