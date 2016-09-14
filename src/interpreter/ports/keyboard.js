import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { Struct } from '../struct.js'


export class KeyboardPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'kbd'

    this.struct_init([
      { name: 'mods', type: 'i8' },
      { name: 'joystick', type: 'i8' },

      { name: 'keys', type: 256 },
    ])

    this.mem_top = this.struct_top
    this.mem_bottom = this.struct_bottom
    this.mem_size = this.mem_bottom - this.mem_top

    this.stk_init()

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))

    this.publics = {
      key: this.key,
      shift: this.shift,
      ctrl: this.ctrl,
      alt: this.alt,
    }
  }

  reset () {
    this.struct_reset()
    this.stk_reset()
    super.reset()
  }

  shut () {
    this.struct_shut()
    this.stk_shut()
    super.shut()
  }

  onKeydown (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    this.keys[code] = 1

    switch (code) {
      case 16: // Shift
        this.mods |= 0x01
        break

      case 17: // Ctrl
        this.mods |= 0x02
        break

      case 18: // Alt
        this.mods |= 0x04
        break

      case 38: // up
        this.joystick |= 0x01
        break

      case 56: // numpad 8
        if (numpad) {
          this.joystick |= 0x01
        }
        break

      case 40: // down
        this.joystick |= 0x02
        break

      case 50: // numpad 2
        if (numpad) {
          this.joystick |= 0x02
        }
        break

      case 37: // left
        this.joystick |= 0x04
        break

      case 52: // numpad 4
        if (numpad) {
          this.joystick |= 0x04
        }
        break

      case 39: // right
        this.joystick |= 0x08
        break

      case 54: // numpad 6
        if (numpad) {
          this.joystick |= 0x08
        }
        break

      case 32: // button 1
        this.joystick |= 0x10
        break
    }

    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    this.keys[code] = 0

    switch (e.keyCode) {
      case 16: // Shift
        this.mods &= ~0x01
        break

      case 17: // Ctrl
        this.mods &= ~0x02
        break

      case 18: // Alt
        this.mods &= ~0x04
        break

      case 38: // up
        this.joystick &= ~0x01
        break

      case 56: // numpad 8
        if (numpad) {
          this.joystick &= ~0x01
        }
        break

      case 40: // down
        this.joystick &= ~0x02
        break

      case 50: // numpad 2
        if (numpad) {
          this.joystick &= ~0x02
        }
        break

      case 37: // left
        this.joystick &= ~0x04
        break

      case 52: // numpad 4
        if (numpad) {
          this.joystick &= ~0x04
        }
        break

      case 39: // right
        this.joystick &= ~0x08
        break

      case 54: // numpad 6
        if (numpad) {
          this.joystick &= ~0x08
        }
        break

      case 32: // button 1
        this.joystick &= ~0x10
        break
    }

    // e.preventDefault()
    e.stopPropagation()
  }

  shift () { return this.mods & 0x01 }

  ctrl () { return this.mods & 0x02 }

  alt () { return this.mods & 0x04 }

  key (which) { return this.keys[which] }

}

mixin(KeyboardPort.prototype, Stack.prototype, Struct.prototype)
