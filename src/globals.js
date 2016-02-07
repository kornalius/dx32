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

  disk: {
    mem_size: 32 * 1024,
  },

  network: {
    mem_size: 32 * 1024,
  },

}

export var opcodes = {
  nop: {
    fn: () => {},
  },
  '>': {
    expr: true,
    gen: (a, b) => { return [a, '>', b]; },
  },
  '<': {
    expr: true,
    gen: (a, b) => { return [a, '<', b]; },
  },
  '>=': {
    expr: true,
    gen: (a, b) => { return [a, '>=', b]; },
  },
  '<=': {
    expr: true,
    gen: (a, b) => { return [a, '<=', b]; },
  },
  '!=': {
    expr: true,
    gen: (a, b) => { return [a, '!==', b]; },
  },
  '==': {
    expr: true,
    gen: (a, b) => { return [a, '===', b]; },
  },
  '+': {
    expr: true,
    gen: (a, b) => { return [a, '+', b]; },
  },
  '-': {
    expr: true,
    gen: (a, b) => { return [a, '-', b]; },
  },
  '*': {
    expr: true,
    gen: (a, b) => { return [a, '*', b]; },
  },
  '/': {
    expr: true,
    gen: (a, b) => { return [a, '/', b]; },
  },
  '&': {
    expr: true,
    gen: (a, b) => { return [a, '&', b]; },
  },
  '|': {
    expr: true,
    gen: (a, b) => { return [a, '|', b]; },
  },
  '^': {
    expr: true,
    gen: (a, b) => { return [a, '^', b]; },
  },
  '%': {
    expr: true,
    gen: (a, b) => { return [a, '%', b]; },
  },
  '!': {
    expr: true,
    gen: (a) => { return ['!' + b]; },
  },
  inc: {
    expr: true,
    gen: (a) => { return [a + '++']; },
  },
  dec: {
    expr: true,
    gen: (a) => { return [a + '--']; },
  },
  ldb: {
    expr: true,
    gen: (a) => { return ['this.mem[' + a + ']']; },
  },
  ldw: {
    expr: true,
    gen: (a) => { return ['this.mem.readUInt16LE(' + a + ')']; },
  },
  ld: {
    expr: true,
    gen: (a) => { return ['this.mem.readUInt32LE(' + a + ')']; },
  },
  stb: {
    gen: (a, b) => { return ['this.mem[' + a + '] = b']; },
  },
  stw: {
    gen: (a, b) => { return ['this.mem.writeUInt16LE(' + b + ', ' + a + ')']; },
  },
  st: {
    gen: (a, b) => { return ['this.mem.writeUInt32LE(' + b + ', ' + a + ')']; },
  },
  call: {
    gen: (a, ...args) => { return ['this.' + a + '.apply(this, ' + args.join(', ') + ')']; },
  },
  callp: {
    gen: (a, b, ...args) => { return ['this.ports[' + a + '].' + b + '.apply(this, ' + args.join(', ') + ')']; },
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
    gen: () => { return ['']; },
  },
  fill: {
    gen: () => { return ['']; },
  },
  print: {
    gen: () => { return 'console.log(' + args.join(', ') + ')'; },
  },
};

var x = 0;
for (var k in opcodes) {
  opcodes[k].idx = x++;
}

export var error = (self, t, msg) => {
  self.errors++;
  console.error(msg, 'at', t.value, '(' + t.row + ',' + t.col + ')');
}

export var is_eos = (t) => {
  return t.type === 'comment' || t.type === 'eol';
}

export var is_symbol = (t) => {
  return t.type === 'comp' || t.type === 'math' || t.type === 'logic';
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
