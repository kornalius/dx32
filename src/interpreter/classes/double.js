import { TLabel } from './label.js'

export class TDouble extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 8
  }

  get value () { return _vm.ldd(this.addr) }

  set value (value) {
    _vm.std(this.addr, value)
  }

}
