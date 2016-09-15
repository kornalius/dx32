import hexy from 'hexy'
import { hex } from '../globals.js'

export var data_type_sizes = {
  i8: 1,
  s8: 1,
  i16: 2,
  s16: 2,
  i32: 4,
  s32: 4,
  f32: 4,
  str: 64,
}

export var data_type_size = type => _.isNumber(type) ? type : data_type_sizes[type]

export class Memory {

  mem_init (mem_buffer, offset, mem_size) {
    if (_.isNumber(mem_buffer)) {
      if (_.isNumber(offset)) {
        mem_size = offset
      }
      offset = mem_buffer
      mem_buffer = null
    }

    if (!mem_size) {
      mem_size = !offset && mem_buffer instanceof ArrayBuffer ? mem_buffer.byteLength : offset
      offset = 0
    }

    this.mem_size = mem_size || 4
    this.mem_top = offset || 0
    this.mem_bottom = this.mem_top + this.mem_size - 1

    this.mem_buffer = mem_buffer || _vm.mem_buffer

    this.mem_array = new Uint8Array(this.mem_buffer)

    this.mem_view = new DataView(this.mem_buffer)

    this.data_view_fns = {
      i8: 'Uint8',
      s8: 'Int8',
      i16: 'Uint16',
      s16: 'Int16',
      i32: 'Uint32',
      s32: 'Int32',
      f32: 'Float32',
    }
  }

  mem_tick (t) {
  }

  mem_reset () {
    this.clear()
  }

  mem_shut () {
    this.mem_view = null
    this.mem_array = null
    this.mem_buffer = null
  }

  clear () { this.fill(0, this.mem_top, this.mem_size) }

  chk_bounds (addr, sz = 4) {
    if (addr < this.mem_top || addr + sz > this.mem_bottom) {
      this.hlt(0x08)
    }
  }


  db (type, addr, ...args) {
    let sz = data_type_sizes[type]
    let fn = this.mem_view['set' + this.data_view_fns[type]]
    for (let a of args) {
      fn.call(this.mem_view, addr, a)
      addr += sz
    }
    return addr
  }

  db_bc (type, addr, ...args) {
    this.chk_bounds(addr, args.length * data_type_sizes[type])
    this.db(type, addr, ...args)
  }

  ld (type, addr) { return this.mem_view['get' + this.data_view_fns[type]](addr, _vm.littleEndian) }

  ldb (addr) { return this.ld('i8', addr) }

  ldw (addr) { return this.ld('i16', addr) }

  ldd (addr) { return this.ld('i32', addr) }

  ldf (addr) { return this.ld('f32', addr) }

  ld_bc (type, addr) {
    this.chk_bounds(addr, data_type_sizes[type])
    return this.ld(type, addr)
  }

  st (type, addr, value) { this.mem_view['set' + this.data_view_fns[type]](addr, value, _vm.littleEndian) }

  stb (addr, value) { this.st('i8', addr, value) }

  stw (addr, value) { this.st('i16', addr, value) }

  std (addr, value) { this.st('i32', addr, value) }

  stf (addr, value) { this.st('f32', addr, value) }

  st_bc (type, addr, value) {
    this.chk_bounds(addr, data_type_sizes[type])
    this.st(type, addr, value)
  }

  ldl (addr, size) { return this.mem_array.slice(addr, addr + size - 1) }

  ldl_bc (addr, size) {
    this.chk_bounds(addr, size)
    return this.ldl(addr, size)
  }

  lds (addr, size) {
    if (_.isString(addr)) {  // assembler will use lds("")
      return addr
    }

    let s = ''
    size = size || data_type_sizes.str
    let bottom = Math.min(addr + size - 1, this.mem_bottom)
    let mem = this.mem_array
    while (addr <= bottom) {
      let c = mem[addr++]
      if (c === 0) {
        break
      }
      else {
        s += String.fromCharCode(c)
      }
    }
    return s
  }

  lds_bc (addr, size) {
    this.chk_bounds(addr, Math.min(size || 0, data_type_sizes.str))
    return this.lds(addr, size)
  }

  stl (addr, value, size) { this.mem_array.set(value.subarray(0, size || value.byteLength), addr) }

  stl_bc (addr, value, size) {
    this.chk_bounds(addr, Math.min(size || 0, value.byteLength))
    this.stl(addr, value, size)
  }

  sts (addr, str, size) {
    size = size || data_type_sizes.str - 1
    let a = _.map(str.split(''), i => i.charCodeAt(0))
    a.length = Math.min(size, a.length)
    this.fill(0, addr, size)
    this.mem_array.set(a, addr)
  }

  sts_bc (addr, str, size) {
    this.chk_bounds(addr, Math.min(size, data_type_sizes.str))
    this.sts(addr, str, size)
  }

  fill (value, top, size) { this.mem_array.fill(value || 0, top, top + size) }

  fill_bc (value, top, size) {
    this.chk_bounds(top, size)
    this.fill(value, top, size)
  }

  copy (src, tgt, size) { this.mem_array.copyWithin(tgt, src, src + size - 1) }

  copy_bc (src, tgt, size) {
    this.chk_bounds(src, size)
    this.chk_bounds(tgt, size)
    this.copy(src, tgt, size)
  }

  read (addr, type = 'i8') {
    let value
    if (_.isNumber(type)) {
      value = this.mem_array.slice(addr, addr + type - 1)
    }
    else if (type === 'str') {
      value = this.lds(addr)
    }
    else {
      value = this.ld(type, addr)
    }
    return value
  }

  write (value, addr, type = 'i8') {
    let sz
    if (_.isNumber(type)) {
      debugger;
      this.mem_array.set(value.subarray(0, type - 1), addr)
      sz = type
    }
    else if (type === 'str') {
      this.sts(addr, value)
      sz = data_type_sizes[type]
    }
    else {
      this.st(type, addr, value)
      sz = data_type_sizes[type]
    }
    return addr + sz
  }

  dump (addr = 0, size = 1024) {
    console.log('Dumping', size, ' bytes from memory at ', hex(addr))
    console.log(hexy.hexy(this.mem_buffer, { offset: addr, length: size, width: 16, caps: 'upper', indent: 2 }))
  }

}
