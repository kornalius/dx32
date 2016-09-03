import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { Video } from '../video/video.js'


export class VideoPort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'vid'

    this.vid_init()

    this.publics = {
      draw: this.txt_draw,
      refresh: this.txt_refresh,
      idx: this.txt_index,
      lin: this.txt_line,
      at: this.txt_char_at,
      put: this.txt_put_char,
      print: this.txt_print,
      pos: this.txt_pos,
      to: this.txt_move_to,
      by: this.txt_move_by,
      bol: this.txt_bol,
      eol: this.txt_eol,
      bos: this.txt_bos,
      eos: this.txt_eos,
      bs: this.txt_bs,
      cr: this.txt_cr,
      lf: this.txt_lf,
      up: this.txt_up,
      left: this.txt_left,
      down: this.txt_down,
      right: this.txt_right,
      clr: this.txt_clear,
      clr_eol: this.txt_clear_eol,
      clr_os: this.txt_clear_eos,
      clr_bl: this.txt_clear_bol,
      clr_bs: this.txt_clear_bos,
      cpy_lin: this.txt_copy_lin,
      cpy_col: this.txt_copy_col,
      erase_lin: this.txt_erase_lin,
      erase_col: this.txt_erase_col,
      scroll: this.txt_scroll,
    }
  }

  boot (cold = false) {
    super.boot(cold)

    if (cold) {
      this.reset()
      this.test()
    }
  }

  tick (t) {
    super.tick(t)
    this.vid_tick(t)
  }

  reset () {
    super.reset()
    this.vid_reset()
    this.write_info()
  }

  shut () {
    super.shut()
    this.vid_shut()
  }

  write_info () {
    if (!this.info) {
      this.info = _vm.alloc(80)
    }

    _vm.seq_start(this.info)

    _vm.seq_dword(this.screen_addr)
    _vm.seq_dword(this.width)
    _vm.seq_dword(this.height)
    _vm.seq_dword(this.scale)

    _vm.seq_dword(this.palette_addr)
    _vm.seq_dword(this.palette_count)
    _vm.seq_dword(this.palette_size)

    _vm.seq_dword(this.sprites_addr)
    _vm.seq_dword(this.sprite_width)
    _vm.seq_dword(this.sprite_height)
    _vm.seq_dword(this.sprite_size)
    _vm.seq_dword(this.sprites_size)

    _vm.seq_dword(this.fonts_addr)
    _vm.seq_dword(this.font_size)
    _vm.seq_dword(this.fonts_size)

    _vm.seq_dword(this.char_count)
    _vm.seq_dword(this.char_width)
    _vm.seq_dword(this.char_height)

    _vm.seq_dword(this.text_width)
    _vm.seq_dword(this.text_height)
    _vm.seq_dword(this.text_addr)
    _vm.seq_dword(this.text_size)

    _vm.seq_end()
  }

  test () {
    _vm.fill(this.screen_addr, 10, 2000)

    this.pixel(200, 0)
    this.pixel(400, 6)
    this.pixel(500, 8)
    this.pixel(600, 20)

    this.txt_move_to(1, 1)
    this.txt_put_char('A', 29, 15)

    this.txt_move_to(10, 11)
    this.txt_print('Welcome to DX32\nÉgalitée!', 2, 6)

    let chars = ''
    for (let i = 33; i < 256; i++) {
      chars += String.fromCharCode(i)
    }
    this.txt_move_to(1, 2)
    this.txt_print(chars, 25, 0)

    this.txt_move_to(1, 23)
    this.txt_print('Second to last line', 1, 0)

    this.txt_move_to(1, 24)
    this.txt_print('012345678901234567890123456789012345678901234567890123', 21, 0)

    this.txt_refresh()
  }

}

mixin(VideoPort.prototype, Video.prototype)
