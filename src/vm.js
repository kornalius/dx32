import _ from 'lodash';
import hexy from 'hexy';
import { defaults, opcodes, opcodes_idx, registers, register_names, error, runtime_error, read, write, byte, word, dword } from './globals.js';
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

  constructor (mem_size = defaults.vm.mem_size, stack_size = defaults.vm.stack_size, frame_size = defaults.vm.frame_size) {
    window._vm = this;

    this.ports = {};

    this.mem = null;
    this.mem_size = mem_size;

    this.stack_size = stack_size;
    this.frame_size = frame_size;

    this.top = 0;
    this.bottom = this.mem_size;

    this.avail_mem = this.mem_size;
    this.used_mem = 0;
    this.free_mem = this.mem_size;

    this.ps = 0;
    this.r0 = 0;
    this.r1 = 0;
    this.r2 = 0;
    this.r3 = 0;
    this.pc = 0;
    this.sp = 0;
    this.fp = 0;

    this.org = 0;

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

      this.r0 = 0;
      this.r1 = 0;
      this.r2 = 0;
      this.r3 = 0;
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
    this.start = this.top;

    this.pc = 0;
    this.sp = this.mem_size - this.stack_size;
    this.fp = this.sp - 1;

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

  ldb (addr) { return this.mem[addr]; }
  ldw (addr) { return this.mem.readUInt16LE(addr); }
  ld (addr) { return this.mem.readUInt32LE(addr); }

  stb (addr, value) { this.mem.writeUInt8(addr, value); }
  stw (addr, value) { this.mem.writeUInt16LE(addr, value); }
  st (addr, value) { this.mem.writeUInt32LE(addr, value); }

  pshb (value) { this.mem[this.sp] = value; this.sp++; }
  pshw (value) { this.mem.writeUInt16LE(this.sp, value); this.sp += 2; }
  psh (value) { this.mem.writeUInt32LE(this.sp, value); this.sp += 4; }

  popb () { this.sp--; return this.mem[addr]; }
  popw () { this.sp -= 2; return this.mem.readUInt16LE(this.sp); }
  pop () { this.sp -= 4; return this.mem.readUInt32LE(this.sp); }

  pop2 () { this.sp -= 8; return { a: this.mem.readUInt32LE(this.sp), b: this.mem.readUInt32LE(this.sp + 4) }; }

  swap () { var s1 = this.ld(this.sp - 8); var s2 = this.ld(this.sp - 4); this.st(this.sp - 8, s2); this.st(this.sp - 4, s1); }
  drop () { this.pop(); }
  dup () { this.psh(this.ld(this.sp - 4)); }

  alof (sz) {
    this.fp = this.sp;
    this.mem.copy(this.mem, this.sp, this.pc, sz);
    this.sp += sz;
    this.pc += sz;
  }
  pshf () {
    this.psh(this.fp);
    this.psh(this.r0);
    this.psh(this.r1);
    this.psh(this.r2);
    this.psh(this.r3);
    this.psh(this.pc);
  }
  popf () {
    this.pc = pop();
    this.r3 = pop();
    this.r2 = pop();
    this.r1 = pop();
    this.r0 = pop();
    this.fp = pop();
  }

  gpa (port, offset) { return this.ports[port].top + offset; }
  gfa (offset) { return this.fp + offset; }
  gsa (offset) { return this.sp + offset; }

  read_string (addr) {
    var s = '';
    if (addr >= this.top && addr <= bottom) {
      var c = this.mem[addr++];
      while (addr < this.bottom && c !== 0) {
        s += String.fromCharCode(c);
        c = this.mem[addr++];
      }
    }
    return s;
  }

  load (uri) {
    var t = new Tokenizer();
    var tokens = t.tokenize('', uri);
    console.log(tokens);
    var a = new Assembler();
    a.asm('', tokens);
    console.log(hexy.hexy(a.buffer, { offset: 0, length: 255, display_offset: 0x00, width: 16, caps: 'upper', indent: 2 }));
    a.buffer.copy(this.mem, a.org);
    this.org = a.org;
    return a.org;
  }

  run (addr, ...args) {
    for (var a of args) {
      this.psh_arg(a);
    }
    this.exec(addr);
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

  fetch_op () { return opcodes_idx[this.mem[this.pc++]]; }

  fetch () { return this.ld(this.pc += 4); }

  exec (addr) {
    this.pc = addr;

    while (!this.halted) {
      var i = this.fetch_op();
      if (i && i.fn) {
        i.fn.apply(this);
      }
      else {
        this.hlt(0x03);
        break;
      }
    }
  }

}

export default VM
