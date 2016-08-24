import { _ } from 'lodash'


class BDF {

  constructor () {
    this.meta = null
    this.glyphs = null
  }

  load (data) {
    this.meta = {}
    this.glyphs = {}

    var fontLines = data.split('\n')
    var declarationStack = []
    var currentChar = null

    for (var i = 0 i < fontLines.length i++) {
      var line = fontLines[i]
      var line_data = line.split(/\s+/)
      var declaration = line_data[0]

      switch (declaration)
      {
        case 'STARTFONT':
          declarationStack.push(declaration)
          this.meta.version = +line_data[1]
          break
        case 'FONT':
          this.meta.name = +line_data[1]
          break
        case 'SIZE':
          this.meta.size = {
            points:      +line_data[1],
            resolutionX: +line_data[2],
            resolutionY: +line_data[3]
          }
          break
        case 'FONTBOUNDINGBOX':
          this.meta.boundingBox = {
            width:  +line_data[1],
            height: +line_data[2],
            x:      +line_data[3],
            y:      +line_data[4]
          }
          break
        case 'STARTPROPERTIES':
          declarationStack.push(declaration)
          this.meta.properties = {}
          break
        case 'FONT_DESCENT':
          this.meta.properties.fontDescent = +line_data[1]
          break
        case 'FONT_ASCENT':
          this.meta.properties.fontAscent = +line_data[1]
          break
        case 'DEFAULT_CHAR':
          this.meta.properties.defaultChar = +line_data[1]
          break
        case 'ENDPROPERTIES':
          declarationStack.pop()
          break
        case 'CHARS':
          this.meta.totalChars = +line_data[1]
          break
        case 'STARTCHAR':
          declarationStack.push(declaration)
          currentChar = {
            name:   +line_data[1],
            bytes:  [],
            bitmap: []
          }
          break
        case 'ENCODING':
          currentChar.code = +line_data[1]
          currentChar.char = String.fromCharCode(+line_data[1])
          break
        case 'SWIDTH':
          currentChar.scalableWidthX = +line_data[1]
          currentChar.scalableWidthY = +line_data[2]
          break
        case 'DWIDTH':
          currentChar.deviceWidthX = +line_data[1]
          currentChar.deviceWidthY = +line_data[2]
          break
        case 'BBX':
          currentChar.boundingBox = {
            x:      +line_data[3],
            y:      +line_data[4],
            width:  +line_data[1],
            height: +line_data[2]
          }
          break
        case 'BITMAP':
          for (var row = 0; row < currentChar.boundingBox.height; row++, i++) {
            var byte = parseInt(fontLines[i + 1], 16)
            currentChar.bytes.push(byte)
            currentChar.bitmap[row] = []
            for (var bit = 7; bit >= 0; bit--) {
              currentChar.bitmap[row][7 - bit] = byte & 1 << bit ? 1 : 0
            }
          }
          break
        case 'ENDCHAR':
          declarationStack.pop()
          this.glyphs[currentChar.code] = currentChar
          currentChar = null
          break
        case 'ENDFONT':
          declarationStack.pop()
          break
      }
    }

    if (declarationStack.length) {
      throw "Couldn't correctly parse font"
    }
  }
}


class Text {

  txt_init (count, width, height) {
    this.char_count = count || 256
    this.char_width = width || 7
    this.char_height = height || 11

    this.char_offset_x = 0
    this.char_offset_y = 1

    this.text_width = Math.round(this.width / this.char_width)
    this.text_height = Math.round(this.height / this.char_height)
    this.text_size = this.text_width * this.text_height * 3

    this.font_size = this.char_width * this.char_height
    this.fonts_size = this.char_count * this.font_size

    this.txt_reset()
  }

  txt_tick (t) {
    if (t - this.last_text_cursor >= 500) {
      this.overlays.cursor.text.sprite.visible = !this.overlays.cursor.text.sprite.visible
      this.last_text_cursor = t
      this.force_update = true
    }

    this.overlays.cursor.text.sprite.x = (this.overlays.cursor.text.x - 1) * this.overlays.cursor.text.sprite.width + this.offset.x
    this.overlays.cursor.text.sprite.y = (this.overlays.cursor.text.y - 1) * this.overlays.cursor.text.sprite.height + this.offset.y

    if (this.force_text) {
      this.txt_draw()
      this.force_text = false
    }
  }

  txt_reset () {
    this.force_text = false
    this.last_text_cursor = 0

    this.text_addr = _vm.mm.alloc(this.text_size)
    this.fonts_addr = _vm.mm.alloc(this.fonts_size)
    this.txt_load_fnt()
  }

  txt_shut () {
  }

  txt_load () {
    var b = new BDF()
    var f = require('raw!../../fonts_addr/ctrld-fixed-10r.bdf')
    b.load(f)

    // var points = b.meta.size.points
    var fontAscent = b.meta.properties.fontAscent
    // var fontDescent = b.meta.properties.fontDescent
    var baseline = fontAscent + this.char_offset_y

    for (var k in b.glyphs) {
      var g = b.glyphs[k]
      var bb = g.boundingBox
      var dsc = baseline - bb.height - bb.y
      var ptr = this.fonts_addr + g.code * this.font_size

      for (var y = 0; y < bb.height; y++) {
        var p = ptr + (y + dsc) * this.char_width
        for (var x = 0; x < bb.width; x++) {
          _vm.mem[p + x + bb.x + this.char_offset_x] |= g.bitmap[y][x]
        }
      }
    }

    return b
  }

  txt_draw () {
    let cw = this.char_width
    let ch = this.char_height
    let tw = this.text_width
    let th = this.text_height

    let idx = this.text_addr
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        let c = _vm.mem[idx]
        if (c) {
          let fg = _vm.mem[idx + 1]
          let bg = _vm.mem[idx + 2]

          let px = x * cw
          let py = y * ch

          let ptr = this.fonts + c * this.font_size
          for (let by = 0 by < ch by++) {
            let pi = (py + by) * this.width + px
            for (let bx = 0 bx < cw bx++) {
              this.pixel(pi++, _vm.mem[ptr++] ? fg : bg)
            }
          }
        }
        idx += 3
      }
    }
  }

  txt_refresh (flip = true) {
    this.refresh(flip)
    this.force_text = true
  }

  txt_idx (x, y) {
    return this.text_addr + ((y - 1) * this.text_width + (x - 1)) * 3
  }

  txt_lin (y) {
    let l = this.text_width * 3
    return { start: this.text_addr + y * l, end: this.text_addr + (y + 1) * l - 3, length: l }
  }

  txt_cha (x, y) {
    let tidx = this.txt_idx(x, y)
    return { ch: _vm.mem[tidx], fg: _vm.mem[tidx + 1], bg: _vm.mem[tidx + 2] }
  }

  txt_put (ch, fg = 1, bg = 0) {
    switch (ch.charCodeAt(0))
    {
      case 13:
      case 10:
        this.txt_cr()
        return
      case 8:
        this.txt_bs()
        return
    }
    let { x, y } = this.txt_pos()

    let tidx = this.txt_idx(x, y)
    _vm.mem[tidx] = ch.charCodeAt(0)
    _vm.mem[tidx + 1] = fg
    _vm.mem[tidx + 2] = bg

    this.overlays.text.x++
    if (this.overlays.text.x > this.text_width) {
      this.txt_cr()
    }

    this.txt_refresh()
  }

  txt_prt (text, fg, bg) {
    for (let c of text) {
      this.txt_put(c, fg, bg)
    }
    return this
  }

  txt_pos () { return { x: this.overlays.text.x, y: this.overlays.text.y } }

  txt_mov (x, y) {
    if (x > this.text_width) {
      x = this.text_width
    }
    else if (x < 1) {
      x = 1
    }
    if (y > this.text_height) {
      y = this.text_height
    }
    else if (y < 1) {
      y = 1
    }
    this.overlays.text.x = x
    this.overlays.text.y = y
    this.txt_refresh()
  }

  txt_mvb (x, y) { return this.txt_mov(this.overlays.text.x + x, this.overlays.text.y + y) }

  txt_bol () { return this.txt_mov(1, this.overlays.text.y) }

  txt_eol () { return this.txt_mov(this.text_width, this.overlays.text.y) }

  txt_bos () { return this.txt_mov(1, 1) }

  txt_eos () { return this.txt_mov(this.text_width, this.text_height) }

  txt_bs () { this.txt_lft() this.txt_put(' ') return this.txt_lft() }

  txt_cr () { return this.txt_mov(1, this.overlays.text.y + 1) }

  txt_lf () { return this.txt_mov(this.overlays.text.x, this.overlays.text.y + 1) }

  txt_up () { return this.txt_mov(this.overlays.text.x, this.overlays.text.y - 1) }

  txt_lft () { return this.txt_mov(this.overlays.text.x - 1, this.overlays.text.y) }

  txt_dwn () { return this.txt_mov(this.overlays.text.x, this.overlays.text.y + 1) }

  txt_rgt () { return this.txt_mov(this.overlays.text.x + 1, this.overlays.text.y) }

  txt_clr () {
    _vm.mem.fill(0, this.text_addr, text_addr + this.text_size)
  }

  txt_clr_eol () {
    let { x, y } = this.txt_pos()
    _vm.mem.fill(0, this.txt_idx(x, y), this.txt_idx(this.text_width, y))
  }

  txt_clr_eos () {
    let { x, y } = this.txt_pos()
    _vm.mem.fill(0, this.txt_idx(x, y), this.text_addr + this.text_size)
  }

  txt_clr_bol () {
    let { x, y } = this.txt_pos()
    _vm.mem.fill(0, this.txt_idx(x, y), this.txt_idx(1, y))
  }

  txt_clr_bos () {
    let { x, y } = this.txt_pos()
    _vm.mem.fill(0, this.txt_idx(x, y), this.text_addr)
  }

  txt_cpy_lin (sy, ty) {
    let si = this.txt_lin(sy)
    let ti = this.txt_lin(ty)
    _vm.mem.copy(_vm.mem, ti.start, si.start, si.length)
  }

  txt_cpy_col (sx, tx) {
    for (let y = 0 y < this.text_height y++) {
      let i = this.txt_lin(y)
      let si = i.start + sx * 3
      let ti = i.start + tx * 3
      _vm.mem.copy(_vm.mem, ti, si, 3)
    }
  }

  txt_erase_lin (y) {
    let i = this.txt_lin(y)
    _vm.mem.fill(0, i.start, i.end)
  }

  txt_erase_col (x) {
    for (let y = 0 y < this.text_height y++) {
      let i = this.txt_lin(y).start + x * 3
      _vm.mem.fill(0, i, i + 3)
    }
  }

  txt_scroll (dy) {
    let i
    if (dy > 0) {
      i = this.txt_lin(dy + 1)
      _vm.mem.copy(_vm.mem, this.text_addr, i.start, this.text_size - i)
      i = this.txt_lin(dy)
      _vm.mem.fill(0, this.text_addr - i.start, this.text_addr + this.text_size)
    }
    else if (dy < 0) {
      i = this.txt_lin(dy + 1)
      _vm.mem.copy(_vm.mem, this.text_addr, i, this.text_size - i)
      i = this.txt_lin(dy + 1)
      _vm.mem.fill(0, this.text_addr - dy * this.text_width * 3, this.text_addr + this.text_size)
    }
  }

}

export default {
  Text,
}
