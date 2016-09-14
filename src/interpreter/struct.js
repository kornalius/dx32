import { mixin } from '../globals.js'
import { Memory, data_type_size } from './memory.js'


export class StructEntry {

  constructor (offset, format) {
    this.struct_init(offset, format)
  }

}


export class Struct {

  struct_init (offset, format) {
    if (_.isObject(offset)) {
      format = offset
      offset = null
    }

    this.struct_format = format
    let sz = this.struct_format_size(format)
    offset = offset || _vm.alloc(sz)

    this.mem_init(offset, sz)

    this.struct_assign_properties(offset)

    return this
  }

  struct_reset () {
    this.mem_reset()
    this.fill(0, this.mem_top, this.mem_size)
  }

  struct_shut () {
    _vm.free(this.mem_top)
    this.mem_shut()
  }

  struct_format_by_name (name) { return _.find(this.struct_format, { name }) }

  struct_assign_properties (offset) {
    for (let name of this.struct_names) {
      let f = this.struct_format_by_name(name)

      let type = f.type
      let value = f.value || 0
      let size
      let n = '_' + name

      if (_.isObject(type)) {
        this[n] = new StructEntry(offset, type)
        size = this[n].mem_bottom - this[n].mem_top
      }
      else {
        size = this.struct_size(type)
        if (!_.isNumber(type) && ['i16', 's16', 'i32', 's32', 'f32'].indexOf(type) !== -1) {
          while (offset % 2 !== 0) { offset++ }
        }
        this[n] = { name, type, mem_size: size, mem_top: offset, mem_bottom: offset + size - 1 }
      }

      let entry = this[n]

      Object.defineProperty(this, name, {
        enumerable: true,
        get: () => this.read(entry.mem_top, entry.type),
        set: value => { this.write(value, entry.mem_top, entry.type) },
      })

      if (value) {
        this[name] = value
      }

      offset += size
    }

    return offset
  }

  struct_format_size (fmt) {
    let sz = 0
    let names = _.map(fmt, st => st.name)

    for (let name of names) {
      let f = _.find(this.struct_format, { name })
      let type = f.type
      sz += _.isObject(type) ? this.struct_format_size(type) : data_type_size(type)
    }

    return sz
  }

  get struct_names () { return _.map(this.struct_format, st => st.name) }

  struct_size (type) {
    if (!type) {
      return this.mem_bottom - this.mem_top
    }
    else if (type instanceof StructEntry) {
      return type.struct_size()
    }
    else {
      return data_type_size(type)
    }
  }

  from_buffer (buf, offset = 0) {
    this.mem_array.set(buf, offset)
    return this
  }

  to_buffer (buf, offset = 0) {
    if (!buf) {
      buf = new ArrayBuffer(this.struct_size())
    }
    buf.set(this.mem_array, offset)
    return buf
  }

  from_object (obj) {
    for (let name of this.struct_names) {
      if (this[name] instanceof StructEntry) {
        this[name].from_object(obj[name])
      }
      else {
        this[name] = obj[name]
      }
    }
    return this
  }

  to_object () {
    let s = {}
    for (let name of this.struct_names) {
      let value = this[name]
      if (value instanceof StructEntry) {
        s[name] = value.to_object()
      }
      else {
        s[name] = value
      }
    }
    return s
  }

}

mixin(Struct.prototype, Memory.prototype)

mixin(StructEntry.prototype, Struct.prototype)
