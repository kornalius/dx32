import { TLabel } from './label.js'

export class TFloat extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 4
  }

  get value () { return _vm.ldf(this.addr) }

  set value (value) {
    _vm.stf(this.addr, value)
  }

}
