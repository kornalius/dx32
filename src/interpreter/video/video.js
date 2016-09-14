import { mixin } from '../../globals.js'
import { Palette } from './palette.js'
import { Text } from './text.js'
import { Sprite } from './sprite.js'
import { Monitor } from '../ui/monitor/monitor.js'
import { Struct } from '../struct.js'


PIXI.Point.prototype.distance = target => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y))
}


export class Video {

  vid_init (width, height, scale, offset, margins) {
    this.vid_width = width || 378
    this.vid_height = height || 264
    this.vid_size = this.vid_width * this.vid_height
    this.vid_scale = scale || 3
    this.vid_offset_x = offset ? offset.x : 0
    this.vid_offset_y = offset ? offset.y : 0
    this.vid_margins_x = margins ? margins.x : 32
    this.vid_margins_y = margins ? margins.y : 32

    this.pal_init()
    this.spr_init()
    this.txt_init()

    this.struct_init([
      { name: 'vid_force_update', type: 'i8' },
      { name: 'vid_force_flip', type: 'i8' },

      { name: 'vid_top', type: 'i32' },
      { name: 'vid_bottom', type: 'i32' },
      { name: 'vid_size', type: 'i32', value: this.vid_size },
      { name: 'vid_width', type: 'i16', value: this.vid_width },
      { name: 'vid_height', type: 'i16', value: this.vid_height },
      { name: 'vid_scale', type: 'i8', value: this.vid_scale || 3 },
      { name: 'vid_offset_x', type: 'i8', value: this.vid_offset_x },
      { name: 'vid_offset_y', type: 'i8', value: this.vid_offset_y },
      { name: 'vid_margins_x', type: 'i8', value: this.vid_margins_x },
      { name: 'vid_margins_y', type: 'i8', value: this.vid_margins_y },

      { name: 'pal_top', type: 'i32' },
      { name: 'pal_bottom', type: 'i32' },
      { name: 'pal_size', type: 'i16', value: this.pal_size },
      { name: 'pal_count', type: 'i16', value: this.pal_count },

      { name: 'spr_force_update', type: 'i8' },
      { name: 'spr_top', type: 'i32' },
      { name: 'spr_bottom', type: 'i32' },
      { name: 'spr_size', type: 'i16', value: this.spr_size },
      { name: 'spr_width', type: 'i8', value: this.spr_width },
      { name: 'spr_height', type: 'i8', value: this.spr_height },

      { name: 'chr_count', type: 'i16', value: this.chr_count },
      { name: 'chr_width', type: 'i8', value: this.chr_width },
      { name: 'chr_height', type: 'i8', value: this.chr_height },
      { name: 'chr_offset_x', type: 'i8', value: this.chr_offset_x },
      { name: 'chr_offset_y', type: 'i8', value: this.chr_offset_y },
      { name: 'chr_size', type: 'i16', value: this.chr_size },

      { name: 'fnt_top', type: 'i32' },
      { name: 'fnt_bottom', type: 'i32' },
      { name: 'fnt_size', type: 'i16', value: this.fnt_size },

      { name: 'txt_force_update', type: 'i8' },
      { name: 'txt_top', type: 'i32' },
      { name: 'txt_bottom', type: 'i32' },
      { name: 'txt_width', type: 'i8', value: this.txt_width },
      { name: 'txt_height', type: 'i8', value: this.txt_height },
      { name: 'txt_size', type: 'i16', value: this.txt_size },

      { name: 'palette', type: this.pal_size },
      { name: 'sprites', type: this.spr_size },
      { name: 'fonts', type: this.fnt_size },
      { name: 'text', type: this.txt_size },
      { name: 'pixels', type: this.vid_size },
    ])

    this.vid_top = this._pixels.mem_top
    this.vid_bottom = this.vid_top + this.vid_size - 1

    this.vid_array = new Uint8Array(_vm.mem_buffer, this.vid_top, this.vid_size)

    this.pal_reset()
    this.spr_reset()
    this.txt_reset()

    this.txt_load_fnt()

    this.monitor_init()
    this.monitor_resize()

    this.vid_clear()
  }

  vid_tick (t) {
    this.monitor_tick(t)

    if (this.vid_force_update) {
      this.vid_force_update = false

      this.pal_tick(t)
      this.txt_tick(t)
      this.spr_tick(t)

      if (this.vid_force_flip) {
        this.vid_flip()
      }

      this.renderer.render(this.stage)
    }
  }

  vid_reset () {
    this.monitor_reset()
    this.pal_reset()
    this.txt_reset()
    this.spr_reset()
    this.vid_clear()
  }

  vid_shut () {
    this.pal_shut()
    this.txt_shut()
    this.spr_shut()
    this.monitor_shut()

    this.struct_shut()

    this.stage.destroy()
    this.stage = null

    this.renderer.destroy()
    this.renderer = null
  }

  vid_refresh (flip = true) {
    this.vid_force_update = true
    if (!this.vid_force_flip) {
      this.vid_force_flip = flip
    }
  }

  vid_clear () {
    this.vid_array.fill(0)
    this.vid_refresh()
  }

  vid_flip () {
    let screenOverlay = this.overlays.screen
    let data = screenOverlay.context.getImageData(0, 0, screenOverlay.width, screenOverlay.height)
    let pixels = new Uint32Array(data.data.buffer)

    let mem = this.vid_array
    for (let i = 0; i < this.vid_size; i++) {
      pixels[i] = this.palette_rgba(mem[i])
    }

    screenOverlay.context.putImageData(data, 0, 0)

    this.vid_force_flip = false
  }

  pixel (i, c) {
    let mem = this.vid_array
    if (c !== undefined && mem[i] !== c) {
      mem[i] = c
    }
    return mem[i]
  }

  pixel_to_index (x, y) { return y * this.vid_width + x }

  index_to_pixel (i) {
    let y = Math.min(Math.trunc(i / this.vid_width), this.vid_height - 1)
    let x = i - y
    return { x, y }
  }

  scroll (x, y) {
    let lw = y * this.vid_width
    let s = lw
    let e = this.vid_size - lw
    this.vid_array.copy(s, 0, e - s)
    this.vid_refresh()
  }

}

mixin(Video.prototype, Struct.prototype, Monitor.prototype, Palette.prototype, Text.prototype, Sprite.prototype)
