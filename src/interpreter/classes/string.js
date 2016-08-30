import { TLabel } from './label.js'

export class TString extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 0
  }

  get value () { return _vm.lds(this.addr) }

  set value (value) {
    _vm.sts(this.addr, value)
  }

}
