import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { Stack } from '../stack.js'
import { Struct } from '../struct.js'


export class MousePort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'mse'

    this.struct_init([
      { name: 'x', type: 'i32' },
      { name: 'y', type: 'i32' },
      { name: 'btns', type: 'i8' },
    ])

    this.mem_top = this.struct_top
    this.mem_bottom = this.struct_bottom
    this.mem_size = this.mem_bottom - this.mem_top

    this.stk_init()

    this.video = _vm.ports[_vm.port_by_name('vid')]

    let video = this.video
    let renderer = video.renderer
    let margins_x = video.vid_margins_x
    let margins_y = video.vid_margins_y
    let cursor = video.overlays.mouseCursor

    this.size = new PIXI.Point(renderer.width - margins_x / 2 - cursor.sprite.width, renderer.height - margins_y / 2 - cursor.sprite.height)

    let stage = this.video.stage
    if (stage) {
      stage.interactive = true

      stage.on('mousedown', this.onMouseDown.bind(this))
      stage.on('rightdown', this.onMouseDown.bind(this))
      stage.on('touchstart', this.onMouseDown.bind(this))

      stage.on('mousemove', this.onMouseMove.bind(this))

      stage.on('mouseup', this.onMouseUp.bind(this))
      stage.on('touchend', this.onMouseUp.bind(this))
      stage.on('mouseupoutside', this.onMouseUp.bind(this))
      stage.on('touchendoutside', this.onMouseUp.bind(this))
    }

    this.publics = {
      x: this.pos_x,
      y: this.pos_y,
      left: this.left,
      middle: this.middle,
      right: this.right,
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

  onMouseDown (e) {
    switch (e.data.originalEvent.button) {
      case 0: // left
        this.btns |= 0x01
        break

      case 1: // middle
        this.btns |= 0x02
        break

      case 2: // right
        this.btns |= 0x04
        break
    }
  }

  onMouseUp (e) {
    switch (e.data.originalEvent.button) {
      case 0: // left
        this.btns &= ~0x01
        break

      case 1: // middle
        this.btns &= ~0x02
        break

      case 2: // right
        this.btns &= ~0x04
        break
    }
  }

  onMouseMove (e) {
    let margins_x = this.video.vid_margins_x
    let margins_y = this.video.vid_margins_y
    let cursor = this.video.overlays.mouseCursor
    let x = Math.trunc(Math.min(this.size.x, Math.max(margins_x / 2, e.data.global.x)) / cursor.sprite.scale.x)
    let y = Math.trunc(Math.min(this.size.y, Math.max(margins_y / 2, e.data.global.y)) / cursor.sprite.scale.y)

    this.x = x
    this.y = y

    cursor.x = x
    cursor.y = y

    this.video.vid_refresh(false)
  }

  pos_x () { return this.x }

  pos_y () { return this.y }

  left () { return this.btns & 0x01 }

  middle () { return this.btns & 0x02 }

  right () { return this.btns & 0x04 }
}

mixin(MousePort.prototype, Stack.prototype, Struct.prototype)
