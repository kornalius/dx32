import _ from 'lodash'


export class Union {

  union_init () {
  }

  union_make (d) {
    let find_size = dd => {
      let size = 0
      for (let k in dd) {
        let value = dd[k]
        size += _.isObject(value) ? find_size(value) : 8
      }
      return size
    }

    let addr = _vm.alloc(find_size(d))
    let a = addr

    let gen = dd => {
      for (let k in dd) {
        let value = dd[k]
        if (_.isObject(value)) {
          gen(value)
        }
        else {
          let key = _vm.alloc_str(k)
          if (_.isString(value)) {
            value = _vm.alloc_str(value)
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

  union_mix (addr, ...d) {
  }

}
