import _ from 'lodash'
import { DOS } from '../io/dos.js'
import { Port } from '../port.js'
import { Sound } from '../sound.js'
import { Floppy } from '../io/floppy.js'
import { mixin, delay, io_error } from '../../globals.js'


export class DrivePort extends Port {

  constructor (port_number) {
    super(port_number)

    this.name = 'drv'

    this.dos = new DOS(this)

    this.snd_init()

    this.snd_load('insert', 'disk_insert.wav', false)
    this.snd_load('eject', 'disk_eject.wav', false)
    this.snd_load('spin', 'disk_spin.wav', true)
    this.snd_load('read1', 'disk_read1.wav', false)
    this.snd_load('read2', 'disk_read2.wav', false)
    this.snd_load('read3', 'disk_read3.wav', false)
    this.snd_load('read4', 'disk_read4.wav', false)
    this.snd_load('write1', 'disk_write1.wav', false)
    this.snd_load('write2', 'disk_write2.wav', false)

    this.operations = {
      insert: { min_time: 1000, max_time: 2000, sound: 'insert' },
      eject: { min_time: 1000, max_time: 2000, sound: 'eject' },
      spin: { min_time: 1000, max_time: 2500 },
      seek: { min_time: 100, max_time: 250, sound: 'read', random_sound: true },
      read: { min_time: 250, max_time: 500, sound: 'read', random_sound: true },
      write: { min_time: 500, max_time: 1500, sound: 'write', random_sound: true },
    }

    this.floppy = null
    this.pos = 0

    this.spinning = null
    this.stop_spin_bound = this.stop_spin.bind(this)

    this.publics = {
      loaded: this.loaded,
      eject: this.eject,
      insert: this.insert,
      by: this.seek_by,
      to: this.seek,
      read: this.read,
      write: this.write,
    }

    // this.test()
  }

  tick (t) {
    super.tick(t)
    this.snd_tick(t)
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

    let _op = this.operations[name]

    let max = 1
    if (size) {
      max = size ? Math.max(Math.trunc(size / 128), 1) : 1
    }

    let min_time = _op ? _op.min_time : 250
    let max_time = _op ? _op.max_time : 500
    let sound = _op ? _op.sound : null

    while (max > 0) {
      let t = _.random(min_time, max_time)
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
      let that = this
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
    this.spinning = setTimeout(this.stop_spin_bound, _.random(this.operations.spin.min_time, this.operations.spin.max_time))
  }

  stop_spin () {
    clearTimeout(this.spinning)
    this.spinning = null
    this.sounds.spin.stop()
  }

  check_floppy () {
    if (!this.loaded()) {
      io_error(0x08)
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
      io_error(0x08)
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
      io_error(0x07)
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
    let start = 0
    let b
    if (addr) {
      b = _vm.mem_array
      start = addr
    }
    else {
      b = new ArrayBuffer(size)
    }
    b.set(this.floppy.mem_array.subarray(this.pos, this.pos + size - 1), start)
    this.operation('read', size)
    this.seek_by(size)
  }

  write (addr, size) {
    this.floppy.mem_array.set(_vm.mem_array.subarray(addr, addr + size - 1), this.pos)
    this.operation('write', size)
    this.dos.flush()
    this.seek_by(size)
  }

  test () {
    let that = this
    setTimeout(() => {
      let f = new Floppy(that)
      that.insert(f)
      that.dos.format()
      that.dos.create('myfile.txt', 'MY DATA IS FUCKING COOL')
      // that.when_finished_spinning(() => { delay(500); that.eject() })
    }, 2000)
  }

}

mixin(DrivePort.prototype, Sound.prototype)
