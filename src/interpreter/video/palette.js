

export class Palette {

  pal_init (count) {
    this.palette_count = count || 32
    this.palette_size = this.palette_count * 4
  }

  pal_tick (t) {
  }

  pal_reset () {
    this.palette_addr = _vm.mm.alloc(this.palette_size)

    this.palette_rgba(0, 0x000000ff)
    this.palette_rgba(1, 0xffffffff)
    this.palette_rgba(2, 0x120723ff)
    this.palette_rgba(3, 0x080e41ff)
    this.palette_rgba(4, 0x12237aff)
    this.palette_rgba(5, 0x4927a1ff)
    this.palette_rgba(6, 0x7f65d0ff)
    this.palette_rgba(7, 0x60c8d0ff)
    this.palette_rgba(8, 0xaad7dfff)
    this.palette_rgba(9, 0x331a36ff)
    this.palette_rgba(10, 0x993dadff)
    this.palette_rgba(11, 0xdf8085ff)
    this.palette_rgba(12, 0xf2d5e8ff)
    this.palette_rgba(13, 0x152418ff)
    this.palette_rgba(14, 0x12451aff)
    this.palette_rgba(15, 0x50bf50ff)
    this.palette_rgba(16, 0x8fea88ff)
    this.palette_rgba(17, 0xf2efdeff)
    this.palette_rgba(18, 0x28130dff)
    this.palette_rgba(19, 0x5f1500ff)
    this.palette_rgba(20, 0x3f2a00ff)
    this.palette_rgba(21, 0x5e4800ff)
    this.palette_rgba(22, 0x91382dff)
    this.palette_rgba(23, 0x9c6526ff)
    this.palette_rgba(24, 0xbfd367ff)
    this.palette_rgba(25, 0xe2d38eff)
    this.palette_rgba(26, 0x211f35ff)
    this.palette_rgba(27, 0x36324bff)
    this.palette_rgba(28, 0x5a5871ff)
    this.palette_rgba(29, 0x877f97ff)
    this.palette_rgba(30, 0xc1aebdff)
    this.palette_rgba(31, 0xe3d1d6ff)
  }

  pal_shut () {
  }

  palette_rgba (c, r, g, b, a) {
    let pi = this.palette_addr + c * 4
    if (r) {
      if (r && g && b) {
        this.rgba_to_mem(_vm.mem_buffer, pi, r, g, b, a)
      }
      else {
        _vm.mem_buffer.writeUInt32LE(r, pi)
      }
    }
    return _vm.mem_buffer.readUInt32LE(pi)
  }

  rgba_to_palette (r, g, b, a) {
    let rgba = this.rgba_to_num(r, g, b, a)
    for (let c = 0; c < this.palette_count; c++) {
      if (this.palette_rgba(c) === rgba) {
        return c
      }
    }
    return -1
  }

}
