

class BDF {

  constructor () {
    this.meta = null
    this.glyphs = null
  }

  load (data) {
    this.meta = {}
    this.glyphs = {}

    let fontLines = data.split('\n')
    let declarationStack = []
    let currentChar = null

    for (let i = 0; i < fontLines.length; i++) {
      let line = fontLines[i]
      let line_data = line.split(/\s+/)
      let declaration = line_data[0]

      switch (declaration) {
        case 'STARTFONT':
          declarationStack.push(declaration)
          this.meta.version = Math.abs(line_data[1])
          break
        case 'FONT':
          this.meta.name = Math.abs(line_data[1])
          break
        case 'SIZE':
          this.meta.size = {
            points: Math.abs(line_data[1]),
            resolutionX: Math.abs(line_data[2]),
            resolutionY: Math.abs(line_data[3]),
          }
          break
        case 'FONTBOUNDINGBOX':
          this.meta.boundingBox = {
            width: Math.abs(line_data[1]),
            height: Math.abs(line_data[2]),
            x: Math.abs(line_data[3]),
            y: Math.abs(line_data[4]),
          }
          break
        case 'STARTPROPERTIES':
          declarationStack.push(declaration)
          this.meta.properties = {}
          break
        case 'FONT_DESCENT':
          this.meta.properties.fontDescent = Math.abs(line_data[1])
          break
        case 'FONT_ASCENT':
          this.meta.properties.fontAscent = Math.abs(line_data[1])
          break
        case 'DEFAULT_CHAR':
          this.meta.properties.defaultChar = Math.abs(line_data[1])
          break
        case 'ENDPROPERTIES':
          declarationStack.pop()
          break
        case 'CHARS':
          this.meta.totalChars = Math.abs(line_data[1])
          break
        case 'STARTCHAR':
          declarationStack.push(declaration)
          currentChar = {
            name: Math.abs(line_data[1]),
            bytes: [],
            bitmap: [],
          }
          break
        case 'ENCODING':
          currentChar.code = Math.abs(line_data[1])
          currentChar.char = String.fromCharCode(Math.abs(line_data[1]))
          break
        case 'SWIDTH':
          currentChar.scalableWidthX = Math.abs(line_data[1])
          currentChar.scalableWidthY = Math.abs(line_data[2])
          break
        case 'DWIDTH':
          currentChar.deviceWidthX = Math.abs(line_data[1])
          currentChar.deviceWidthY = Math.abs(line_data[2])
          break
        case 'BBX':
          currentChar.boundingBox = {
            x: Math.abs(line_data[3]),
            y: Math.abs(line_data[4]),
            width: Math.abs(line_data[1]),
            height: Math.abs(line_data[2]),
          }
          break
        case 'BITMAP':
          for (let row = 0; row < currentChar.boundingBox.height; row++, i++) {
            let byte = parseInt(fontLines[i + 1], 16)
            currentChar.bytes.push(byte)
            currentChar.bitmap[row] = []
            for (let bit = 7; bit >= 0; bit--) {
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


export class Text {

  txt_init (char_count, char_width, char_height, char_offset) {
    this.chr_count = char_count || 256
    this.chr_width = char_width || 6
    this.chr_height = char_height || 10
    this.chr_offset_x = char_offset ? char_offset.x : 0
    this.chr_offset_y = char_offset ? char_offset.y : 4
    this.chr_size = this.chr_width * this.chr_height

    this.txt_width = Math.round(this.vid_width / this.chr_width)
    this.txt_height = Math.round(this.vid_height / this.chr_height)
    this.txt_size = this.txt_width * this.txt_height * 3

    this.fnt_size = this.chr_count * this.chr_size
  }

  txt_tick (t) {
    if (this.txt_force_update) {
      this.txt_draw()
      this.txt_force_update = false
    }
  }

  txt_reset () {
    this.fnt_top = this._fonts.mem_top
    this.fnt_bottom = this._fonts.mem_bottom

    this.fnt_array = new Uint8Array(_vm.mem_buffer, this.fnt_top, this.fnt_size)

    this.txt_top = this._text.mem_top
    this.txt_bottom = this._text.mem_bottom

    this.txt_array = new Uint8Array(_vm.mem_buffer, this.txt_top, this.txt_size)

    this.txt_force_update = false

    this.txt_clear()
  }

  txt_shut () {
  }

  txt_load_fnt () {
    let b = new BDF()
    let ff = require('raw!../../../fonts/ctrld-fixed-10r.bdf')
    b.load(ff)

    // let points = b.meta.size.points
    let fontAscent = b.meta.properties.fontAscent
    // let fontDescent = b.meta.properties.fontDescent
    let baseline = fontAscent + this.chr_offset_y

    let cw = this.chr_width
    let fnt_sz = this.chr_size
    let osx = this.chr_offset_x

    var mem = this.fnt_array

    for (let k in b.glyphs) {
      let g = b.glyphs[k]
      let bb = g.boundingBox
      let dsc = baseline - bb.height - bb.y
      let ptr = g.code * fnt_sz

      for (let y = 0; y < bb.height; y++) {
        let p = ptr + (y + dsc) * cw
        for (let x = 0; x < bb.width; x++) {
          mem[p + x + bb.x + osx] |= g.bitmap[y][x]
        }
      }
    }

    return b
  }

  txt_draw () {
    let cw = this.chr_width
    let ch = this.chr_height
    let tw = this.txt_width
    let th = this.txt_height
    let w = this.vid_width
    let fnt_sz = this.chr_size

    var fnt_mem = this.fnt_array
    var txt_mem = this.txt_array

    let idx = 0
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        let c = txt_mem[idx]
        if (c) {
          let fg = txt_mem[idx + 1]
          let bg = txt_mem[idx + 2]

          let px = x * cw
          let py = y * ch

          let ptr = c * fnt_sz
          for (let by = 0; by < ch; by++) {
            let pi = (py + by) * w + px
            for (let bx = 0; bx < cw; bx++) {
              this.pixel(pi++, fnt_mem[ptr++] ? fg : bg)
            }
          }
        }
        idx += 3
      }
    }
  }

  txt_refresh (flip = true) {
    this.vid_refresh(flip)
    this.txt_force_update = true
  }

  txt_index (x, y) {
    return ((y - 1) * this.txt_width + (x - 1)) * 3
  }

  txt_line (y) {
    let l = this.txt_width * 3
    return { start: y * l, end: (y + 1) * l - 3, length: l }
  }

  txt_char_at (x, y) {
    let tidx = this.txt_index(x, y)
    let mem = this.txt_array
    return { ch: mem[tidx], fg: mem[tidx + 1], bg: mem[tidx + 2] }
  }

  txt_put_char (ch, fg = 1, bg = 0) {
    switch (ch.charCodeAt(0)) {
      case 13:
      case 10:
        this.txt_cr()
        return
      case 8:
        this.txt_bs()
        return
    }

    let { x, y } = this.txt_pos()
    this.txt_array.set([ch.charCodeAt(0), fg, bg], this.txt_index(x, y))

    this.overlays.textCursor.x++
    if (this.overlays.textCursor.x > this.txt_width) {
      this.txt_cr()
    }

    this.txt_refresh()
  }

  txt_print (text, fg, bg) {
    for (let c of text) {
      this.txt_put_char(c, fg, bg)
    }
    return this
  }

  txt_pos () { return { x: this.overlays.textCursor.x, y: this.overlays.textCursor.y } }

  txt_move_to (x, y) {
    if (x > this.txt_width) {
      x = this.txt_width
    }
    else if (x < 1) {
      x = 1
    }
    if (y > this.txt_height) {
      y = this.txt_height
    }
    else if (y < 1) {
      y = 1
    }

    this.overlays.textCursor.x = x
    this.overlays.textCursor.y = y

    this.txt_refresh(false)
  }

  txt_move_by (x, y) { return this.txt_move_to(this.overlays.textCursor.x + x, this.overlays.textCursor.y + y) }

  txt_bol () { return this.txt_move_to(1, this.overlays.textCursor.y) }

  txt_eol () { return this.txt_move_to(this.txt_width, this.overlays.textCursor.y) }

  txt_bos () { return this.txt_move_to(1, 1) }

  txt_eos () { return this.txt_move_to(this.txt_width, this.txt_height) }

  txt_bs () { this.txt_left(); this.txt_put_char(' '); return this.txt_left() }

  txt_cr () { return this.txt_move_to(1, this.overlays.textCursor.y + 1) }

  txt_lf () { return this.txt_move_to(this.overlays.textCursor.x, this.overlays.textCursor.y + 1) }

  txt_up () { return this.txt_move_to(this.overlays.textCursor.x, this.overlays.textCursor.y - 1) }

  txt_left () { return this.txt_move_to(this.overlays.textCursor.x - 1, this.overlays.textCursor.y) }

  txt_down () { return this.txt_move_to(this.overlays.textCursor.x, this.overlays.textCursor.y + 1) }

  txt_right () { return this.txt_move_to(this.overlays.textCursor.x + 1, this.overlays.textCursor.y) }

  txt_clear () {
    this.txt_array.fill(0)
    this.txt_refresh()
  }

  txt_clear_eol () {
    let { x, y } = this.txt_pos()
    let s = this.txt_index(x, y)
    this.txt_array.fill(0, s, this.txt_index(this.txt_width, y) - s)
    this.txt_refresh()
  }

  txt_clear_eos () {
    let { x, y } = this.txt_pos()
    let s = this.txt_index(x, y)
    this.txt_array.fill(0, s, this.txt_size - s)
    this.txt_refresh()
  }

  txt_clear_bol () {
    let { x, y } = this.txt_pos()
    let s = this.txt_index(x, y)
    this.txt_array.fill(0, s, this.txt_index(1, y) - s)
    this.txt_refresh()
  }

  txt_clear_bos () {
    let { x, y } = this.txt_pos()
    this.txt_array.fill(0, 0, this.txt_index(x, y) - 1)
    this.txt_refresh()
  }

  txt_copy_lin (sy, ty) {
    let si = this.txt_line(sy)
    this.txt_array.copy(si.start, this.txt_line(ty), si.length)
    this.txt_refresh()
  }

  txt_copy_col (sx, tx) {
    let mem = this.txt_array
    sx *= 3
    tx *= 3
    for (let y = 0; y < this.txt_height; y++) {
      let i = this.txt_line(y)
      mem.copy(i.start + sx, i.start + tx, 3)
    }
    this.txt_refresh()
  }

  txt_erase_lin (y) {
    let i = this.txt_line(y)
    this.txt_array.fill(0, i.start, i.length)
    this.txt_refresh()
  }

  txt_erase_col (x) {
    let mem = this.txt_array
    let ls = this.txt_line(0).start + x * 3
    for (let y = 0; y < this.txt_height; y++) {
      mem.fill(0, ls, 3)
      ls += this.txt_width * 3
    }
    this.txt_refresh()
  }

  txt_scroll (dy) {
    if (dy > 0) {
      let i = this.txt_line(dy + 1)
      this.txt_array.copy(i.start, 0, this.txt_size)
      i = this.txt_line(dy)
      let s = i.start
      this.txt_array.fill(0, s, this.txt_size - s)
      this.txt_refresh()
    }
    else if (dy < 0) {
      let i = this.txt_line(dy + 1)
      this.txt_array.copy(i.start, 0, this.txt_size)
      i = this.txt_line(dy)
      let s = i.start
      this.txt_array.fill(0, s, this.txt_size - s)
      this.txt_refresh()
    }
  }

}
