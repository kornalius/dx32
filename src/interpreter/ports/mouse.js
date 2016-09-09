import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { StackBuffer } from '../stackbuffer.js'

export class MousePort extends Port {

  constructor (port_number) {
    super(port_number)

    this.stk_buf_init([
      { name: 'x', type: 'i32' },
      { name: 'y', type: 'i32' },
      { name: 'left_button', type: 'i8' },
      { name: 'middle_button', type: 'i8' },
      { name: 'right_button', type: 'i8' },
    ])

    this.name = 'mse'

    this.video = _vm.ports[_vm.port_by_name('vid')]

    let video = this.video
    let renderer = video.renderer
    let margins = video.margins
    let cursor = video.overlays.mouseCursor

    this.size = new PIXI.Point(renderer.width - margins.x / 2 - cursor.sprite.width, renderer.height - margins.y / 2 - cursor.sprite.height)

    this.x = 0
    this.y = 0
    this.left_button = false
    this.middle_button = false
    this.right_button = false

    this.info_size = 11
    this.info = _vm.alloc()

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
  }

  reset () {
    super.reset()
    _vm.fill(this.info, 0, this.info_size)
  }

  shut () {
    super.shut()
  }

  update_info () {
    let i = _vm.seq_start(this.info)
    _vm.seq_dword(i, this.x)
    _vm.seq_dword(i, this.y)
    _vm.seq_byte(i, this.left_button)
    _vm.seq_byte(i, this.middle_button)
    _vm.seq_byte(i, this.right_button)
    _vm.seq_end(i)
  }

  onMouseDown (e) {
    switch (e.data.originalEvent.button) {
      case 0:
        this.left_button = true
        break

      case 1:
        this.middle_button = true
        break

      case 2:
        this.right_button = true
        break
    }
    this.update_info()
  }

  onMouseMove (e) {
    let margins = this.video.margins
    let cursor = this.video.overlays.mouseCursor
    let x = Math.trunc(Math.min(this.size.x, Math.max(margins.x / 2, e.data.global.x)) / cursor.sprite.scale.x)
    let y = Math.trunc(Math.min(this.size.y, Math.max(margins.y / 2, e.data.global.y)) / cursor.sprite.scale.y)

    this.x = x
    this.y = y

    cursor.x = x
    cursor.y = y

    this.update_info()
  }

  onMouseUp (e) {
    switch (e.data.originalEvent.button) {
      case 0:
        this.left_button = false
        break

      case 1:
        this.middle_button = false
        break

      case 2:
        this.right_button = false
        break
    }

    this.update_info()
  }

}

mixin(MousePort.prototype, StackBuffer.prototype)
