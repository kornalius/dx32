import _ from 'lodash'


class Struct {

  constructor (vm) {
    this.vm = vm
  }

  make (d) {
    var find_size = (dd) => {
      var size = 0
      for (var k in dd) {
        var value = dd[k]
        size += _.isObject(value) ? find_size(value) : 8
      }
      return size
    }

    var addr = this.vm.mm.alloc(find_size(d))
    var a = addr

    var gen = (dd) => {
      for (var k in dd) {
        var value = dd[k]
        if (_.isObject(value)) {
          gen(value)
        }
        else {
          var key = this.vm.mm.alloc_s(k)
          if (_.isString(value)) {
            value = this.vm.mm.alloc_s(value)
          }
          this.vm.st(a, key)
          this.vm.st(a + 4, value)
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

export default {
  Struct,
}
