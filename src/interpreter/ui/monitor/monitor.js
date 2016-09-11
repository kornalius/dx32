import { mixin } from '../../../globals.js'
import { Overlays } from './overlays.js'


export class Monitor {

  monitor_init () {
    this.stage = new PIXI.Container()

    this.renderer = new PIXI.autoDetectRenderer(this.vid_width * this.vid_scale + this.vid_margins_x, this.vid_height * this.vid_scale + this.vid_margins_y, null, { })
    this.renderer.view.style.position = 'absolute'
    this.renderer.view.style.top = Math.trunc(this.vid_margins_x / 2) + 'px'
    this.renderer.view.style.left = Math.trunc(this.vid_margins_y / 2) + 'px'

    window.addEventListener('resize', this.monitor_resize.bind(this))

    document.body.appendChild(this.renderer.view)

    this.overlays_init()
    this.overlays_reset()
  }

  monitor_resize () {
    // let ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height)
    // this.stage.scale.x = this.stage.scale.y = ratio
    // this.renderer.monitor_resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio))
    this.renderer.view.style.left = window.innerWidth * 0.5 - this.renderer.width * 0.5 + 'px'
    this.renderer.view.style.top = window.innerHeight * 0.5 - this.renderer.height * 0.5 + 'px'
    if (this.vid_refresh) {
      this.vid_refresh()
    }
  }

  monitor_tick (t) {
    this.overlays_tick(t)
  }

  monitor_reset () {
    this.overlays_reset()
  }

  monitor_shut () {
    this.overlays_shut()
  }

}

mixin(Monitor.prototype, Overlays.prototype)
