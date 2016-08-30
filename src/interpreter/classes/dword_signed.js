import { TDWord } from './dword.js'

export class TSignedDword extends TDWord {

  constructor () {
    super(...arguments)
    this.size = 4
  }

  get value () { return _vm.ld_s(this.addr) }

  set value (value) {
    _vm.st_s(this.addr, value)
  }

}
