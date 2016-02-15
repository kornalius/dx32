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
    gen: (a) => { return ['_vm.mem', '[', a, ']']; },
  },
  ldw: {
    expr: true,
    gen: (a) => { return ['_vm.mem.readUInt16LE', '(', a, ')']; },
  },
  ld: {
    expr: true,
    gen: (a) => { return ['_vm.mem.readUInt32LE', '(', a, ')']; },
  },
  lds: {
    expr: true,
    gen: (a) => { return ['_vm.lds', '(', a, ')']; },
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
  call: {
    gen: (a, ...args) => { return ['_vm.' + a + '.apply', '(', 'this', ',', args, ')']; },
  },
  callp: {
    gen: (a, b, ...args) => { return ['_vm.ports[' + a + '].' + b + '.apply', '(', 'this', ',', args, ')']; },
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
    gen: (s, t, sz) => { return ['_vm.copy', '(', s, ',', t, ',', sz ,')']; },
    gen: () => { return ['']; },
  },
  fill: {
    gen: (a, v, sz) => { return ['_vm.fill', '(', a, ',', v, ',', size ,')']; },
  },
  print: {
    gen: () => { return 'console.log', '(' + args.join(', ') + ')'; },
  },
  hlt: {
    gen: (a) => { return ['_vm.hlt', '(', a, ')']; },
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

export var runtime_error = (self, code) => {
  var e = 'Unknown runtime error';
  switch(code) {
    case 0x00:
      e = 'Out of memory';
      break;
  }
  console.error(e);
}

export var is_eos = (t) => {
  return t.type === 'comment' || t.type === 'eol';
}

export var is_symbol = (t) => {
  return t.type === 'comp' || t.type === 'math' || t.type === 'logic' || t.type === 'assign';
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

export var peek_at = (x, type, tokens) => {
  return peek_token(tokens[x], type);
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

export var expected = (self, t, type) => {
  if (!peek_token(t, type)) {
    error(self, t, type + ' expected');
  }
}
