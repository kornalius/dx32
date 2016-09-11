import _ from 'lodash'


export class Overlay {

  constructor (video, width, height) {
    this.video = video
    this.width = width
    this.height = height
    this.last = 0
  }

  create () {
    this.canvas = new PIXI.CanvasBuffer(this.width, this.height)

    this.tex = PIXI.Texture.fromCanvas(this.canvas.canvas, PIXI.SCALE_MODES.NEAREST)
    this.tex.scaleMode = PIXI.SCALE_MODES.NEAREST

    this.sprite = new PIXI.Sprite(this.tex)

    this.context = this.canvas.canvas.getContext('2d', { alpha: true, antialias: false })
  }

  tick (t) {
  }

  reset () {
  }

  shut () {
    if (this.canvas) {
      this.canvas.destroy()
      this.canvas = null
    }
  }

  update () {
    this.video.vid_force_update = true
  }

}


export class ScreenOverlay extends Overlay {

  constructor (video, width, height) {
    super(video, width, height)

    this.create()

    this.sprite.x = this.video.vid_offset_x + this.video.vid_margins_x / 2
    this.sprite.y = this.video.vid_offset_y + this.video.vid_margins_y / 2
  }

}


export class ScanlinesOverlay extends Overlay {

  constructor (video, width, height, gap, alpha) {
    super(video, width, height)

    this.gap = gap || 3
    this.alpha = alpha || 0.35

    this.create()

    let a = this.alpha * 255
    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let sz = this.width * 4
    let idx
    for (let y = 0; y < this.height; y += this.gap) {
      idx = y * sz
      for (let i = idx; i < idx + sz; i += 4) {
        pixels.set([0, 0, 0, a], i)
      }
    }
    this.context.putImageData(data, 0, 0)
  }

}


export class ScanlineOverlay extends Overlay {

  constructor (video, width, height, refresh, alpha, speed) {
    super(video, width, height)

    this.refresh = refresh || 50
    this.speed = speed || 16
    this.alpha = alpha || 0.1

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let sz = this.width * 4
    let len = this.height * sz
    let l = 0
    let h = this.height
    let a = this.alpha * 255
    let aa
    for (let y = 0; y < len; y += sz) {
      aa = l / h * a
      for (let x = y; x < y + sz; x += 4) {
        pixels.set([25, 25, 25, aa], x)
      }
      l++
    }
    this.context.putImageData(data, 0, 0)

    this.sprite.y = -this.sprite.height
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      this.sprite.y += this.speed
      if (this.sprite.y > this.height) {
        this.sprite.y = -this.sprite.height
      }
      this.last = t

      this.update()
    }
  }

}


export class NoisesOverlay extends Overlay {

  constructor (video, width, height, refresh, count, rate, red, green, blue, alpha) {
    super(video, width, height)

    this.refresh = refresh || 250
    this.count = count || 8
    this.rate = rate || 0.85
    this.red = red || 100
    this.green = green || 100
    this.blue = blue || 100
    this.alpha = alpha || 0.15

    this.noises = {}

    let a = this.alpha * 255
    for (let c = 0; c < this.count; c++) {
      let noise = new Overlay(this.video, this.width, this.height)
      noise.create()
      noise.sprite.visible = c === 0

      let data = noise.context.getImageData(0, 0, this.width, this.height)
      let pixels = data.data
      let len = pixels.length
      let r = this.red
      let g = this.green
      let b = this.blue
      let _rate = this.rate
      for (let i = 0; i < len; i += 4) {
        if (Math.random() >= _rate) {
          pixels.set([Math.trunc(Math.random() * r), Math.trunc(Math.random() * g), Math.trunc(Math.random() * b), a], i)
        }
      }
      noise.context.putImageData(data, 0, 0)
      this.noises[c] = noise
      this.video.stage.addChild(noise.sprite)
    }

    this.noiseKeys = _.keys(this.noises)
  }

  shut () {
    super.shut()
    for (let k in this.noises) {
      let noise = this.noises[k]
      noise.shut()
    }
    this.noises = {}
    this.noiseKeys = []
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      for (let k of this.noiseKeys) {
        this.noises[k].sprite.visible = false
      }
      let noise = this.noiseKeys[Math.trunc(Math.random() * this.noiseKeys.length)]
      this.noises[noise].sprite.visible = true
      this.last = t

      this.update()
    }
  }

}


export class RgbOverlay extends Overlay {

  constructor (video, width, height, alpha) {
    super(video, width, height)

    this.alpha = alpha || 0.075

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let len = pixels.length
    let a = this.alpha * 255
    for (let i = 0; i < len; i += 12) {
      pixels.set([100, 100, 100, a], i)
    }
    this.context.putImageData(data, 0, 0)
  }

}


export class CrtOverlay extends Overlay {

  constructor (video, width, height, radius, inside_alpha, outside_alpha) {
    super(video, width, height)

    this.radius = radius || 0.25
    this.inside_alpha = inside_alpha || 0.2
    this.outside_alpha = outside_alpha || 0.15

    this.create()

    this.context.globalCompositeOperation = 'darker'
    let gradient = this.context.createRadialGradient(this.width / 2, this.height / 2, this.height / 2, this.width / 2, this.height / 2, this.height / this.radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, ' + this.inside_alpha + ')')
    gradient.addColorStop(1, 'rgba(0, 0, 0, ' + this.outside_alpha + ')')
    this.context.fillStyle = gradient
    this.context.fillRect(0, 0, this.width, this.height)
    this.context.globalCompositeOperation = 'source-over'
  }

}


export class TextCursorOverlay extends Overlay {

  constructor (video, width, height, refresh) {
    super(video, width, height)

    this.refresh = refresh || 500
    this.x = 1
    this.y = 1

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let len = pixels.length
    let c = this.video.palette_rgba(1)
    for (let i = 0; i < len; i += 4) {
      pixels.set([c >> 24 & 0xFF, c >> 16 & 0xFF, c >> 8 & 0xFF, c & 0xFF], i)
    }

    this.context.putImageData(data, 0, 0)
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      this.sprite.visible = !this.sprite.visible
      this.last = t

      this.update()
    }
  }

  update () {
    this.sprite.x = (this.x - 1) * this.sprite.width + this.video.vid_offset_x + this.video.txt_offset_x + this.video.vid_margins_x / 2
    this.sprite.y = (this.y - 1) * this.sprite.height + this.video.vid_offset_y + this.video.txt_offset_y + this.video.vid_margins_y / 2
    super.update()
  }

}


export class MouseCursorOverlay extends Overlay {

  constructor (video, width, height, refresh, offset) {
    super(video, width, height)

    this.refresh = refresh || 5
    this.offset_x = offset ? offset.x : 0
    this.offset_y = offset ? offset.y : 0
    this.x = 0
    this.y = 0

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let len = pixels.length
    // let c = this.video.palette_rgba(1)
    for (let i = 0; i < len; i += 4) {
      pixels.set([200, 100, 50, 200], i)
    }

    this.context.putImageData(data, 0, 0)
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      this.last = t

      this.update()
    }
  }

  update () {
    this.sprite.x = (this.x + this.offset_x) * this.sprite.scale.x + this.video.vid_offset_x
    this.sprite.y = (this.y + this.offset_y) * this.sprite.scale.y + this.video.vid_offset_y
    super.update()
  }

}


export class Overlays {

  overlays_init () {
    let width = this.renderer.width
    let height = this.renderer.height
    let scale = this.vid_scale
    let margins_x = this.vid_margins_x
    let margins_y = this.vid_margins_y

    this.overlays = {}

    this.overlays.screen = new ScreenOverlay(this, this.vid_width, this.vid_height)
    this.overlays.screen.sprite.scale = new PIXI.Point(scale, scale)
    this.stage.addChild(this.overlays.screen.sprite)

    this.overlays.textCursor = new TextCursorOverlay(this, this.chr_width, this.chr_height)
    this.overlays.textCursor.sprite.scale = new PIXI.Point(scale, scale)
    this.stage.addChild(this.overlays.textCursor.sprite)

    this.overlays.mouseCursor = new MouseCursorOverlay(this, this.spr_width, this.spr_height)
    this.overlays.mouseCursor.sprite.scale = new PIXI.Point(scale, scale)
    this.stage.addChild(this.overlays.mouseCursor.sprite)

    this.overlays.scanlines = new ScanlinesOverlay(this, width, height)
    this.stage.addChild(this.overlays.scanlines.sprite)

    this.overlays.scanline = new ScanlineOverlay(this, width, height)
    this.stage.addChild(this.overlays.scanline.sprite)

    this.overlays.rgb = new RgbOverlay(this, width, height)
    this.stage.addChild(this.overlays.rgb.sprite)

    this.overlays.noises = new NoisesOverlay(this, width, height)

    this.overlays.crt = new CrtOverlay(this, width, height)
    this.stage.addChild(this.overlays.crt.sprite)

    let tex = PIXI.Texture.fromImage(require('file?name=[path]/[name].[ext]!../../../../imgs/crt.png'))
    this.overlays.monitor = new PIXI.Sprite(tex)
    this.overlays.monitor.width = width + margins_x
    this.overlays.monitor.height = height + margins_y
    this.overlays.monitor.x = margins_x / -2
    this.overlays.monitor.y = margins_y / -2
    this.stage.addChild(this.overlays.monitor)
  }

  overlays_tick (t) {
    this.overlays.screen.tick(t)
    this.overlays.scanlines.tick(t)
    this.overlays.scanline.tick(t)
    this.overlays.rgb.tick(t)
    this.overlays.noises.tick(t)
    this.overlays.crt.tick(t)
    this.overlays.textCursor.tick(t)
    this.overlays.mouseCursor.tick(t)
  }

  overlays_reset () {
    this.overlays.screen.reset()
    this.overlays.scanlines.reset()
    this.overlays.scanline.reset()
    this.overlays.rgb.reset()
    this.overlays.noises.reset()
    this.overlays.crt.reset()
    this.overlays.textCursor.reset()
    this.overlays.mouseCursor.reset()
  }

  overlays_shut () {
    for (let k in this.overlays) {
      let o = this.overlays[k].canvas
      o.shut()
    }
  }

}
