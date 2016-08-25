import _ from 'lodash'
import { mixin } from '../../globals.js'
import { Port } from '../port.js'
import { Video } from '../video/video.js'


export class VideoPort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)
    this.vid_init()
  }

  boot (cold = false) {
    super.boot(cold)

    if (cold) {
      this.reset()
      this.test()
    }
  }

  reset () {
    super.reset()
    this.vid_reset()
    this.vid_write_info()
  }

  shut () {
    super.shut()
    this.vid_shut()
  }

  vid_write_info () {
    if (!this.info) {
      this.info = _vm.mm.alloc(80)
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

    this.txt_mov(1, 1)
    this.txt_put('A', 29, 15)

    this.txt_mov(10, 11)
    this.txt_print('Welcome to DX32\nÉgalitée!', 2, 6)

    let chars = ''
    for (let i = 33; i < 256; i++) {
      chars += String.fromCharCode(i)
    }
    this.txt_mov(1, 2)
    this.txt_print(chars, 1, 0)

    this.txt_mov(1, 23)
    this.txt_print('Second to last line', 30, 0)

    this.txt_mov(1, 24)
    this.txt_print('012345678901234567890123456789012345678901234567890123', 1, 0)

    this.txt_refresh()
  }

}

mixin(VideoPort.prototype, Video.prototype)
