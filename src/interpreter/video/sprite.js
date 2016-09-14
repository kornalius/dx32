

export class Sprite {

  spr_init (count, width, height) {
    this.spr_list = []

    this.spr_count = Math.min(16, count || 16)
    this.spr_width = Math.min(16, width || 16)
    this.spr_height = Math.min(16, height || 16)
    this.spr_size = this.spr_width * this.spr_height
  }

  spr_tick (t) {
    if (this.spr_force_update) {
      this.spr_draw()
      this.spr_force_update = false
    }
  }

  spr_reset () {
    this.spr_top = this._sprites.mem_top
    this.spr_bottom = this._sprites.mem_bottom

    this.spr_array = new Uint8Array(_vm.mem_buffer, this.spr_top, this.spr_size)

    this.spr_clear()
  }

  spr_shut () {
  }

  spr_refresh (flip = true) {
    this.vid_refresh(flip)
    this.spr_force_update = true
  }

  spr_clear () {
    this.spr_array.fill(0)
    this.spr_list = []
    this.spr_refresh()
  }

  spr_find (name) {
    for (let s of this.spr_list) {
      if (s.name === name) {
        return s
      }
    }
    return null
  }

  spr_add (name, frame, x, y, z) {
    this.spr_list.push({ name, frame, x, y, z, index: Number.MAX_VALUE })
  }

  spr_del (name) {
    let s = this.spr_find(name)
    if (s) {
      this.spr_list.splice(s.index, 1)
    }
  }

  spr_move (name, x, y, z) {
    let s = this.spr_find(name)
    if (s) {
      s.x = x
      s.y = y
      if (z) {
        s.z = z
      }
      this.spr_refresh()
    }
  }

  spr_move_by (name, x, y) {
    let s = this.spr_find(name)
    if (s) {
      s.x = x
      s.y = y
      this.spr_refresh()
    }
  }

  spr_draw () {
    let sw = this.spr_width
    let sh = this.spr_height
    let sl = this.spr_list
    let ss = this.spr_size

    let mem = this.spr_array

    for (let s of _.sortBy(this.spr_list, 'z')) {
      let ptr = sl + s.frame * ss
      for (let by = 0; by < sh; by++) {
        let pi = (s.y + by) * sw + s.x
        for (let bx = 0; bx < sw; bx++) {
          this.pixel(pi++, mem[ptr++])
        }
      }
    }
  }

}
