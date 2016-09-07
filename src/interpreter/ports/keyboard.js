import { Port } from '../port.js'


export class KeyboardPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'kbd'

    this.keys = {}
    this.shift = false
    this.alt = false
    this.ctrl = false
    this.joystick = 0

    this.keys_size = 255
    this.info_size = 255 + 5
    this.info = _vm.alloc(this.info_size)

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))

    this.publics = {
      pressed: this.pressed,
    }
  }

  reset () {
    super.reset()
    _vm.fill(this.info, 0, this.info_size)
  }

  shut () {
    super.shut()
  }

  update_info (code) {
    let sz = this.keys_size

    _vm.stb(this.info + code, this.keys[code])

    _vm.stb(this.info + sz + 1, this.shift)
    _vm.stb(this.info + sz + 2, this.ctrl)
    _vm.stb(this.info + sz + 3, this.alt)
    _vm.stb(this.info + sz + 4, this.joystick)
  }

  onKeydown (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    this.keys[code] = 1

    switch (code) {
      case 16: // Shift
        this.shift = true
        break

      case 17: // Ctrl
        this.ctrl = true
        break

      case 18: // Alt
        this.alt = true
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

    this.update_info()

    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    delete this.keys[code]

    switch (e.keyCode) {
      case 16: // Shift
        this.shift = false
        break

      case 17: // Ctrl
        this.ctrl = false
        break

      case 18: // Alt
        this.alt = false
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

    this.update_info()

    // e.preventDefault()
    e.stopPropagation()
  }

  pressed (which) { return this.keys[which] || false }

}
