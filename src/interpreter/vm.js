import { defaults, mixin, runtime_error } from '../globals.js'

import { Memory } from '../memory.js'
import { MemoryManager } from './memorymanager.js'
import { Debugger } from './debugger.js'
import { Struct } from './struct.js'
import { Interrupt } from './interrupt.js'

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
    this.mm_init()

    this.int_init()

    this.ports = []

    this.code = ''
    this.fn = null

    this.dbg_init()

    this.boot(true)

    this.tickBound = this.tick.bind(this)
    PIXI.ticker.shared.add(this.tickBound)
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

    this.int_reset()
    this.mm_reset()
    this.mem_reset()
    this.dbg_reset()
  }

  shut () {
    for (let k in this.ports) {
      this.ports[k].shut()
    }
    this.ports = {}

    this.int_shut()
    this.mm_shut()
    this.mem_shut()
    this.dbg_shut()
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

  tick (delta) {
    if (this.status === _VM_RUNNING) {
      let t = performance.now()

      this.int_tick(t, delta)
      this.mem_tick(t, delta)

      for (let k in this.ports) {
        this.ports[k].tick(t, delta)
      }

      this.mm_tick(t, delta)
      this.dbg_tick(t, delta)
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

mixin(VM.prototype, Memory.prototype, MemoryManager.prototype, Struct.prototype, Interrupt.prototype, Debugger.prototype)
