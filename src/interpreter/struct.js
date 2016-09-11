import { mixin, data_type_size, data_read, data_write } from '../globals.js'


export class StructEntry {

  constructor (buf, offset, format) {
    this.struct_init(buf, offset, format)
  }

}


export class Struct {

  struct_init (buf, offset, format) {
    this.struct_format = format
    let sz = this.struct_format_size(format)
    this.struct_buffer = _.isNull(buf) ? _vm.mem_buffer : buf || new Buffer(sz)
    this.struct_top = _.isNull(buf) && _.isNull(offset) ? _vm.alloc(sz) : offset || 0
    this.struct_bottom = this.struct_assign_properties(this.struct_top) - 1
    return this
  }

  struct_reset () {
    _vm.fill(0, this.struct_top, this.struct_bottom)
  }

  struct_shut () {
    _vm.free(this.struct_top)
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
        this[n] = new StructEntry(this.struct_buffer, offset, type)
        size = this[n].struct_bottom - this[n].struct_top
      }
      else {
        size = this.struct_size(type)
        this[n] = { name, type, mem_size: size, mem_top: offset, mem_bottom: offset + size - 1 }
      }

      let entry = this[n]

      Object.defineProperty(this, name, {
        enumerable: true,
        get: () => data_read(this.struct_buffer, entry.mem_top, entry.type).value,
        set: value => {
          if (!(entry instanceof StructEntry)) {
            data_write(value, this.struct_buffer, entry.mem_top, entry.type)
          }
        },
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
      let f = this.struct_format_by_name(name)
      let type = f.type
      if (_.isObject(type)) {
        sz += this.struct_format_size(type)
      }
      else {
        sz += data_type_size(type)
      }
    }

    return sz
  }

  get struct_names () { return _.map(this.struct_format, st => st.name) }

  struct_size (type) {
    if (!type) {
      return this.struct_bottom - this.struct_top
    }
    else if (type instanceof StructEntry) {
      return type.struct_size()
    }
    else {
      return data_type_size(type)
    }
  }

  struct_clear () {
    this.struct_buffer.fill(0, this.struct_top, this.struct_bottom)
    return this
  }

  from_buffer (buf, offset = 0) {
    buf.copy(this.struct_buffer, 0, offset, offset + this.struct_size() - 1)
    return this
  }

  to_buffer (buf, offset = 0) {
    if (!buf) {
      buf = new Buffer(this.struct_size())
    }
    this.struct_buffer.copy(buf, offset)
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

  struct_read (offset, type) {
    return data_read(this.struct_buffer, offset, type).value
  }

  struct_write (value, offset, type) {
    return data_write(value, this.struct_buffer, offset, type)
  }

}

mixin(StructEntry.prototype, Struct.prototype)
