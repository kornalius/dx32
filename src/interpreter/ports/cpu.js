import { Port } from '../port.js'


export class CPUPort extends Port {

  constructor (port_number) {
    super(port_number)
    this.name = 'cpu'
  }

}
