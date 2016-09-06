import { Port } from '../port.js'


export class KeyboardPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'kbd'

    this.keys = {}

    this.stack = _vm.stk_new(null, 1024, true, 'i16')

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))

    this.publics = {
      pressed: this.pressed,
    }
  }

  reset () {
    super.reset()
    this.stack.reset()
  }

  shut () {
    super.shut()
    this.stack.shut()
  }

  onKeydown (e) {
    this.stack.push(1, e.which)
    if (!e.repeat) {
      this.keys[e.which] = 0
    }
    this.keys[e.which]++
    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    this.stack.push(2, e.which)
    delete this.keys[e.which]
    // e.preventDefault()
    e.stopPropagation()
  }

  pressed (which) { return this.keys[which] || false }

}
