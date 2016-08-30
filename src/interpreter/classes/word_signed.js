import { TWord } from './word.js'

export class TSignedWord extends TWord {

  constructor () {
    super(...arguments)
    this.size = 2
  }

  get value () { return _vm.ldw_s(this.addr) }

  set value (value) {
    _vm.stw_s(this.addr, value)
  }

}
