import _ from 'lodash'

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
    size: 720 * 1024,
    block_size: 512,
    max_blocks: 1376,
    entry_size: 32,
    max_entries: 1024,
  },

}

export var data_types = {
  i8: 1,
  s8: 1,
  i16: 2,
  s16: 2,
  i32: 4,
  s32: 4,
  f32: 4,
  i64: 8,
  s64: 8,
}

export var data_type_size = name => data_types[name]

export var errors = 0

export var comma_array = args => {
  let r = []
  for (let a of args) {
    r.push(a)
    r.push(',')
  }
  r.splice(r.length - 1, 1)
  return r
}

export var string_buffer = (str, len = 0) => {
  len = len || str.length
  var b = new Buffer(len)
  b.write(str, 0, str.length, 'ascii')
  return b
}

export var _vm_ldb = (bc, signed = false) => '_vm.ldb' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_ldw = (bc, signed = false) => '_vm.ldw' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_ld = (bc, signed = false) => '_vm.ld' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_ldf = (bc, signed = false) => '_vm.ldf' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_ldd = (bc, signed = false) => '_vm.ldd' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_ldl = (bc, signed = false) => '_vm.ldl' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_lds = (bc, signed = false) => '_vm.lds' + (bc ? '_bc' : '') + (signed ? '_s' : '')

export var _vm_stb = (bc, signed = false) => '_vm.stb' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_stw = (bc, signed = false) => '_vm.stw' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_st = (bc, signed = false) => '_vm.st' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_stf = (bc, signed = false) => '_vm.stf' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_std = (bc, signed = false) => '_vm.std' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_stl = (bc, signed = false) => '_vm.stl' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_sts = (bc, signed = false) => '_vm.sts' + (bc ? '_bc' : '') + (signed ? '_s' : '')

export var _vm_db = (bc, signed = false) => '_vm.db' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_dw = (bc, signed = false) => '_vm.dw' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_dl = (bc, signed = false) => '_vm.dl' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_df = (bc, signed = false) => '_vm.df' + (bc ? '_bc' : '') + (signed ? '_s' : '')
export var _vm_dd = (bc, signed = false) => '_vm.dd' + (bc ? '_bc' : '') + (signed ? '_s' : '')

export var _vm_fill = bc => '_vm.fill' + (bc ? '_bc' : '')
export var _vm_copy = bc => '_vm.copy' + (bc ? '_bc' : '')

export var hex = (value, size = 32) => '$' + _.padStart(value.toString(16), Math.trunc(size / 4), '0')

export var opcodes = {
  nop: { fn: () => {} },

  '@': { gen: a => [_vm_ld(defaults.boundscheck), '(', a, ')'], expr: true },
  '>': { gen: (a, b) => [a, '>', b], expr: true },
  '<': { gen: (a, b) => [a, '<', b], expr: true },
  '>=': { gen: (a, b) => [a, '>=', b], expr: true },
  '<=': { gen: (a, b) => [a, '<=', b], expr: true },
  '!=': { gen: (a, b) => [a, '!==', b], expr: true },
  '==': { gen: (a, b) => [a, '===', b], expr: true },
  '+': { gen: (a, b) => [a, '+', b], expr: true },
  '-': { gen: (a, b) => [a, '-', b], expr: true },
  '*': { gen: (a, b) => [a, '*', b], expr: true },
  '/': { gen: (a, b) => [a, '/', b], expr: true },
  '&': { gen: (a, b) => [a, '&', b], expr: true },
  '|': { gen: (a, b) => [a, '|', b], expr: true },
  '^': { gen: (a, b) => [a, '^', b], expr: true },
  '%': { gen: (a, b) => [a, '%', b], expr: true },
  '!': { gen: a => ['!' + a], expr: true },

  inc: { gen: a => [a + '++'], expr: true },
  dec: { gen: a => [a + '--'], expr: true },

  ldb: { gen: a => [_vm_ldb(defaults.boundscheck), '(', a, ')'], expr: true },
  ldw: { gen: a => [_vm_ldw(defaults.boundscheck), '(', a, ')'], expr: true },
  ld: { gen: a => [_vm_ld(defaults.boundscheck), '(', a, ')'], expr: true },
  ldf: { gen: a => [_vm_ldf(defaults.boundscheck), '(', a, ')'], expr: true },
  ldd: { gen: a => [_vm_ldd(defaults.boundscheck), '(', a, ')'], expr: true },
  ldl: { gen: (a, b) => [_vm_ldl(defaults.boundscheck), '(', a, ',', b, ')'], expr: true },
  lds: { gen: a => [_vm_lds(defaults.boundscheck), '(', a, ')'], expr: true },

  lsb: { gen: a => [_vm_ldb(defaults.boundscheck, true), '(', a, ')'], expr: true },
  lsw: { gen: a => [_vm_ldw(defaults.boundscheck, true), '(', a, ')'], expr: true },
  ls: { gen: a => [_vm_ld(defaults.boundscheck, true), '(', a, ')'], expr: true },
  lsd: { gen: a => [_vm_ldd(defaults.boundscheck, true), '(', a, ')'], expr: true },

  stb: { gen: (a, b) => [_vm_stb(defaults.boundscheck), '(', a, ',', b, ')'] },
  stw: { gen: (a, b) => [_vm_stw(defaults.boundscheck), '(', a, ',', b, ')'] },
  st: { gen: (a, b) => [_vm_st(defaults.boundscheck), '(', a, ',', b, ')'] },
  std: { gen: (a, b) => [_vm_std(defaults.boundscheck), '(', a, ',', b, ')'] },
  stf: { gen: (a, b) => [_vm_stf(defaults.boundscheck), '(', a, ',', b, ')'] },
  stl: { gen: (a, b) => [_vm_stl(defaults.boundscheck), '(', a, ',', b, ')'] },
  sts: { gen: (a, b) => [_vm_sts(defaults.boundscheck), '(', a, ',', b, ')'] },

  ssb: { gen: (a, b) => [_vm_stb(defaults.boundscheck, true), '(', a, ',', b, ')'] },
  ssw: { gen: (a, b) => [_vm_stw(defaults.boundscheck, true), '(', a, ',', b, ')'] },
  ss: { gen: (a, b) => [_vm_st(defaults.boundscheck, true), '(', a, ',', b, ')'] },
  ssd: { gen: (a, b) => [_vm_std(defaults.boundscheck, true), '(', a, ',', b, ')'] },

  call: { gen: (a, ...args) => ['_vm.' + a, '(', comma_array(args), ')'] },
  callp: { gen: (a, b, ...args) => ['_vm.ports[' + a + '].publics.' + b + '.call', '(', comma_array(['_vm.ports[' + a + ']', ...args]), ')'] },
  ret: { gen: a => ['return', a] },

  shl: { gen: () => [''] },
  shr: { gen: () => [''] },

  rol: { gen: () => [''] },
  ror: { gen: () => [''] },

  lo: { gen: () => [''] },
  hi: { gen: () => [''] },

  ord: { gen: a => [a + '.toString().charCodeAt[0]'] },
  chr: { gen: a => ['String.fromCharCode', '(', a, ')'] },

  copy: { gen: (s, t, sz) => [_vm_copy(defaults.boundscheck), '(', s, ',', t, ',', sz, ')'] },
  fill: { gen: (a, v, sz) => [_vm_fill(defaults.boundscheck), '(', a, ',', v, ',', sz, ')'] },

  print: { gen: (...args) => ['console.log', '(', comma_array(args), ')'] },

  free: { gen: (...args) => ['_vm.free', '(', comma_array(args), ')'] },
  size: { gen: a => ['_vm.size', '(', a, ')'] },

  struct: { gen: (a, ...args) => ['_vm.struct_make', '(', a, ',', comma_array(args), ')'] },
  get: { gen: (a, b) => ['_vm.struct_get', '(', a, ',', b, ')'] },
  set: { gen: (a, b, c) => ['_vm.struct_set', '(', a, ',', b, ',', c, ')'] },
  mix: { gen: (a, ...args) => ['_vm.struct_mix', '(', a, ',', comma_array(args), ')'] },

  stk: { gen: (a, b, c) => ['_vm.stack', '(', a, ',', b, ',', c || '\'i32\'', ')'] },
  psh: { gen: (a, ...args) => ['_vm.push', '(', a, ',', comma_array(args), ')'] },
  pop: { gen: a => ['_vm.pop', '(', a, ')'], expr: true },

  hex: { gen: a => ['_vm.hex', '(', a, ')'] },
  hex8: { gen: a => ['_vm.hex', '(', a, ',', 8, ')'] },
  hex16: { gen: a => ['_vm.hex', '(', a, ',', 16, ')'] },

  int_start: { gen: (a, b, c) => ['_vm.int_create', '(', a, ',', b, ',', c, ')'] },
  int_pause: { gen: a => ['_vm.int_pause', '(', a, ')'] },
  int_resume: { gen: a => ['_vm.int_resume', '(', a, ')'] },
  int_stop: { gen: a => ['_vm.int_stop', '(', a, ')'] },

  hlt: { gen: a => ['_vm.hlt', '(', a || '', ')'] },
  brk: { gen: () => ['_vm.dbg_brk', '(', ')'] },
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
      e = 'Interrupt already exists'
      break
    case 0x06:
      e = 'Interrupt not found'
      break
  }
  debugger;
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

export var rnd = (min, max) => { return Math.trunc(Math.random() * (max - min) + min) }

export var delay = ms => {
  let t = performance.now()
  while (performance.now() - t <= ms) {
    PIXI.ticker.shared.update()
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
