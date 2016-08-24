import _ from 'lodash'

import { defaults, mixin, runtime_error } from '../globals.js'

import { Memory } from '../memory.js'
import { Interrupt } from './interrupt.js'
import { MemoryManager } from './memorymanager.js'
import { Debugger } from './debugger.js'
import { Struct } from './struct.js'

import { Tokenizer } from '../compiler/tokenizer.js'
import { Assembler } from '../compiler/assembler.js'

import { CPUPort } from './ports/cpu.js'
import { VideoPort } from './ports/video.js'
import { KeyboardPort } from './ports/keyboard.js'
import { MousePort } from './ports/mouse.js'
import { DrivePort } from './ports/drive.js'
import { NetworkPort } from './ports/network.js'
import { SoundPort } from './ports/sound.js'


const _VM_STOPPED = 0
const _VM_RUNNING = 1
const _VM_PAUSED = 2

class VM {

  constructor (mem_size = defaults.vm.mem_size) {
    window._vm = this

    this.mem_init(mem_size)

    this.mm = new MemoryManager(this, this.mem, this.mem_size)

    this.dbg = new Debugger(this)

    this.struct = new Struct(this)

    this.int_init()
    this.snd_init()

    this.ports = []

    this.code = ''
    this.fn = null

    this.vm_boot(true)

    PIXI.ticker.shared.add(this.vm_tick)
  }

  vm_boot (cold = false) {
    this.vm_reset()

    if (cold) {
      this.mem_clr()

      new CPUPort(this, 0)
      new VideoPort(this, 1)
      new KeyboardPort(this, 2)
      new MousePort(this, 3)
      new DrivePort(this, 4)
      new NetworkPort(this, 5)
      new SoundPort(this, 6)
    }

    for (var k in this.ports) {
      this.ports[k].boot(cold)
    }
  }

  vm_restart (cold = false) {
    if (cold) {
      this.vm_shut()
    }
    this.vm_boot(cold)
  }

  vm_reset () {
    this.status = _VM_RUNNING

    for (var k in this.ports) {
      this.ports[k].reset()
    }

    this.mem_reset()
    this.int_reset()
    this.snd_reset()
  }

  vm_shut () {
    for (var k in this.ports) {
      this.ports[k].shut()
    }
    this.ports = {}

    this.mem_shut()
    this.int_shut()
    this.snd_shut()
  }

  vm_hlt (code) {
    if (code > 0) {
      runtime_error(this, code)
    }
    this.vm_stop()
  }

  vm_load (uri) {
    var t = new Tokenizer()
    var tokens = t.tokenize('', uri)
    console.log(tokens)
    var a = new Assembler()
    this.code = a.asm('', tokens)
    if (a.errors === 0) {
      this.fn = new Function(['args'], this.code)
    }
  }

  vm_run (...args) {
    if (this.fn) {
      this.fn.apply(this, args)
    }
  }

  vm_stop () { this.status = _VM_STOPPED }

  vm_pause () { this.status = _VM_PAUSED }

  vm_resume () { this.status = _VM_RUNNING }

  vm_tick (time) {
    if (this.status === _VM_RUNNING) {
      for (var k in this.ports) {
        if (this.ports[k].vm_tick) {
          this.ports[k].tick(time)
        }
      }

      this.mem_tick(time)
      this.int_tick(time)
      this.vid_tick(time)
      this.snd_tick(time)
    }
  }

  hex (value, size = 32) { return '$' + _.padStart(value.toString(16), Math.trunc(size / 4), '0') }

  gpa (port, offset) { return this.ports[port].top + offset }
  gfa (offset) { return this.fp + offset }
  gsa (offset) { return this.sp + offset }

  port_by_name (name) {
    name = name.toLowerCase()
    for (var k in this.ports) {
      if (this.ports[k].constructor.name.toLowerCase() === name) {
        return k
      }
    }
    return null
  }

  port_name (no) {
    return this.ports[no].constructor.name.toLowerCase()
  }
}

mixin(VM.prototype, Memory.prototype, Interrupt.prototype, Video.prototype, Sound.prototype)

export default {
  VM,
  _VM_STOPPED,
  _VM_RUNNING,
  _VM_PAUSED,
}
