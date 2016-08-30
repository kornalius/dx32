import { TByte } from './byte.js'

export class TSignedByte extends TByte {

  constructor () {
    super(...arguments)
    this.size = 1
  }

  get value () { return _vm.ldb_s(this.addr) }

  set value (value) {
    _vm.stb_s(this.addr, value)
  }

}
