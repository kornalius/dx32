import { TLabel } from './label.js'

export class TDword extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 4
  }

  get value () { return _vm.ld(this.addr) }

  set value (value) {
    _vm.st(this.addr, value)
  }

}
