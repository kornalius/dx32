import _ from 'lodash'
import { DOS } from '../io/dos.js'
import { Port } from '../port.js'
import { Sound } from '../sound.js'
import { Floppy, Entry, _OPEN, _LOCK } from '../io/floppy.js'
import { mixin, delay, rnd, io_error } from '../../globals.js'


class DrivePort extends Port {

  constructor (vm, port_number) {
    super(vm, port_number)

    this.dos = new DOS(this)

    this.snd_init()

    this.snd_load({ name: 'insert', path: 'disk_insert.wav', loop: false, })
    this.snd_load({ name: 'eject', path: 'disk_eject.wav', loop: false, })
    this.snd_load({ name: 'spin', path: 'disk_spin.wav', loop: true, })
    this.snd_load({ name: 'read1', path: 'disk_read1.wav', loop: false, })
    this.snd_load({ name: 'read2', path: 'disk_read2.wav', loop: false, })
    this.snd_load({ name: 'read3', path: 'disk_read3.wav', loop: false, })
    this.snd_load({ name: 'read4', path: 'disk_read4.wav', loop: false, })
    this.snd_load({ name: 'write1', path: 'disk_write1.wav', loop: false, })
    this.snd_load({ name: 'write2', path: 'disk_write2.wav', loop: false, })

    this.operations = {
      insert: { min_time: 1000, max_time: 2000, sound: 'insert' },
      eject:  { min_time: 1000, max_time: 2000, sound: 'eject' },
      spin:   { min_time: 1000, max_time: 2500 },
      seek:   { min_time: 100, max_time: 250, sound: 'read', random_sound: true },
      read:   { min_time: 250, max_time: 500, sound: 'read', random_sound: true },
      write:  { min_time: 500, max_time: 1500, sound: 'write', random_sound: true },
    }

    this.floppy = null
    this.pos = 0

    this.spinning = null
    this.stop_spin_bound = this.stop_spin.bind(this)

    var that = this
    setTimeout(() => {
      var f = new Floppy(that)
      that.insert(f)
      that.dos.format()
      that.dos.create('myfile.txt', 'MY DATA IS FUCKING COOL')
      // that.when_finished_spinning(() => { delay(500); that.eject() })
    }, 2000)
  }

  reset () {
    super.reset()
    this.snd_reset()
  }

  shut () {
    super.shut()
    this.snd_shut()
  }

  operation (name, size = 0) {
    if (name !== 'insert' && name !== 'eject') {
      this.start_spin()
      if (!this.check_floppy()) {
        return
      }
    }

    var _op = this.operations[name]

    var max = 1
    if (size) {
      max = size ? Math.max(Math.trunc(size / 128), 1) : 1
    }

    var min_time = _op ? _op.min_time : 250
    var max_time = _op ? _op.max_time : 500
    var sound = _op ? _op.sound : null

    while (max > 0) {
      var t = rnd(min_time, max_time)
      // console.log(name, '=>', size, t)

      if (sound) {
        this.snd_play(sound, {}, _op.random_sound)
      }

      delay(t)

      max--
    }
  }

  when_finished_spinning (cb) {
    if (this.spinning) {
      var that = this
      setTimeout(() => { that.when_finished_spinning(cb) }, 500)
    }
    else {
      cb()
    }
  }

  start_spin () {
    if (!this.spinning) {
      this.snd_play('spin', { loop: true })
    }
    clearTimeout(this.spinning)
    this.spinning = setTimeout(this.stop_spin_bound, rnd(this.operations.spin.min_time, this.operations.spin.max_time))
  }

  stop_spin () {
    clearTimeout(this.spinning)
    this.spinning = null
    this.sounds.spin.stop()
  }

  check_floppy () {
    if (!this.loaded()) {
      io_error(this, 0x08)
      return false
    }
    return true
  }

  loaded () { return this.floppy !== null }

  eject () {
    this.dos.eject()
    if (this.loaded()) {
      this.floppy.eject()
      this.floppy = null
      this.operation('eject')
    }
    else {
      io_error(this, 0x08)
      return
    }
  }

  insert (floppy) {
    this.dos.insert(floppy)
    if (!this.loaded()) {
      this.floppy = floppy
      this.operation('insert')
      this.floppy.insert(this)
    }
    else {
      io_error(this, 0x07)
      return
    }
  }

  seek_by (offset) { this.seek(this.pos + offset) }

  seek (pos) {
    if (pos) {
      this.pos = pos === -1 ? this.floppy.size - 1 : pos
      this.operation('seek', Math.abs(this.pos - pos))
    }
  }

  read (addr, size) {
    var start = 0
    var b
    if (addr) {
      b = _vm.mem
      start = addr
    }
    else {
      b = new Buffer(size)
    }
    this.floppy.mem.copy(b, start, this.pos, this.pos + size)
    this.operation('read', size)
    this.seek_by(size)
  }

  write (addr, size) {
    _vm.mem.copy(this.floppy.mem, this.pos, addr, size)
    this.operation('write', size)
    this.dos.flush()
    this.seek_by(size)
  }

}

mixin(DrivePort.prototype, Sound.prototype)

export default {
  DrivePort,
}
