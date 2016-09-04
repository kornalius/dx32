import _ from 'lodash'
import { data_type_size, defaults } from '../globals.js'


export class Dict {

  dict_init () {
  }

  dict_make (d) {
    let dsz = data_type_size(defaults.type)

    let find_size = dd => {
      let size = 0
      for (let k in dd) {
        let value = dd[k]
        size += _.isObject(value) ? find_size(value) : dsz
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
          a += dsz
        }
      }
    }

    gen(d)

    return addr
  }

  dict_mix (addr, ...d) {
  }

}
