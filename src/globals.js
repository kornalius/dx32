export var defaults = {
  vm: {
    mem_size: 512 * 1024,
    stack_size: 8092,
    frame_size: 128,
  },

  port: {
    mem_size: 64 * 1024,
  },

  cpu: {
    mem_size: 4 * 1024,
  },

  video: {
    mem_size: 256 * 1024,
  },

  keyboard: {
    mem_size: 4 * 1024,
  },

  mouse: {
    mem_size: 8 * 1024,
  },

  disk: {
    mem_size: 32 * 1024,
  },

  network: {
    mem_size: 32 * 1024,
  },

}

export var registers = {
  r0: 1,
  r1: 2,
  r2: 3,
  r3: 4,
  pc: 5,
  sp: 6,
  fp: 7,
};

export var opcodes = {
  'nop': {
    fn: () => {},
  },
  '>': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a > v.b); },
  },
  '<': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a < v.b); },
  },
  '>=': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a >= v.b); },
  },
  '<=': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a <= v.b); },
  },
  '!=': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a !== v.b); },
  },
  '==': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a === v.b); },
  },
  '+': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a + v.b); },
  },
  '-': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a - v.b); },
  },
  '*': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a * v.b); },
  },
  '/': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a / v.b); },
  },
  '&': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a & v.b); },
  },
  '|': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a | v.b); },
  },
  '^': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a ^ v.b); },
  },
  '%': {
    expr: true,
    fn: () => { var v = this.pop2(); this.psh(v.a % v.b); },
  },
  '!': {
    expr: true,
    fn: () => { this.st(this.sp - 4, !this.ld(this.sp - 4)); },
  },
  inc: {
    expr: true,
    arg_size: 4,
    fn: () => {
      var a = this.pop();
      var v = this.ld(a) + 1;
      this.st(a, v);
      this.psh(v);
    },
  },
  dec: {
    expr: true,
    arg_size: 4,
    fn: () => {
      var a = this.pop();
      var v = this.ld(a) - 1;
      this.st(a, v);
      this.psh(v);
    },
  },
  incr: {
    expr: true,
    arg_size: 1,
    fn: () => {
      var r = this.reg_names[this.mem[this.pc++]];
      this.psh(this[r]++);
    },
  },
  decr: {
    expr: true,
    arg_size: 1,
    fn: () => {
      var r = this.reg_names[this.mem[this.pc++]];
      this.psh(this[r]--);
    },
  },
  ldb: {
    fn: () => { this.psh(this.ldb(this.pop())); },
  },
  ldw: {
    fn: () => { this.psh(this.ldw(this.pop())); },
  },
  ld: {
    fn: () => { this.psh(this.ld(this.pop())); },
  },
  stb: {
    fn: () => { var v = this.pop2(); this.stb(v.a, v.b); },
  },
  stw: {
    fn: () => { var v = this.pop2(); this.stw(v.a, v.b); },
  },
  st: {
    fn: () => { var v = this.pop2(); this.st(v.a, v.b); },
  },
  jmp: {
    arg_size: 4,
    fn: () => { this.pc = this.fetch(); },
  },
  jmpt: {
    arg_size: 4,
    fn: () => { if (this.pop()) { this.pc = this.fetch(); } },
  },
  jmpf: {
    arg_size: 4,
    fn: () => { if (!this.pop()) { this.pc = this.fetch(); } },
  },
  call: {
    arg_size: 4,
    fn: () => { this.exec(this.fetch()); },
  },
  callp: {
    fn: () => { var v = this.pop2(); this.ports[v.a].fns[v.b].apply(this); },
  },
  ret: {
    fn: () => { },
  },
  gpa: {
    fn: () => { var v = this.pop2(); this.gpa(v.a, v.b); },
  },
  gfa: {
    fn: () => { this.gfa(this.pop()); },
  },
  gsa: {
    fn: () => { this.gsa(this.pop()); },
  },
  psh: {
    arg_size: 4,
    fn: () => { this.psh(this.fetch()); },
  },
  pshl: {
    arg_size: 4,
    fn: () => { this.psh(this.rd(this.fp + this.fetch())); },
  },
  pshg: {
    arg_size: 4,
    fn: () => { this.psh(this.rd(this.fetch())); },
  },
  pshr: {
    fn: () => { this.psh(this[this.reg_names[reg()]]); },
  },
  pshf: {
    fn: () => { this.pshf(); },
  },
  alof: {
    arg_size: 4,
    fn: () => { this.alof(this.fetch()); },
  },
  pop: {
    arg_size: 4,
    fn: () => { this.st(this.fetch(), this.pop()); },
  },
  popl: {
    arg_size: 4,
    fn: () => { this.st(this.fp + this.fetch(), this.pop()); },
  },
  popg: {
    arg_size: 4,
    fn: () => { this.st(this.fetch(), this.pop()); },
  },
  popr: {
    arg_size: 1,
    fn: () => { this[this.reg_names[reg()]] = this.pop(); },
  },
  popf: {
    fn: () => { this.popf(); },
  },
  swap: {
    fn: () => { this.swap(); },
  },
  drop: {
    fn: () => { this.drop(); },
  },
  dup: {
    fn: () => { this.dup(); },
  },
  shl: {
    fn: null,
  },
  shr: {
    fn: null,
  },
  rol: {
    fn: null,
  },
  ror: {
    fn: null,
  },
  lo: {
    fn: null,
  },
  hi: {
    fn: null,
  },
  copy: {
    fn: null,
  },
  fill: {
    fn: null,
  },
  print: {
    fn: () => { console.log(this.read_string(this.pop())); },
  },
};

var x = 0;
for (var k in opcodes) {
  opcodes[k].idx = x++;
}

export var opcodes_idx = {};
for (var k in opcodes) {
  var o = opcodes[k];
  o.name = k;
  opcodes_idx[o.idx] = o;
}

export var reg_names = {};
for (var k in registers) {
  reg_names[registers[k]] = k;
}

export var vm_codes = {
  0x01: 'Fatal exception error',
  0x02: 'Out of bounds error',
  0x03: 'Invalid instruction code error',
  0x04: 'Invalid function address error',
  0x05: 'Out of memory error',
  0x06: 'Stack pointer out of bounds error',
  0x07: 'Frame pointer out of bounds error',
  0x08: 'Instruction pointer out of bounds error',
}

export var error = (self, t, msg) => {
  self.errors++;
  console.error(msg, 'at', t.value, '(' + t.row + ',' + t.col + ')');
}

export var runtime_error = (vm, code) => {
  console.error(vm_codes[code]);
}

export var is_eos = (t) => {
  return t.type === 'comment' || t.type === 'eol';
}

export var is_symbol = (t) => {
  return t.type === 'comp' || t.type === 'math' || t.type === 'logic';
}

export var is_register = (t) => {
  return t.type === 'id' ? registers[t.value.toLowerCase()] || 0 : 0;
}

export var is_opcode = (t) => {
  return (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null;
}

export var is_digit = (t) => {
  return t.type === 'byte' || t.type === 'word' || t.type === 'dword';
}

export var is_string = (t) => {
  return t.type === 'string';
}

export var is_value = (t) => {
  return is_digit(t) || is_string(t);
}

export var peek_at = (x, type, tokens) => {
  var p = tokens[x];

  if (_.isString(type)) {
    if (type === 'opcode') {
      return is_opcode(p);
    }
    else if (type === 'register') {
      return is_register(p);
    }
    else if (type === 'symbol') {
      return is_symbol(p);
    }
    else if (type === 'digit') {
      return is_digit(p);
    }
    else if (type === 'value') {
      return is_value(p);
    }
    return p.type === type;
  }

  else if (_.isNumber(type)) {
    return p.value === type;
  }

  else if (_.isRegExp(type)) {
    return p.value.match(type);
  }

  else if (_.isArray(type)) {
    for (var a of type) {
      if (p.type === a) {
        return true;
      }
    }
    return false;
  }

  else if (_.isFunction(type)) {
    return type(t);
  }

  return false;
}

export var peeks_at = (x, arr, tokens) => {
  var len = tokens.length;
  var ax = 0;
  var alen = arr.length;
  while (x < len && ax < alen) {
    if (!peek_at(x++, arr[ax++], tokens)) {
      return false;
    }
  }
  return true;
}

export var byte = (buffer, value, offset) => {
  buffer.writeUInt8(value, offset);
}

export var word = (buffer, value, offset) => {
  buffer.writeUInt16LE(value, offset);
}

export var dword = (buffer, value, offset) => {
  buffer.writeUInt32LE(value, offset);
}

export var read = (buffer, addr, sz) => {
  switch(sz) {
    case 1:
      return buffer[addr];
    case 2:
      return buffer.readUInt16LE(addr);
    case 4:
      return buffer.readUInt32LE(addr);
    default:
      var b = new Buffer(sz);
      buffer.copy(b, addr, 0, sz);
      return b;
  }
}

export var write = (buffer, value, addr, sz) => {
  switch(sz) {
    case 1:
      buffer[addr] = value;
      break;
    case 2:
      buffer.writeUInt16LE(value, addr);
      break;
    case 4:
      buffer.writeUInt32LE(value, addr);
      break;
    default:
      if (_.isString(value)) {
        buffer.write(value, addr, sz || value.length, 'ascii');
      }
      else if (Buffer.isBuffer(value)) {
        value.copy(buffer, addr, 0, sz || value.length);
      }
      break;
  }
}
