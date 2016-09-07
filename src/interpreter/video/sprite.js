

export class Sprite {

  spr_init (count, width, height) {
    this.sprite_count = Math.min(16, count || 16)
    this.sprite_width = Math.min(16, width || 16)
    this.sprite_height = Math.min(16, height || 16)

    this.sprite_size = this.sprite_width * this.sprite_height
    this.sprites_size = this.sprite_count * this.sprite_size

    this.spr_reset()
  }

  spr_tick (t) {
    if (this.force_sprites) {
      this.spr_draw()
      this.force_sprites = false
    }
  }

  spr_reset () {
    this.force_sprites = false
    this.sprites = []
    this.sprites_addr = _vm.alloc(this.sprites_size)
  }

  spr_shut () {
    this.sprites = []
  }

  spr_refresh (flip = true) {
    this.vid_refresh(flip)
    this.force_sprites = true
  }

  spr_clear () {
    _vm.fill(this.sprites_addr, 0, this.sprites_size)
    this.sprites = {}
    this.spr_refresh()
  }

  spr_find (name) {
    for (let s of this.sprites) {
      if (s.name === name) {
        return s
      }
    }
    return null
  }

  spr_add (name, sprite, x, y, z) {
    this.sprites.push({ name, sprite, x, y, z, index: Number.MAX_VALUE })
  }

  spr_del (name) {
    let s = this.spr_find(name)
    if (s) {
      this.sprites.splice(s.index, 1)
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
    let sw = this.sprite_width
    let sh = this.sprite_height
    let sl = this.sprites
    let ss = this.sprite_size

    for (let s of _.sortBy(this.sprites, 'z')) {
      let ptr = sl + s.sprite * ss
      for (let by = 0; by < sh; by++) {
        let pi = (s.y + by) * this.width + s.x
        for (let bx = 0; bx < sw; bx++) {
          this.pixel(pi++, _vm.mem_buffer[ptr++])
        }
      }
    }
  }

}
