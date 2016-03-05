import _ from 'lodash';

export var defaults = {
  vm: {
    mem_size: 512 * 1024,
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

  drive: {
    mem_size: 32 * 1024,
  },

  network: {
    mem_size: 32 * 1024,
  },

  sound: {
    mem_size: 4 * 1024,
  },

  floppy: {
    size:        720 * 1024,
    block_size:  512,
    max_blocks:  1376,
    entry_size:  32,
    max_entries: 1024,
  },

};

export var opcodes = {};

export var error = (self, t, msg) => {
  self.errors++;
  console.error(msg, 'at', t.value, '(' + t.row + ',' + t.col + ')');
};

export var runtime_error = (self, code) => {
  var e = 'Unknown runtime error';
  switch (code)
  {
    case 0x01:
      e = 'Out of memory';
      break;
    case 0x02:
      e = 'Stack underflow';
      break;
    case 0x03:
      e = 'Stack overflow';
      break;
    case 0x04:
      e = 'Invalid stack address';
      break;
    case 0x05:
      e = 'Interrupt already exists';
      break;
    case 0x06:
      e = 'Interrupt not found';
      break;
  }
  console.error(e);
};

export var io_error = (self, code) => {
  var e = 'I/O runtime error';
  switch (code)
  {
    case 0x01:
      e = 'File not found';
      break;
    case 0x02:
      e = 'Cannot open file';
      break;
    case 0x03:
      e = 'Cannot close file';
      break;
    case 0x04:
      e = 'Cannot lock file';
      break;
    case 0x05:
      e = 'Cannot unlock file';
      break;
    case 0x06:
      e = 'Invalid file id';
      break;
    case 0x07:
      e = 'A floppy is already in the drive';
      break;
    case 0x08:
      e = 'No floppy in drive';
      break;
    case 0x09:
      e = 'Cannot delete file';
      break;
    case 0x10:
      e = 'Drive is not spinning';
      break;
  }
  console.error(e);
};

export var comma_array = (args) => {
  var r = [];
  for (var a of args) {
    r.push(a);
    r.push(',');
  }
  r.splice(r.length - 1, 1);
  return r;
};

export var is_eos = (t) => {
  return t.type === 'comment' || t.type === 'eol';
};

export var is_symbol = (t) => {
  return t.type === 'comp' || t.type === 'math' || t.type === 'logic' || t.type === 'assign' || t.type === 'indirectSymbol';
};

export var is_opcode = (t) => {
  return (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null;
};

export var is_digit = (t) => {
  return t.type === 'byte' || t.type === 'word' || t.type === 'dword';
};

export var is_string = (t) => {
  return t.type === 'string';
};

export var is_value = (t) => {
  return is_digit(t) || is_string(t);
};

var peek_token = (p, type) => {
  if (_.isString(type)) {
    if (type === 'opcode') {
      return is_opcode(p);
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
    return p.type === type || p.value === type;
  }

  else if (_.isNumber(type)) {
    return p.value === type;
  }

  else if (_.isRegExp(type)) {
    return p.type.match(type) || p.value.match(type);
  }

  else if (_.isArray(type)) {
    for (var a of type) {
      if (p.type === a || p.value === a) {
        return true;
      }
    }
    return false;
  }

  else if (_.isFunction(type)) {
    return type(p);
  }

  return false;
};

export var peek_at = (x, type, tokens) => {
  return peek_token(tokens[x], type);
};

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
};

export var expected = (self, t, type) => {
  if (!peek_token(t, type)) {
    error(self, t, type + ' expected');
    return false;
  }
  return true;
};

export var codify = (args) => {
  var r = [];
  if (!_.isArray(args)) {
    args = [args];
  }
  for (var a of args) {
    if (a.type) {
      if (is_string(a)) {
        r.push('"' + a.value + '"');
      }
      else {
        r.push(a.value);
      }
    }
    else if (_.isArray(a)) {
      r = r.concat(codify(a));
    }
    else {
      r.push(a);
    }
  }
  return r;
};

export var mixin = (proto, ...mixins) => {
  mixins.forEach((mixin) => {
    Object.getOwnPropertyNames(mixin).forEach((key) => {
      if (key !== 'constructor') {
        let descriptor = Object.getOwnPropertyDescriptor(mixin, key);
        Object.defineProperty(proto, key, descriptor);
      }
    });
  });
};

export var rnd = (min, max) => { return Math.trunc(Math.random() * (max - min) + min); };

export var delay = (ms) => {
  var t = performance.now();
  while (performance.now() - t <= ms) {
    PIXI.ticker.shared.update();
  }
};

export var bufferToString = (b) => {
  var len = b.length;
  var i = 0;
  var s = '';
  while (i < len) {
    s += b[i++].toString(16);
  }
  return s;
};

export var stringToBuffer = (str) => {
  var len = str.length;
  var i = 0;
  var b = new Buffer(Math.trunc(str.length / 2));
  var x = 0;
  while (i < len) {
    var hex = str.substr(i, 2);
    b[x++] = parseInt(hex, 16);
    i += 2;
  }
  return b;
};

opcodes = {
  nop: {
    fn: () => {},
  },
  '@': {
    expr: true,
    gen:  (a) => { return ['_vm.mem.readUInt32LE', '(', a, ')']; },
  },
  '>': {
    expr: true,
    gen:  (a, b) => { return [a, '>', b]; },
  },
  '<': {
    expr: true,
    gen:  (a, b) => { return [a, '<', b]; },
  },
  '>=': {
    expr: true,
    gen:  (a, b) => { return [a, '>=', b]; },
  },
  '<=': {
    expr: true,
    gen:  (a, b) => { return [a, '<=', b]; },
  },
  '!=': {
    expr: true,
    gen:  (a, b) => { return [a, '!==', b]; },
  },
  '==': {
    expr: true,
    gen:  (a, b) => { return [a, '===', b]; },
  },
  '+': {
    expr: true,
    gen:  (a, b) => { return [a, '+', b]; },
  },
  '-': {
    expr: true,
    gen:  (a, b) => { return [a, '-', b]; },
  },
  '*': {
    expr: true,
    gen:  (a, b) => { return [a, '*', b]; },
  },
  '/': {
    expr: true,
    gen:  (a, b) => { return [a, '/', b]; },
  },
  '&': {
    expr: true,
    gen:  (a, b) => { return [a, '&', b]; },
  },
  '|': {
    expr: true,
    gen:  (a, b) => { return [a, '|', b]; },
  },
  '^': {
    expr: true,
    gen:  (a, b) => { return [a, '^', b]; },
  },
  '%': {
    expr: true,
    gen:  (a, b) => { return [a, '%', b]; },
  },
  '!': {
    expr: true,
    gen:  (a) => { return ['!' + a]; },
  },
  inc: {
    expr: true,
    gen:  (a) => { return [a + '++']; },
  },
  dec: {
    expr: true,
    gen:  (a) => { return [a + '--']; },
  },
  ldb: {
    expr: true,
    gen:  (a) => { return ['_vm.mem', '[', a, ']']; },
  },
  ldw: {
    expr: true,
    gen:  (a) => { return ['_vm.mem.readUInt16LE', '(', a, ')']; },
  },
  ld: {
    expr: true,
    gen:  (a) => { return ['_vm.mem.readUInt32LE', '(', a, ')']; },
  },
  lds: {
    expr: true,
    gen:  (a) => { return ['_vm.lds', '(', a, ')']; },
  },
  ldl: {
    expr: true,
    gen:  (a, b) => { return ['_vm.ldl', '(', a, ',', b, ')']; },
  },
  stb: {
    gen: (a, b) => { return ['_vm.mem', '[', a, ']', '=', b]; },
  },
  stw: {
    gen: (a, b) => { return ['_vm.mem.writeUInt16LE', '(', b, ',', a, ')']; },
  },
  st: {
    gen: (a, b) => { return ['_vm.mem.writeUInt32LE', '(', b, ',', a, ')']; },
  },
  sts: {
    gen: (a, b) => { return ['_vm.sts', '(', a, ',', b, ')']; },
  },
  stl: {
    gen: (a, b) => { return ['_vm.stl', '(', a, ',', b, ')']; },
  },
  call: {
    gen: (a, ...args) => { return ['_vm.' + a, '(', comma_array(args), ')']; },
  },
  callp: {
    gen: (a, b, ...args) => { return ['_vm.ports[' + a + '].' + b, '(', comma_array(args), ')']; },
  },
  ret: {
    gen: (a) => { return ['return', a]; },
  },
  shl: {
    gen: () => { return ['']; },
  },
  shr: {
    gen: () => { return ['']; },
  },
  rol: {
    gen: () => { return ['']; },
  },
  ror: {
    gen: () => { return ['']; },
  },
  lo: {
    gen: () => { return ['']; },
  },
  hi: {
    gen: () => { return ['']; },
  },
  copy: {
    gen: (s, t, sz) => { return ['_vm.copy', '(', s, ',', t, ',', sz, ')']; },
  },
  fill: {
    gen: (a, v, sz) => { return ['_vm.fill', '(', a, ',', v, ',', sz, ')']; },
  },
  print: {
    gen: (...args) => { return ['console.log', '(', comma_array(args), ')']; },
  },
  hlt: {
    gen: (a) => { return ['_vm.hlt', '(', a || '', ')']; },
  },
  dbg: {
    gen: () => { return ['debugger']; },
  },
  free: {
    gen: (...args) => { return ['_vm.mm.free', '(', comma_array(args), ')']; },
  },
  size: {
    gen: (a) => { return ['_vm.mm.size', '(', a, ')']; },
  },
  dict: {
    gen: (a, ...args) => { return ['_vm.dict.make', '(', a, ',', comma_array(args), ')']; },
  },
  get: {
    gen: (a, b) => { return ['_vm.dict.get', '(', a, ',', b, ')']; },
  },
  set: {
    gen: (a, b, c) => { return ['_vm.dict.set', '(', a, ',', b, ',', c, ')']; },
  },
  mix: {
    gen: (a, ...args) => { return ['_vm.dict.mix', '(', a, ',', comma_array(args), ')']; },
  },
  stk: {
    gen: (a, b, c) => { return ['_vm.stk', '(', a, ',', b, ',', c || 4, ')']; },
  },
  psh: {
    gen: (a, ...args) => { return ['_vm.psh', '(', a, ',', comma_array(args), ')']; },
  },
  pop: {
    expr: true,
    gen:  (a) => { return ['_vm.pop', '(', a, ')']; },
  },
  hex: {
    gen: (a) => { return ['_vm.hex', '(', a, ')']; },
  },
  hex8: {
    gen: (a) => { return ['_vm.hex', '(', a, ',', 8, ')']; },
  },
  hex16: {
    gen: (a) => { return ['_vm.hex', '(', a, ',', 16, ')']; },
  },
  int: {
    gen: (a, b, c) => { return ['_vm.int', '(', a, ',', b, ',', c, ')']; },
  },
  pause_int: {
    gen: (a) => { return ['_vm.pause_int', '(', a, ')']; },
  },
  resume_int: {
    gen: (a) => { return ['_vm.resume_int', '(', a, ')']; },
  },
  stop_int: {
    gen: (a) => { return ['_vm.stop_int', '(', a, ')']; },
  },
};

var x = 0;
for (var k in opcodes) {
  opcodes[k].idx = x++;
}
