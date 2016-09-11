import { Port } from '../port.js'


export class NetworkPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'net'
  }

  reset () {
    super.reset()
  }

  shut () {
    super.shut()
  }

}
