import _ from 'lodash';
import hexy from 'hexy';
import { defaults, opcodes, opcodes_idx, registers, register_names, error, runtime_error, read, write, byte, word, dword } from './globals.js';
import MemoryManager from './memorymanager.js';
import Port from './port.js';
import Label from './label.js';
import Tokenizer from './tokenizer.js';
import Assembler from './assembler.js';

import CPU from './ports/cpu.js';
import Video from './ports/video.js';
import Keyboard from './ports/keyboard.js';
import Mouse from './ports/mouse.js';
import Disk from './ports/disk.js';
import Network from './ports/network.js';

class VM {

  constructor (mem_size = defaults.vm.mem_size) {
    window._vm = this;

    this.mm = new MemoryManager(this);

    this.ports = [];

    this.code = '';
    this.fn = null;

    this.mem = null;
    this.mem_size = mem_size;

    this.top = 0;
    this.bottom = this.mem_size;

    this.avail_mem = this.mem_size;
    this.used_mem = 0;
    this.free_mem = this.mem_size;

    this.boot(true);
  }

  boot (cold = false) {
    this.reset();

    if (cold) {
      this.mem = new Buffer(this.mem_size);

      new CPU(this, 0);
      new Video(this, 1);
      new Keyboard(this, 2);
      new Mouse(this, 3);
      new Disk(this, 4);
      new Network(this, 5);
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
    this.paused = false;
    this.halted = false;

    for (var k in this.ports) {
      this.ports[k].reset();
    }
  }

  shut () {
    for (var k in this.ports) {
      this.ports[k].shut();
    }
    this.ports = {};

    this.mem = null;

    this.avail_mem = 0;
    this.used_mem = 0;
    this.free_mem = 0;
  }

  hlt (code) {
    if (code > 0) {
      runtime_error(this, code);
    }
    this.stop();
  }

  check_bounds (addr, sz = 4) { if (addr < this.top || addr + sz > this.bottom) { this.hlt(0x06); } }

  db (...args) {
    var addr = this.mm.alloc(args.length);
    for (var a of args) {
      this.mem[addr++] = a;
    }
  }

  dw (...args) {
    var addr = this.mm.alloc(args.length * 2);
    for (var a of args) {
      this.mem.writeUInt16LE(a, addr);
      addr += 2;
    }
  }

  dd (...args) {
    var addr = this.mm.alloc(args.length * 4);
    for (var a of args) {
      this.mem.writeUInt32LE(a, addr);
      addr += 4;
    }
  }

  ldb (addr) { return this.mem[addr]; }
  ldw (addr) { return this.mem.readUInt16LE(addr); }
  ld (addr) { return this.mem.readUInt32LE(addr); }

  lds (addr) {
    var s = '';
    var c = this.mem[addr++];
    while (addr < this.bottom && c !== 0) {
      s += String.fromCharCode(c);
      c = this.mem[addr++];
    }
    return s;
  }

  stb (addr, value) { this.mem.writeUInt8(addr, value); }
  stw (addr, value) { this.mem.writeUInt16LE(addr, value); }
  st (addr, value) { this.mem.writeUInt32LE(addr, value); }

  sts (addr, str) {
    for (var i = 0; i < str.length; i++) {
      this.mem[addr++] = str.charCodeAt(i);
    }
    this.mem[addr] = 0;
  }

  gpa (port, offset) { return this.ports[port].top + offset; }
  gfa (offset) { return this.fp + offset; }
  gsa (offset) { return this.sp + offset; }

  fill (addr, value, size) {
    this.mem.fill(value, addr, addr + size);
  }

  copy (src, tgt, size) {
    this.mem.copy(this.mem, tgt, src, src + size);
  }

  load (uri) {
    var t = new Tokenizer();
    var tokens = t.tokenize('', uri);
    console.log(tokens);
    var a = new Assembler();
    this.code = a.asm('', tokens);
    console.log(this.code);
    if (a.errors === 0) {
      this.fn = new Function(['args'], this.code);
    }
  }

  run (...args) {
    if (this.fn) {
      this.fn.apply(this, args);
    }
  }

  stop () { this.halted = true; }

  pause () { this.paused = true; }

  resume () { this.paused = false; }

  tick () {
    for (var k in this.ports) {
      if (!this.halted) {
        this.ports[k].tick();
      }
    }
  }

  beginSequence (start) {
    this._seq = start;
  }

  byte (value) {
    this.stb(this._seq, value);
    this._seq++;
  }

  word (value) {
    this.stw(this._seq, value);
    this._seq += 2;
  }

  dword (value) {
    this.st(this._seq, value);
    this._seq += 4;
  }

  endSequence () {
    this._seq = 0;
  }

}

export default VM
