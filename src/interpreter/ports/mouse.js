import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { mixin } from '../../globals.js'


class MousePort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)

    this.last_mouse = new PIXI.Point()

    this.stk_init(1024, 2)

    var stage = vm.ports[1].stage
    if (stage) {
      stage.interactive = true
      stage.on('mousedown', this.onLeftButtonDown.bind(this))
      stage.on('rightdown', this.onRightButtonDown.bind(this))
      stage.on('touchstart', this.onLeftButtonDown.bind(this))
      stage.on('mousemove', this.onButtonMove.bind(this))
      stage.on('mouseup', this.onButtonUp.bind(this))
      stage.on('touchend', this.onButtonUp.bind(this))
      stage.on('mouseupoutside', this.onButtonUp.bind(this))
      stage.on('touchendoutside', this.onButtonUp.bind(this))
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

  onLeftButtonDown () {
    this.stk_psh(1)
  }

  onRightButtonDown () {
    this.stk_psh(2)
  }

  onButtonMove (e) {
    this.stk_psh(3, e.data.global.x, e.data.global.y)
  }

  onButtonUp () {
    this.stk_psh(4)
  }
}

mixin(MousePort.prototype, Stack.prototype)

export default {
  MousePort,
}
