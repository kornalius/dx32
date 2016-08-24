import { _ } from 'lodash'
import { Overlays } from './overlays.js'
import { Video } from './video.js'
import { Sound } from '../sound.js'
import { Palette } from './palette.js'
import { Text } from './text.js'
import { Sprite } from './sprite.js'


class Video {

  vid_init (width, height, scale, offset) {
    this.force_update = false
    this.force_flip = false

    this.width = width || 378
    this.height = height || 264
    this.scale = scale || 3
    this.offset = offset || new PIXI.Point(16, 16)

    this.screen_size = this.width * this.height

    this.screen_addr = _vm.mm.alloc(this.screen_size)

    this.stage = new PIXI.Container()

    this.renderer = new PIXI.autoDetectRenderer(this.width * this.scale + this.offset.x * 2, this.height * this.scale + this.offset.y * 2, null, { })
    this.renderer.view.style.position = 'absolute'
    this.renderer.view.style.top = '0px'
    this.renderer.view.style.left = '0px'

    window.addEventListener('resize', this.vid_resize.bind(this))

    document.body.appendChild(this.renderer.view)

    this.overlays_init()
    this.pal_init()
    this.spr_init()
    this.txt_init()

    this.vid_resize()

    this.vid_clear()
  }

  vid_tick (t) {
    this.overlays_tick(t)

    if (this.force_update) {
      this.force_update = false

      this.pal_tick(t)
      this.txt_tick(t)
      this.spr_tick(t)

      if (this.force_flip) {
        this.vid_flip()
        this.force_flip = false
      }

      this.renderer.render(this.stage)
    }
  }

  vid_reset () {
    this.overlays_reset()
    this.pal_reset()
    this.txt_reset()
    this.spr_reset()
    this.vid_clear()
  }

  vid_shut () {
    this.pal_shut()
    this.txt_shut()
    this.spr_shut()
    this.overlays_shut()

    this.stage.destroy()
    this.stage = null

    this.renderer.destroy()
    this.renderer = null
  }

  vid_refresh (flip = true) {
    this.force_update = true
    this.force_flip = flip
  }

  vid_clear () {
    _vm.fill(this.screen_addr, 0, this.screen_size)
    this.vid_refresh()
  }

  vid_flip () {
    let screenOverlay = this.overlays.screen
    let data = screenOverlay.context.getImageData(0, 0, screenOverlay.width, screenOverlay.height)
    let pixels = data.data

    let end = this.screen_addr + this.screen_size
    for (let si = this.screen_addr, pi = 0; si < end; si++, pi += 4) {
      this.rgba_to_mem(pixels, pi, _vm.mem.readUInt32LE(this.palette + _vm.mem[si] * 4))
    }

    screenOverlay.context.putImageData(data, 0, 0)
  }

  vid_resize () {
    // let ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height)
    // this.stage.scale.x = this.stage.scale.y = ratio
    // this.renderer.vid_resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio))
    this.renderer.view.style.left = window.innerWidth * 0.5 - this.renderer.width * 0.5 + 'px'
    this.renderer.view.style.top = window.innerHeight * 0.5 - this.renderer.height * 0.5 + 'px'
    this.vid_refresh()
  }

  pixel (i, c) {
    let pi = this.screen_addr + i
    if (c !== undefined && _vm.mem[pi] !== c) {
      _vm.mem[pi] = c
    }
    return _vm.mem[pi]
  }

  pixel_to_index (x, y) { return y * this.width + x }

  index_to_pixel (i) {
    let y = Math.trunc(i / this.width)
    let x = i - y
    return { x, y }
  }

  split_rgba (rgba) { return { r: rgba >> 24 & 0xFF, g: rgba >> 16 & 0xFF, b: rgba >> 8 & 0xFF, a: rgba >> 0xFF } }

  red (rgba) { return rgba >> 24 & 0xFF }

  green (rgba) { return rgba >> 16 & 0xFF }

  blue (rgba) { return rgba >> 8 & 0xFF }

  alpha (rgba) { return rgba >> 0xFF }

  rgba_to_num (r, g, b, a) { return r << 24 | g << 16 | b << 8 | a }

  rgba_to_mem (mem, i, r, g, b, a) {
    if (r && !g) {
      g = r >> 16 & 0xFF
      b = r >> 8 & 0xFF
      a = r & 0xFF
      r = r >> 24 & 0xFF
    }
    mem[i] = r
    mem[i + 1] = g
    mem[i + 2] = b
    mem[i + 3] = a
  }

  scroll (x, y) {
    _vm.mem.copy(_vm.mem, this.screen_addr, this.screen_addr + y * this.width, (this.height - y) * this.width)
    this.vid_refresh()
  }

}

mixin(Video.prototype, Overlays.prototype, Palette.prototype, Text.prototype, Sprite.prototype)

export default {
  Video,
}
