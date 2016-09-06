import { Port } from '../port.js'


export class MousePort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'mse'

    this.video = _vm.ports[_vm.port_by_name('vid')]

    let video = this.video
    let renderer = video.renderer
    let margins = video.margins
    let cursor = video.overlays.mouseCursor

    this.size = new PIXI.Point(renderer.width - margins.x / 2 - cursor.sprite.width, renderer.height - margins.y / 2 - cursor.sprite.height)
    this.last_mouse = new PIXI.Point()

    this.stack = _vm.stk_new(null, 1024, true, 'i32')

    let stage = this.video.stage
    if (stage) {
      stage.interactive = true
      stage.on('mousedown', this.onLeftButtonDown.bind(this))
      stage.on('rightdown', this.onRightButtonDown.bind(this))
      stage.on('touchstart', this.onLeftButtonDown.bind(this))
      stage.on('mousemove', this.onMouseMove.bind(this))
      stage.on('mouseup', this.onMouseUp.bind(this))
      stage.on('touchend', this.onMouseUp.bind(this))
      stage.on('mouseupoutside', this.onMouseUp.bind(this))
      stage.on('touchendoutside', this.onMouseUp.bind(this))
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

  onLeftButtonDown () {
    this.stack.push(1)
  }

  onRightButtonDown () {
    this.stack.push(2)
  }

  onMouseMove (e) {
    let video = this.video
    let margins = video.margins
    let cursor = video.overlays.mouseCursor
    let x = Math.trunc(Math.min(this.size.x, Math.max(margins.x / 2, e.data.global.x)) / cursor.sprite.scale.x)
    let y = Math.trunc(Math.min(this.size.y, Math.max(margins.y / 2, e.data.global.y)) / cursor.sprite.scale.y)
    this.stack.push(3, x, y)
    cursor.x = x
    cursor.y = y
  }

  onMouseUp () {
    this.stack.push(4)
  }
}
