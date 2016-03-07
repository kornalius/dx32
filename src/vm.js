import _ from 'lodash';
import { defaults, mixin, runtime_error } from './globals.js';
import Memory from './memory.js';
import Interrupt from './interrupt.js';
import MemoryManager from './memorymanager.js';
import Debugger from './debugger.js';
import Dict from './dict.js';
import Tokenizer from './tokenizer.js';
import Assembler from './assembler.js';

import CPU from './ports/cpu.js';
import Video from './ports/video.js';
import Keyboard from './ports/keyboard.js';
import Mouse from './ports/mouse.js';
import Drive from './ports/drive.js';
import Network from './ports/network.js';
import Sound from './ports/sound.js';

const _STOPPED = 0;
const _RUNNING = 1;
const _PAUSED = 2;

class VM {

  constructor (mem_size = defaults.vm.mem_size) {
    window._vm = this;

    this.init_mem(mem_size);

    this.mm = new MemoryManager(this, this.mem, this.mem_size);

    this.dbg = new Debugger(this);

    this.dict = new Dict(this);

    this.init_interrupts();

    this.ports = [];

    this.code = '';
    this.fn = null;

    this.boot(true);

    var that = this;
    PIXI.ticker.shared.add((time) => {
      if (that.status === _RUNNING) {
        that.tick(time);
      }
    });

  }

  boot (cold = false) {
    this.reset();

    if (cold) {
      this.clear_mem();

      new CPU(this, 0);
      new Video(this, 1);
      new Keyboard(this, 2);
      new Mouse(this, 3);
      new Drive(this, 4);
      new Network(this, 5);
      new Sound(this, 6);
    }

    for (var k in this.ports) {
      this.ports[k].boot(cold);
    }
  }

  restart (cold = false) {
    if (cold) {
      this.shut();
    }
    this.boot(cold);
  }

  reset () {
    this.status = _RUNNING;

    for (var k in this.ports) {
      this.ports[k].reset();
    }

    this.stop_ints();
  }

  shut () {
    for (var k in this.ports) {
      this.ports[k].shut();
    }
    this.ports = {};

    this.stacks = {};

    this.mem = null;
  }

  hlt (code) {
    if (code > 0) {
      runtime_error(this, code);
    }
    this.stop();
  }

  hex (value, size = 32) { return '$' + _.padStart(value.toString(16), Math.trunc(size / 4), '0'); }

  gpa (port, offset) { return this.ports[port].top + offset; }
  gfa (offset) { return this.fp + offset; }
  gsa (offset) { return this.sp + offset; }

  load (uri) {
    var t = new Tokenizer();
    var tokens = t.tokenize('', uri);
    console.log(tokens);
    var a = new Assembler();
    this.code = a.asm('', tokens);
    if (a.errors === 0) {
      this.fn = new Function(['args'], this.code);
    }
  }

  run (...args) {
    if (this.fn) {
      this.fn.apply(this, args);
    }
  }

  stop () { this.status = _STOPPED; }

  pause () { this.status = _PAUSED; }

  resume () { this.status = _RUNNING; }

  tick (time) {
    for (var k in this.ports) {
      if (this.ports[k].tick) {
        this.ports[k].tick(time);
      }
    }
    this.process_ints(time);
  }

  port_by_name (name) {
    name = name.toLowerCase();
    for (var k in this.ports) {
      if (this.ports[k].constructor.name.toLowerCase() === name) {
        return k;
      }
    }
    return null;
  }

  port_name (no) {
    return this.ports[no].constructor.name.toLowerCase();
  }
}

mixin(VM.prototype, Memory.prototype, Interrupt.prototype);

export default VM;
