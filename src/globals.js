import _ from 'lodash'


export var errors = 0

export var opcodes = {
  nop: {
    fn: () => {},
  },
  '@': {
    expr: true,
    gen: (a) => { return [_vm_ld(), '(', a, ')'] },
  },
  '>': {
    expr: true,
    gen: (a, b) => { return [a, '>', b] },
  },
  '<': {
    expr: true,
    gen: (a, b) => { return [a, '<', b] },
  },
  '>=': {
    expr: true,
    gen: (a, b) => { return [a, '>=', b] },
  },
  '<=': {
    expr: true,
    gen: (a, b) => { return [a, '<=', b] },
  },
  '!=': {
    expr: true,
    gen: (a, b) => { return [a, '!==', b] },
  },
  '==': {
    expr: true,
    gen: (a, b) => { return [a, '===', b] },
  },
  '+': {
    expr: true,
    gen: (a, b) => { return [a, '+', b] },
  },
  '-': {
    expr: true,
    gen: (a, b) => { return [a, '-', b] },
  },
  '*': {
    expr: true,
    gen: (a, b) => { return [a, '*', b] },
  },
  '/': {
    expr: true,
    gen: (a, b) => { return [a, '/', b] },
  },
  '&': {
    expr: true,
    gen: (a, b) => { return [a, '&', b] },
  },
  '|': {
    expr: true,
    gen: (a, b) => { return [a, '|', b] },
  },
  '^': {
    expr: true,
    gen: (a, b) => { return [a, '^', b] },
  },
  '%': {
    expr: true,
    gen: (a, b) => { return [a, '%', b] },
  },
  '!': {
    expr: true,
    gen: (a) => { return ['!' + a] },
  },
  inc: {
    expr: true,
    gen: (a) => { return [a + '++'] },
  },
  dec: {
    expr: true,
    gen: (a) => { return [a + '--'] },
  },
  ldb: {
    expr: true,
    gen: (a) => { return [_vm_ldb(), '(', a, ')'] },
  },
  ldw: {
    expr: true,
    gen: (a) => { return [_vm_ldw(), '(', a, ')'] },
  },
  ld: {
    expr: true,
    gen: (a) => { return [_vm_ld(), '(', a, ')'] },
  },
  lds: {
    expr: true,
    gen: (a) => { return [_vm_lds(), '(', a, ')'] },
  },
  ldl: {
    expr: true,
    gen: (a, b) => { return [_vm_ldl(), '(', a, ',', b, ')'] },
  },
  stb: {
    gen: (a, b) => { return [_vm_stb(), '(', a, ',', b, ')'] },
  },
  stw: {
    gen: (a, b) => { return [_vm_stw(), '(', a, ',', b, ')'] },
  },
  st: {
    gen: (a, b) => { return [_vm_st(), '(', a, ',', b, ')'] },
  },
  sts: {
    gen: (a, b) => { return [_vm_sts(), '(', a, ',', b, ')'] },
  },
  stl: {
    gen: (a, b) => { return [_vm_stl(), '(', a, ',', b, ')'] },
  },
  call: {
    gen: (a, ...args) => { return ['_vm.' + a, '(', comma_array(args), ')'] },
  },
  callp: {
    gen: (a, b, ...args) => { return ['_vm.ports[' + a + '].' + b, '(', comma_array(args), ')'] },
  },
  ret: {
    gen: (a) => { return ['return', a] },
  },
  shl: {
    gen: () => { return [''] },
  },
  shr: {
    gen: () => { return [''] },
  },
  rol: {
    gen: () => { return [''] },
  },
  ror: {
    gen: () => { return [''] },
  },
  lo: {
    gen: () => { return [''] },
  },
  hi: {
    gen: () => { return [''] },
  },
  copy: {
    gen: (s, t, sz) => { return [_vm_copy(), '(', s, ',', t, ',', sz, ')'] },
  },
  fill: {
    gen: (a, v, sz) => { return [_vm_fill(), '(', a, ',', v, ',', sz, ')'] },
  },
  print: {
    gen: (...args) => { return ['console.log', '(', comma_array(args), ')'] },
  },
  hlt: {
    gen: (a) => { return ['_vm.hlt', '(', a || '', ')'] },
  },
  free: {
    gen: (...args) => { return ['_vm.mm.free', '(', comma_array(args), ')'] },
  },
  size: {
    gen: (a) => { return ['_vm.mm.size', '(', a, ')'] },
  },
  union: {
    gen: (a, ...args) => { return ['_vm.union.make', '(', a, ',', comma_array(args), ')'] },
  },
  get: {
    gen: (a, b) => { return ['_vm.union.get', '(', a, ',', b, ')'] },
  },
  set: {
    gen: (a, b, c) => { return ['_vm.union.set', '(', a, ',', b, ',', c, ')'] },
  },
  mix: {
    gen: (a, ...args) => { return ['_vm.union.mix', '(', a, ',', comma_array(args), ')'] },
  },
  stk: {
    gen: (a, b, c) => { return ['_vm.stk', '(', a, ',', b, ',', c || 4, ')'] },
  },
  psh: {
    gen: (a, ...args) => { return ['_vm.psh', '(', a, ',', comma_array(args), ')'] },
  },
  pop: {
    expr: true,
    gen: (a) => { return ['_vm.pop', '(', a, ')'] },
  },
  hex: {
    gen: (a) => { return ['_vm.hex', '(', a, ')'] },
  },
  hex8: {
    gen: (a) => { return ['_vm.hex', '(', a, ',', 8, ')'] },
  },
  hex16: {
    gen: (a) => { return ['_vm.hex', '(', a, ',', 16, ')'] },
  },
  int_start: {
    gen: (a, b, c) => { return ['_vm.int', '(', a, ',', b, ',', c, ')'] },
  },
  int_pause: {
    gen: (a) => { return ['_vm.int_pause', '(', a, ')'] },
  },
  int_resume: {
    gen: (a) => { return ['_vm.int_resume', '(', a, ')'] },
  },
  int_stop: {
    gen: (a) => { return ['_vm.int_stop', '(', a, ')'] },
  },
  ord: {
    gen: (a) => { return [a + '.toString().charCodeAt[0]'] },
  },
  chr: {
    gen: (a) => { return ['String.fromCharCode', '(', a, ')'] },
  },
  brk: {
    gen: () => { return ['_vm.dbg.brk', '(', ')'] },
  },
}

var x = 0
for (var k in opcodes) {
  opcodes[k].idx = x++
}


export var defaults = {
  boundscheck: false,

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

}

export var error = (t, msg) => {
  errors++
  console.error(msg, 'at', t.value, '(' + t.row + ',' + t.col + ')')
}

export var runtime_error = (code) => {
  let e = 'Unknown runtime error'
  switch (code)
  {
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
  console.error(e)
}

export var io_error = (code) => {
  let e = 'I/O runtime error'
  switch (code)
  {
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

export var comma_array = (args) => {
  let r = []
  for (let a of args) {
    r.push(a)
    r.push(',')
  }
  r.splice(r.length - 1, 1)
  return r
}

export var mixin = (proto, ...mixins) => {
  mixins.forEach((mixin) => {
    Object.getOwnPropertyNames(mixin).forEach((key) => {
      if (key !== 'constructor') {
        let descriptor = Object.getOwnPropertyDescriptor(mixin, key)
        Object.defineProperty(proto, key, descriptor)
      }
    })
  })
}

export var rnd = (min, max) => { return Math.trunc(Math.random() * (max - min) + min) }

export var delay = (ms) => {
  let t = performance.now()
  while (performance.now() - t <= ms) {
    PIXI.ticker.shared.update()
  }
}

export var buffer_to_string = (b) => {
  let len = b.length
  let i = 0
  let s = ''
  while (i < len) {
    s += b[i++].toString(16)
  }
  return s
}

export var string_to_buffer = (str) => {
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

export var _vm_ldb = () => { return '_vm.ldb' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_ldw = () => { return '_vm.ldw' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_ld = () => { return '_vm.ld' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_ldl = () => { return '_vm.ldl' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_lds = () => { return '_vm.lds' + (defaults.boundscheck ? '_bc' : '') }

export var _vm_stb = () => { return '_vm.stb' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_stw = () => { return '_vm.stw' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_st = () => { return '_vm.st' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_sts = () => { return '_vm.sts' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_stl = () => { return '_vm.stl' + (defaults.boundscheck ? '_bc' : '') }

export var _vm_fill = () => { return '_vm.fill' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_copy = () => { return '_vm.copy' + (defaults.boundscheck ? '_bc' : '') }

export var _vm_db = () => { return '_vm.db' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_dw = () => { return '_vm.dw' + (defaults.boundscheck ? '_bc' : '') }
export var _vm_dd = () => { return '_vm.dd' + (defaults.boundscheck ? '_bc' : '') }

export var hex = (value, size = 32) => { return '$' + _.padStart(value.toString(16), Math.trunc(size / 4), '0') }
