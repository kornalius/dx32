import { TLabel } from './label.js'

export class TWord extends TLabel {

  constructor () {
    super(...arguments)
    this.size = 2
  }

  get value () { return _vm.ldw(this.addr) }

  set value (value) {
    _vm.stw(this.addr, value)
  }

}
