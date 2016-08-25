import _ from 'lodash'


export class Overlay {

  constructor (video, width, height, scale) {
    this.video = video
    this.width = width
    this.height = height
    this.scale = scale || 1.0
    this.last = 0
  }

  create () {
    this.canvas = new PIXI.CanvasBuffer(this.width, this.height)

    this.tex = PIXI.Texture.fromCanvas(this.canvas.canvas, PIXI.SCALE_MODES.NEAREST)
    this.tex.scaleMode = PIXI.SCALE_MODES.NEAREST

    this.sprite = new PIXI.Sprite(this.tex)
    this.sprite.scale.x = this.sprite.scale.y = this.scale

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
    this.video.force_update = true
  }

}


export class ScreenOverlay extends Overlay {

  constructor (video, width, height, scale) {
    super(video, width, height, scale)

    this.create()

    this.sprite.x = this.video.offset.x
    this.sprite.y = this.video.offset.y
  }

}


export class ScanlinesOverlay extends Overlay {

  constructor (video, width, height, scale, gap, alpha) {
    super(video, width, height, scale)

    this.gap = gap || 3
    this.alpha = alpha || 0.35

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let sz = this.width * 4
    for (let y = 0; y < this.height; y += this.gap) {
      let idx = y * sz
      for (let i = idx; i < idx + sz; i += 4) {
        pixels[i] = 0
        pixels[i + 1] = 0
        pixels[i + 2] = 0
        pixels[i + 3] = 255 * this.alpha
      }
    }
    this.context.putImageData(data, 0, 0)
  }

}


export class ScanlineOverlay extends Overlay {

  constructor (video, width, height, scale, refresh, alpha, speed) {
    super(video, width, height, scale)

    this.refresh = refresh || 50
    this.speed = speed || 16
    this.alpha = alpha || 0.1

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let sz = this.width * 4
    let l = 0
    let h = this.height
    let a = this.alpha * 255
    for (let y = 0; y < this.height * sz; y += sz) {
      for (let i = y; i < y + sz; i += 4) {
        pixels[i] = 25
        pixels[i + 1] = 25
        pixels[i + 2] = 25
        pixels[i + 3] = l / h * a
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

  constructor (video, width, height, scale, refresh, count, rate, red, green, blue, alpha) {
    super(video, width, height, scale)

    this.refresh = refresh || 250
    this.count = count || 8
    this.rate = rate || 0.85
    this.red = red || 100
    this.green = green || 100
    this.blue = blue || 100
    this.alpha = alpha || 0.15

    this.noises = {}

    this.create()

    let a = this.alpha * 255
    for (let c = 0; c < this.count; c++) {
      let noise = new Overlay(this.video, this.width, this.height, this.scale)
      noise.create()
      noise.visible = c === 0

      let data = noise.context.getImageData(0, 0, this.width, this.height)
      let pixels = data.data
      let len = pixels.length
      let r = this.red
      let g = this.green
      let b = this.blue
      for (let i = 0; i < len; i += 4) {
        if (Math.random() >= rate) {
          pixels[i] = Math.trunc(Math.random() * r)
          pixels[i + 1] = Math.trunc(Math.random() * g)
          pixels[i + 2] = Math.trunc(Math.random() * b)
          pixels[i + 3] = a
        }
      }
      noise.context.putImageData(data, 0, 0)
      this.noises[c] = noise
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
      let noise = this.noiseKeys[Math.trunc(Math.random() * this.noiseKeys.length)]
      for (let k in this.noises) {
        this.noises[k].sprite.visible = false
      }
      this.noises[noise].sprite.visible = true
      this.last = t

      this.update()
    }
  }


}


export class RgbOverlay extends Overlay {

  constructor (video, width, height, scale, alpha) {
    super(video, width, height, scale)

    this.alpha = alpha || 0.075

    this.create()

    let data = this.context.getImageData(0, 0, this.width, this.height)
    let pixels = data.data
    let len = pixels.length
    for (let i = 0; i < len; i += 16) {
      pixels[i] = 100
      pixels[i + 1] = 100
      pixels[i + 2] = 100
      pixels[i + 3] = 255 * this.alpha
    }
    this.context.putImageData(data, 0, 0)
  }

}


export class CrtOverlay extends Overlay {

  constructor (video, width, height, scale, radius, inside_alpha, outside_alpha) {
    super(video, width, height, scale)

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

  constructor (video, width, height, scale, refresh, offset) {
    super(video, width, height, scale)

    this.refresh = refresh || 500
    this.offset = offset || { x: 0, y: 0 }

    this.create()
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      this.sprite.visible = !this.sprite.visible
      this.last = t

      this.update()
    }
  }

  update () {
    this.sprite.x = (this.x - 1) * this.sprite.width + this.offset.x
    this.sprite.y = (this.y - 1) * this.sprite.height + this.offset.y
    super.update()
  }

}


export class MouseCursorOverlay extends Overlay {

  constructor (video, width, height, scale, refresh) {
    super(video, width, height, scale)

    this.refresh = refresh || 50

    this.create()
  }

  tick (t) {
    if (t - this.last >= this.refresh) {
      this.sprite.x = 0
      this.sprite.y = 0
      this.last = t

      this.update()
    }
  }

}


export class Overlays {

  overlays_init () {
    let width = this.renderer.width
    let height = this.renderer.height
    let scale = this.renderer.scale

    this.overlays = {}

    this.overlays.screen = new ScreenOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.screen.sprite)

    this.overlays.scanlines = new ScanlinesOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.scanlines.sprite)

    this.overlays.scanline = new ScanlineOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.scanline.sprite)

    this.overlays.rgb = new RgbOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.rgb.sprite)

    this.overlays.noises = new NoisesOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.noises.sprite)

    this.overlays.crt = new CrtOverlay(this, width, height, scale)
    this.stage.addChild(this.overlays.crt.sprite)

    this.overlays.text = new TextCursorOverlay(this, this.charWidth * scale, this.charHeight * scale, scale)
    this.stage.addChild(this.overlays.text.sprite)

    this.overlays.mouse = new MouseCursorOverlay(this, this.spriteWidth * scale, this.spriteHeight * scale, scale)
    this.stage.addChild(this.overlays.mouse.sprite)

    let tex = PIXI.Texture.fromImage(require('file?name=[path]/[name].[ext]!../../../imgs/crt.png'))
    this.overlays.monitor = new PIXI.Sprite(tex)
    this.overlays.monitor.width = this.renderer.width
    this.overlays.monitor.height = this.renderer.height
    this.stage.addChild(this.overlays.monitor)
  }

  overlays_tick (t) {
    this.overlays.screen.tick(t)
    this.overlays.scanlines.tick(t)
    this.overlays.scanline.tick(t)
    this.overlays.rgb.tick(t)
    this.overlays.noises.tick(t)
    this.overlays.crt.tick(t)
    this.overlays.text.tick(t)
    this.overlays.mouse.tick(t)
  }

  overlays_reset () {
    this.overlays.screen.reset()
    this.overlays.scanlines.reset()
    this.overlays.scanline.reset()
    this.overlays.rgb.reset()
    this.overlays.noises.reset()
    this.overlays.crt.reset()
    this.overlays.text.reset()
    this.overlays.mouse.reset()
  }

  overlays_shut () {
    for (let k in this.overlays) {
      let o = this.overlays[k].canvas
      o.shut()
    }
  }

}
