import { TLabel } from './label.js'

export class TByte extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 1
  }

  get value () { return _vm.ldb(this.addr) }

  set value (value) {
    _vm.stb(this.addr, value)
  }

}
