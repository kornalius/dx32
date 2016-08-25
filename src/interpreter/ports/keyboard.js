import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { mixin } from '../../globals.js'


export class KeyboardPort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)

    this.keys = {}

    this.stk_init(1024, 2)

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))
  }

  reset () {
    super.reset()
    this.stk_reset()
  }

  shut () {
    super.shut()
    this.stk_shut()
  }

  onKeydown (e) {
    this.stk_psh(1, e.which)
    if (!e.repeat) {
      this.keys[e.which] = 0
    }
    this.keys[e.which]++
    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    this.stk_psh(2, e.which)
    delete this.keys[e.which]
    // e.preventDefault()
    e.stopPropagation()
  }

  pressed (which) { return this.keys[which] || false }

}

mixin(KeyboardPort.prototype, Stack.prototype)
