import { mixin } from '../../globals.js'
import { Overlays } from './overlays.js'
import { Palette } from './palette.js'
import { Text } from './text.js'
import { Sprite } from './sprite.js'


PIXI.Point.prototype.distance = target => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y))
}


export class Video {

  vid_init (width, height, scale, offset, margins) {
    this.force_update = false
    this.force_flip = false

    this.width = width || 378
    this.height = height || 264
    this.scale = scale || 3
    this.offset = offset || new PIXI.Point(0, 0)
    this.margins = margins || new PIXI.Point(32, 32)

    this.screen_size = this.width * this.height

    this.screen_addr = _vm.alloc(this.screen_size)

    this.stage = new PIXI.Container()

    this.renderer = new PIXI.autoDetectRenderer(this.width * this.scale + this.margins.x, this.height * this.scale + this.margins.y, null, { })
    this.renderer.view.style.position = 'absolute'
    this.renderer.view.style.top = Math.trunc(this.margins.x / 2) + 'px'
    this.renderer.view.style.left = Math.trunc(this.margins.y / 2) + 'px'

    window.addEventListener('resize', this.vid_resize.bind(this))

    document.body.appendChild(this.renderer.view)

    this.pal_init()
    this.pal_reset()

    this.spr_init()
    this.spr_reset()

    this.txt_init()
    this.txt_reset()

    this.overlays_init()
    this.overlays_reset()

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
    let mem = _vm.mem_buffer
    let c
    for (let si = this.screen_addr, pi = 0; si < end; si++, pi += 4) {
      c = this.palette_rgba(mem[si])
      pixels.set([c >> 24 & 0xFF, c >> 16 & 0xFF, c >> 8 & 0xFF, c & 0xFF], pi)
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
    let mem = _vm.mem_buffer
    if (c !== undefined && mem[pi] !== c) {
      mem[pi] = c
    }
    return mem[pi]
  }

  pixel_to_index (x, y) { return y * this.width + x }

  index_to_pixel (i) {
    let y = Math.min(Math.trunc(i / this.width), this.height - 1)
    let x = i - y
    return { x, y }
  }

  split_rgba (rgba) { return { r: this.red(rgba), g: this.green(rgba), b: this.blue(rgba), a: this.alpha(rgba) } }

  red (rgba) { return rgba >> 24 & 0xFF }

  green (rgba) { return rgba >> 16 & 0xFF }

  blue (rgba) { return rgba >> 8 & 0xFF }

  alpha (rgba) { return rgba & 0xFF }

  rgba_to_num (r, g, b, a) { return r << 24 | g << 16 | b << 8 | a }

  rgba_to_mem (buffer, i, r, g, b, a) {
    if (r && !g) {
      let rgb = this.split_rgba(r)
      r = rgb.r
      g = rgb.g
      b = rgb.b
      a = rgb.a
    }
    if (buffer instanceof Buffer) {
      buffer[i] = r
      buffer[i + 1] = g
      buffer[i + 2] = b
      buffer[i + 3] = a
    }
    else {
      buffer.set([r, g, b, a], i)
    }
  }

  scroll (x, y) {
    _vm.mem_buffer.copy(_vm.mem_buffer, this.screen_addr, this.screen_addr + y * this.width, (this.height - y) * this.width)
    this.vid_refresh()
  }

}

mixin(Video.prototype, Overlays.prototype, Palette.prototype, Text.prototype, Sprite.prototype)
