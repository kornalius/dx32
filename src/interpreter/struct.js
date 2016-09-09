

export class Struct {

  constructor (format) {
    this.format = format
  }

  from_buffer (buf, offset = 0) {
    let _convert = (s, fmt) => {
      let n = 0
      for (let st of fmt) {
        let name
        let type
        let value

        if (_.isObject(st)) {
          name = st.name
          type = st.type
        }
        else if (_.isString(st)) {
          name = 'field' + n
          type = st
          n++
        }

        if (_.isObject(type)) {
          value = _convert(s[name], type)
        }
        else if (_.isNumber(type)) {
          value = new Buffer(type)
          buf.copy(value, 0, offset, offset + type)
          offset += type
        }
        else {
          switch (type) {
            case 'i8':
              value = buf.readUInt8(offset)
              offset++
              break
            case 's8':
              value = buf.readInt8(offset)
              offset++
              break
            case 'i16':
              value = buf.readUInt16LE(offset)
              offset += 2
              break
            case 's16':
              value = buf.readInt16LE(offset)
              offset += 2
              break
            case 'i32':
              value = buf.readUInt32LE(offset)
              offset += 4
              break
            case 's32':
              value = buf.readInt32LE(offset)
              offset += 4
              break
            case 'f32':
              value = buf.readFloatLE(offset)
              offset += 4
              break
            case 'i64':
              value = buf.readDoubleLE(offset)
              offset += 8
              break
            case 'str':
              value = ''
              let c = buf[offset++]
              while (offset < buf.byteLength && c !== 0) {
                value += String.fromCharCode(c)
                c = buf[offset++]
              }
              break
          }
        }

        s[name] = value
      }

      return s
    }

    return _convert({}, this.format)
  }

  buffer_size () {
    let _size = fmt => {
      let sz = 0

      for (let st of fmt) {
        let type

        if (_.isObject(st)) {
          type = st.type
        }
        else if (_.isString(st)) {
          type = st
        }

        if (_.isObject(type)) {
          sz += _size(type)
        }
        else if (_.isNumber(type)) {
          sz += type
        }
        else {
          switch (type) {
            case 'i8':
              sz++
              break
            case 's8':
              sz++
              break
            case 'i16':
              sz += 2
              break
            case 's16':
              sz += 2
              break
            case 'i32':
              sz += 4
              break
            case 's32':
              sz += 4
              break
            case 'f32':
              sz += 4
              break
            case 'i64':
              sz += 8
              break
            case 'str':
              sz += 255
              break
          }
        }
      }

      return sz
    }

    return _size(this.format)
  }

  to_buffer (s, buf = null, offset = 0) {
    if (!buf) {
      buf = new Buffer(this.buffer_size())
    }

    let _convert = (s, fmt) => {
      for (let st of fmt) {
        let name
        let type

        if (_.isObject(st)) {
          name = st.name
          type = st.type
        }

        let value = s[name]

        if (_.isObject(type)) {
          _convert(value, type)
        }
        else if (_.isNumber(type)) {
          value.copy(buf, offset, 0, type)
          offset += type
        }
        else {
          switch (type) {
            case 'i8':
              buf.writeUInt8(offset, value)
              offset++
              break
            case 's8':
              buf.writeInt8(offset, value)
              offset++
              break
            case 'i16':
              buf.writeUInt16LE(offset, value)
              offset += 2
              break
            case 's16':
              buf.writeInt16LE(offset, value)
              offset += 2
              break
            case 'i32':
              buf.writeUInt32LE(offset, value)
              offset += 4
              break
            case 's32':
              buf.writeInt32LE(offset, value)
              offset += 4
              break
            case 'f32':
              buf.writeFloatLE(offset, value)
              offset += 4
              break
            case 'i64':
              buf.writeDoubleLE(offset, value)
              offset += 8
              break
            case 'str':
              let i = 0
              while (i < value.length) {
                buf.writeUInt8(offset++, value.charCodeAt(i++))
              }
              buf.writeUInt8(offset++, 0)
              break
          }
        }
      }
    }

    _convert(s, this.format)

    return buf
  }

}
