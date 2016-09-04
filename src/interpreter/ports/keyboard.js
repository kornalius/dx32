import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { mixin } from '../../globals.js'


export class KeyboardPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'kbd'

    this.keys = {}

    this.stk_init(1024, 4, true)

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))

    this.publics = {
      pressed: this.pressed,
    }
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
    this.stk_push(1, e.which)
    if (!e.repeat) {
      this.keys[e.which] = 0
    }
    this.keys[e.which]++
    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    this.stk_push(2, e.which)
    delete this.keys[e.which]
    // e.preventDefault()
    e.stopPropagation()
  }

  pressed (which) { return this.keys[which] || false }

}

mixin(KeyboardPort.prototype, Stack.prototype)
