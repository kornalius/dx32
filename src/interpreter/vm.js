import { defaults, mixin, runtime_error } from '../globals.js'

import { Memory } from '../memory.js'
import { Stack } from '../stack.js'
import { MemoryManager } from './memorymanager.js'
import { Debugger } from './debugger.js'
import { Union } from './union.js'

import { Interrupt } from './interrupt.js'
import { Video } from './video/video.js'
import { Sound } from './sound.js'

import { Tokenizer } from '../compiler/tokenizer.js'
import { Assembler } from '../compiler/assembler.js'

import { CPUPort } from './ports/cpu.js'
import { VideoPort } from './ports/video.js'
import { KeyboardPort } from './ports/keyboard.js'
import { MousePort } from './ports/mouse.js'
import { DrivePort } from './ports/drive.js'
import { NetworkPort } from './ports/network.js'
import { SoundPort } from './ports/sound.js'


export const _VM_STOPPED = 0
export const _VM_RUNNING = 1
export const _VM_PAUSED = 2

export class VM {

  constructor (mem_size = defaults.vm.mem_size) {
    window._vm = this

    this.mem_init(mem_size)

    this.mm = new MemoryManager(this.mem_buffer, this.mem_size)

    this.dbg = new Debugger()

    this.int_init()
    this.snd_init()

    this.ports = []

    this.code = ''
    this.fn = null

    this.boot(true)

    PIXI.ticker.shared.add(this.tick)
  }

  boot (cold = false) {
    this.reset()

    if (cold) {
      this.clear()

      new CPUPort(0)
      new VideoPort(1)
      new KeyboardPort(2)
      new MousePort(3)
      new DrivePort(4)
      new NetworkPort(5)
      new SoundPort(6)
    }

    for (let k in this.ports) {
      this.ports[k].boot(cold)
    }
  }

  restart (cold = false) {
    if (cold) {
      this.shut()
    }
    this.boot(cold)
  }

  reset () {
    this.status = _VM_RUNNING

    for (let k in this.ports) {
      this.ports[k].reset()
    }

    this.mem_reset()
    this.int_reset()
    this.snd_reset()
  }

  shut () {
    for (let k in this.ports) {
      this.ports[k].shut()
    }
    this.ports = {}

    this.mem_shut()
    this.int_shut()
    this.snd_shut()
  }

  hlt (code) {
    if (code > 0) {
      runtime_error(code)
    }
    this.stop()
  }

  load (uri) {
    let t = new Tokenizer()
    let tokens = t.tokenize('', uri)
    console.log(tokens)
    let a = new Assembler()
    this.code = a.asm('', tokens)
    if (a.errors === 0) {
      this.fn = new Function(['args'], this.code)
    }
  }

  run (...args) {
    if (this.fn) {
      this.fn.apply(this, args)
    }
  }

  stop () { this.status = _VM_STOPPED }

  pause () { this.status = _VM_PAUSED }

  resume () { this.status = _VM_RUNNING }

  tick (time) {
    if (this.status === _VM_RUNNING) {
      for (let k in this.ports) {
        if (this.ports[k].tick) {
          this.ports[k].tick(time)
        }
      }

      this.mem_tick(time)
      this.int_tick(time)
      this.vid_tick(time)
      this.snd_tick(time)
    }
  }

  gpa (port, offset) { return this.ports[port].top + offset }
  gfa (offset) { return this.fp + offset }
  gsa (offset) { return this.sp + offset }

  port_by_name (name) {
    name = name.toLowerCase()
    for (let k in this.ports) {
      if (this.ports[k].name.toLowerCase() === name) {
        return k
      }
    }
    return null
  }

  port_name (no) {
    return this.ports[no].name.toLowerCase()
  }
}

mixin(VM.prototype, Memory.prototype, Stack.prototype, Union.prototype, Interrupt.prototype, Video.prototype, Sound.prototype)
