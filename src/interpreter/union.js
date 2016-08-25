import _ from 'lodash'


export class Union {

  constructor () {
  }

  make (d) {
    let find_size = (dd) => {
      let size = 0
      for (let k in dd) {
        let value = dd[k]
        size += _.isObject(value) ? find_size(value) : 8
      }
      return size
    }

    let addr = _vm.mm.alloc(find_size(d))
    let a = addr

    let gen = (dd) => {
      for (let k in dd) {
        let value = dd[k]
        if (_.isObject(value)) {
          gen(value)
        }
        else {
          let key = _vm.mm.alloc_s(k)
          if (_.isString(value)) {
            value = _vm.mm.alloc_s(value)
          }
          _vm.st(a, key)
          _vm.st(a + 4, value)
          a += 8
        }
      }
    }

    gen(d)

    return addr
  }

  mix (addr, ...d) {
  }
}
