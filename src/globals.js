import _ from 'lodash'
import { comma_array } from './compiler/codegen.js'


export var defaults = {
  boundscheck: false,

  type: 'i32',

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
    mem_size: 4 * 1024,
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
    size: 720 * 1024,
    block_size: 512,
    max_blocks: 1376,
    entry_size: 32,
    max_entries: 1024,
  },

}

export var sbc = (name, bc = false) => name + (bc ? '_bc' : '')

export var define_to_data_type = def_name => {
  switch (def_name) {
    case 'db': return 'i8'
    case 'db.s': return 's8'
    case 'dw': return 'i16'
    case 'dw.s': return 's16'
    case 'dd': return 'i32'
    case 'dd.s': return 's32'
    case 'df': return 'f32'
    default: return null
  }
}

export var errors = 0

export var opcodes = {
  nop: { fn: () => {} },

  // Comp

  '>': { gen: (a, b) => [a, '>', b], expr: true },
  '<': { gen: (a, b) => [a, '<', b], expr: true },
  '>=': { gen: (a, b) => [a, '>=', b], expr: true },
  '<=': { gen: (a, b) => [a, '<=', b], expr: true },
  '!=': { gen: (a, b) => [a, '!==', b], expr: true },
  '==': { gen: (a, b) => [a, '===', b], expr: true },


  // Logic

  '&': { gen: (a, b) => [a, '&', b], expr: true },
  '|': { gen: (a, b) => [a, '|', b], expr: true },
  '^': { gen: (a, b) => [a, '^', b], expr: true },
  '%': { gen: (a, b) => [a, '%', b], expr: true },
  '!': { gen: a => ['!' + a], expr: true },


  // Math

  '+': { gen: (a, b) => [a, '+', b], expr: true },
  '-': { gen: (a, b) => [a, '-', b], expr: true },
  '*': { gen: (a, b) => [a, '*', b], expr: true },
  '/': { gen: (a, b) => [a, '/', b], expr: true },

  inc: { gen: a => [a + '++'], expr: true },
  dec: { gen: a => [a + '--'], expr: true },

  shl: { gen: () => [''], expr: true },
  shr: { gen: () => [''], expr: true },

  rol: { gen: () => [''], expr: true },
  ror: { gen: () => [''], expr: true },

  lob: { gen: () => [''], expr: true },
  low: { gen: () => [''], expr: true },
  lo: { gen: () => [''], expr: true },
  hib: { gen: () => [''], expr: true },
  hiw: { gen: () => [''], expr: true },
  hi: { gen: () => [''], expr: true },

  max: { gen: (a, b) => ['Math.max', '(', a, ',', b, ')'], expr: true },
  min: { gen: (a, b) => ['Math.min', '(', a, ',', b, ')'], expr: true },
  abs: { gen: a => ['Math.abs', '(', a, ')'], expr: true },
  cos: { gen: a => ['Math.cos', '(', a, ')'], expr: true },
  acos: { gen: a => ['Math.acos', '(', a, ')'], expr: true },
  sin: { gen: a => ['Math.sin', '(', a, ')'], expr: true },
  asin: { gen: a => ['Math.asin', '(', a, ')'], expr: true },
  tan: { gen: a => ['Math.tan', '(', a, ')'], expr: true },
  atan: { gen: a => ['Math.atan', '(', a, ')'], expr: true },
  exp: { gen: a => ['Math.exp', '(', a, ')'], expr: true },
  floor: { gen: a => ['Math.floor', '(', a, ')'], expr: true },
  ceil: { gen: a => ['Math.ceil', '(', a, ')'], expr: true },
  round: { gen: a => ['Math.round', '(', a, ')'], expr: true },
  rnd: { gen: (a, b) => ['_.random', '(', a, ',', b, ')'], expr: true },
  clamp: { gen: (a, b, c) => ['_.clamp', '(', a, ',', b, ',', c, ')'], expr: true },


  // String

  lds: { gen: (a, b) => [sbc('_vm.lds', defaults.boundscheck), '(', a, ',', b, ')'], expr: true },
  sts: { gen: (a, b, c) => [sbc('_vm.sts', defaults.boundscheck), '(', a, ',', b, ',', c, ')'] },

  lens: { gen: a => [sbc('_vm.lds', defaults.boundscheck), '(', a, ')', '.length'], expr: true },
  subs: { gen: (a, b, c) => [sbc('_vm.lds', defaults.boundscheck), '(', a, ')', '.substr', '(', b, ',', c, ')'], expr: true },
  lows: { gen: a => ['_.lowerCase', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  upps: { gen: a => ['_.upperCase', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  caps: { gen: a => ['_.capitalize', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  cmls: { gen: a => ['_.camelCase', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  snks: { gen: a => ['_.snakeCase', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  pads: { gen: (a, b, c) => ['_.pad', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ',', b, ',', c, ')'], expr: true },
  lpads: { gen: a => ['_.padStart', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  rpads: { gen: a => ['_.padEnd', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ')'], expr: true },
  reps: { gen: (a, b) => ['_.repeat', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ',', b, ')'], expr: true },
  repls: { gen: (a, b, c) => ['_.replace', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ',', b, ',', c, ')'], expr: true },
  truncs: { gen: (a, b) => ['_.truncate', '(', sbc('_vm.lds', defaults.boundscheck), '(', a, ')', ',', b, ')'], expr: true },

  ord: { gen: a => [a + '.toString().charCodeAt[0]'], expr: true },
  chr: { gen: a => ['String.fromCharCode', '(', a, ')'], expr: true },

  hex: { gen: a => ['_vm.hex', '(', a, ')'], expr: true },
  hex8: { gen: a => ['_vm.hex', '(', a, ',', 8, ')'], expr: true },
  hex16: { gen: a => ['_vm.hex', '(', a, ',', 16, ')'], expr: true },

  print: { gen: (...args) => ['console.log', '(', comma_array(args), ')'] },


  // Memory

  '@': { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'i32\'', ',', a, ')'], expr: true },

  ldb: { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'i8\'', ',', a, ')'], expr: true },
  'ldb.s': { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'s8\'', ',', a, ')'], expr: true },
  ldw: { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'i16\'', ',', a, ')'], expr: true },
  'ldw.s': { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'s16\'', ',', a, ')'], expr: true },
  ld: { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'i32\'', ',', a, ')'], expr: true },
  'ld.s': { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'s32\'', ',', a, ')'], expr: true },
  ldf: { gen: a => [sbc('_vm.ld', defaults.boundscheck), '(', '\'f32\'', ',', a, ')'], expr: true },
  ldl: { gen: (a, b) => [sbc('_vm.ldl', defaults.boundscheck), '(', a, ',', b, ')'], expr: true },

  stb: { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'i8\'', ',', a, ',', b, ')'] },
  'stb.s': { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'s8\'', ',', a, ',', b, ')'] },
  stw: { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'i16\'', ',', a, ',', b, ')'] },
  'stw.s': { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'s16\'', ',', a, ',', b, ')'] },
  st: { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'i32\'', ',', a, ',', b, ')'] },
  'st.s': { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'s32\'', ',', a, ',', b, ')'] },
  stf: { gen: (a, b) => [sbc('_vm.st', defaults.boundscheck), '(', '\'f32\'', ',', a, ',', b, ')'] },
  stl: { gen: (a, b) => [sbc('_vm.stl', defaults.boundscheck), '(', a, ',', b, ')'] },

  copy: { gen: (s, b, c) => [sbc('_vm.copy', defaults.boundscheck), '(', s, ',', b, ',', c, ')'] },
  fill: { gen: (a, b, c) => [sbc('_vm.fill', defaults.boundscheck), '(', a, ',', b, ',', c, ')'] },

  free: { gen: (...args) => ['_vm.free', '(', comma_array(args), ')'] },
  type: { gen: a => ['_vm.type', '(', a, ')'], expr: true },
  size: { gen: a => ['_vm.size', '(', a, ')'], expr: true },


  // Stack

  stk: { gen: (a, b, c, d, e) => ['_vm.stk_new', '(', a, ',', b, ',', c || '\'' + defaults.type + '\'', ',', d || 0, ',', e, ')'] },
  psh: { gen: (a, ...args) => ['_vm.stk_push', '(', a, ',', comma_array(args), ')'] },
  pop: { gen: a => ['_vm.stk_pop', '(', a, ')'], expr: true },
  'stk.used': { gen: a => ['_vm.stk_used', '(', a, ')'], expr: true },
  'stk.max': { gen: a => ['_vm.stk_max', '(', a, ')'], expr: true },
  'stk.esize': { gen: a => ['_vm.stk_esize', '(', a, ')'], expr: true },
  'stk.etype': { gen: a => ['_vm.stk_etype', '(', a, ')'], expr: true },


  // Interpreter

  call: { gen: (a, ...args) => ['_vm.' + a, '(', comma_array(args), ')'] },
  callp: { gen: (a, b, ...args) => ['_vm.ports[' + a + '].publics.' + b + '.call', '(', comma_array(['_vm.ports[' + a + ']', ...args]), ')'] },

  ret: { gen: a => ['return', a] },

  hlt: { gen: a => ['_vm.hlt', '(', a || '', ')'] },
  brk: { gen: () => ['_vm.dbg_brk', '(', ')'] },

  wait: { gen: a => ['_vm.wait', '(', a, ')'] },


  // Interrupts

  'int.start': { gen: (a, b, c) => ['_vm.int_create', '(', a, ',', b, ',', c, ')'] },
  'int.pause': { gen: a => ['_vm.int_pause', '(', a, ')'] },
  'int.resume': { gen: a => ['_vm.int_resume', '(', a, ')'] },
  'int.stop': { gen: a => ['_vm.int_stop', '(', a, ')'] },
}

var x = 0
for (var k in opcodes) {
  opcodes[k].idx = x++
}

export var error = (t, msg) => {
  debugger
  errors++
  console.error(msg, 'at', t.value, '(' + t.row + ',' + t.col + ')')
}

export var runtime_error = code => {
  let e = 'Unknown runtime error'
  switch (code) {
    case 0x01:
      e = 'Out of memory'
      break
    case 0x02:
      e = 'Stack underflow'
      break
    case 0x03:
      e = 'Stack overflow'
      break
    case 0x04:
      e = 'Invalid stack address'
      break
    case 0x05:
      e = 'Stack address already assigned'
      break
    case 0x06:
      e = 'Interrupt already exists'
      break
    case 0x07:
      e = 'Interrupt not found'
      break
    case 0x08:
      e = 'Address out of bounds'
      break
  }
  console.error(e)
}

export var io_error = code => {
  let e = 'I/O runtime error'
  switch (code) {
    case 0x01:
      e = 'File not found'
      break
    case 0x02:
      e = 'Cannot open file'
      break
    case 0x03:
      e = 'Cannot close file'
      break
    case 0x04:
      e = 'Cannot lock file'
      break
    case 0x05:
      e = 'Cannot unlock file'
      break
    case 0x06:
      e = 'Invalid file id'
      break
    case 0x07:
      e = 'A floppy is already in the drive'
      break
    case 0x08:
      e = 'No floppy in drive'
      break
    case 0x09:
      e = 'Cannot delete file'
      break
    case 0x10:
      e = 'Drive is not spinning'
      break
  }
  console.error(e)
}

export var mixin = (proto, ...mixins) => {
  mixins.forEach(mixin => {
    Object.getOwnPropertyNames(mixin).forEach(key => {
      if (key !== 'constructor') {
        let descriptor = Object.getOwnPropertyDescriptor(mixin, key)
        Object.defineProperty(proto, key, descriptor)
      }
    })
  })
}

export var delay = ms => {
  // setTimeout(() => {}, ms)
  let t = performance.now()
  let c = t
  while (c - t <= ms) {
    PIXI.ticker.shared.update(c)
    c = performance.now()
  }
}

export var buffer_to_string = b => {
  let len = b.length
  let i = 0
  let s = ''
  while (i < len) {
    s += b[i++].toString(16)
  }
  return s
}

export var string_to_buffer = str => {
  let len = str.length
  let i = 0
  let b = new Buffer(Math.trunc(str.length / 2))
  let x = 0
  while (i < len) {
    let hex = str.substr(i, 2)
    b[x++] = parseInt(hex, 16)
    i += 2
  }
  return b
}

export var string_buffer = (str, len = 0) => {
  len = len || str.length
  var b = new Buffer(len)
  b.write(str, 0, str.length, 'ascii')
  return b
}
