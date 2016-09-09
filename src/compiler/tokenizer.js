import _ from 'lodash'
import { error, opcodes } from '../globals.js'


export class Tokenizer {

  constructor () {
    this.errors = 0
  }

  tokenize (path, text) {
    let tokens = []
    let len = text.length
    let i = 0
    let si = 0
    let ls = 0
    let row = 1
    let col = 1

    let indirect_count = v => {
      let i = 0
      while (v[i] === '@') {
        i++
      }
      return i
    }

    let defs = [
      {
        comment: /;([^\r\n]*)/,
      },

      {
        const_def: /::([A-Z_][A-Z_0-9]*)/i,
      },

      {
        label_def: /:([A-Z_][A-Z_0-9]*)/i,
      },

      {
        struct_def: /=:([A-Z_][A-Z_0-9]*)/i,
      },

      {
        func_expr_def: /:(?=\()/,
      },

      {
        hex: {
          match: /\$([0-9A-F]+)|0x([0-9A-F]+)/i,
          type () { return 'digit' },
          value (v) { return parseInt('0x' + v, 16).toString() },
        },
      },

      {
        digit: {
          match: /([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/,
          type (k, v) {
            let r = parseInt(v)
            if (_.isNaN(r)) {
              r = parseFloat(v)
              return 'f32'
            }
            else {
              let t = r < 0 ? 's' : 'i'
              r = Math.abs(r)
              if (r >= 0x00 && r <= 0xFF) {
                return t + '8'
              }
              else if (r > 0xFF && r <= 0xFFFF) {
                return t + '16'
              }
              else if (r > 0xFFFF && r <= 0xFFFFFFFF) {
                return t + '32'
              }
              else if (r > 0xFFFFFFFF && r <= 0xFFFFFFFFFFFFFFFF) {
                return 'i64'
              }
              else {
                error({ v, row, col }, 'value out of bounds')
                return null
              }
            }
          },
        },
      },

      {
        eol: /[\r\n]/,
      },

      {
        comma: /,/,
      },

      {
        open_bracket: /\[/,
      },

      {
        close_bracket: /\]/,
      },

      {
        open_curly: /\{/,
      },

      {
        close_curly: /\}/,
      },

      {
        open_paren: /\(/,
      },

      {
        close_paren: /\)/,
      },

      {
        comp: />|<|>=|<=|!=|==/,
      },

      {
        math: /[\+\-\*\/%\^]/,
      },

      {
        logic: {
          match: /[!&\|]/,
          value (v, t) {
            if (v === '&') {
              v = '&&'
            }
            else if (v === '|') {
              v = '||'
            }
            return v
          },
        }
      },

      {
        assign: /^([=])[^=:]/,
      },

      {
        boundscheck: /\.bounds\b/i,
      },

      {
        debug: /\.debug\b/i,
      },

      {
        include: {
          match: /\.include\s/,
          include: true,
        },
      },

      {
        label_indirect: {
          match: /(@+[A-Z_][A-Z_0-9\.]*)/i,
          value (v, t) {
            t.count = indirect_count(v)
            v = v.substr(t.count)
            return v
          },
        },
      },

      {
        label_assign: /([A-Z_][A-Z_0-9\.]*)(?=\s*=)/i
      },

      {
        label_assign_indirect: {
          match: /(@+[A-Z_][A-Z_0-9\.]*)(?=\s*=)/i,
          value (v, t) {
            t.count = indirect_count(v)
            v = v.substr(t.count)
            return v
          },
        },
      },

      {
        label_assign_bracket: {
          match: /([A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*=)/i,
          type () { return 'label_assign' },
        },
      },

      {
        label_assign_indirect_bracket: {
          match: /(@+[A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*=)/i,
          value (v, t) {
            t.count = indirect_count(v)
            v = v.substr(t.count)
            return v
          },
          type () { return 'label_assign_indirect' },
        },
      },

      {
        port: /#([0-9]+)(?!:)/,
      },

      {
        port_name: {
          match: /#([A-Z]+\b)(?!:)/i,
          value (v) {
            return _vm.port_by_name(v)
          },
          type () { return 'port' },
        },
      },

      {
        port_call: /#([0-9]+:[A-Z_][A-Z_0-9]*\b)/i
      },

      {
        port_name_call: {
          match: /#([A-Z]+\b:[A-Z_][A-Z_0-9]*\b)/i,
          value (v) {
            let parts = v.split(':')
            return _vm.port_by_name(parts[0]) + ':' + parts[1]
          },
          type () { return 'port_call' },
        },
      },

      {
        port_indirect: {
          match: /(@#[0-9]+)(?!:)/i,
          value (v, t) {
            t.count = indirect_count(v)
            v = v.substr(t.count)
            if (v[0] === '#') {
              v = v.substr(1)
            }
            return v
          },
        },
      },

      {
        port_name_indirect: {
          match: /(@#[A-Z]+)(?!:)/i,
          value (v, t) {
            t.count = indirect_count(v)
            v = v.substr(t.count)
            if (v[0] === '#') {
              v = v.substr(1)
            }
            v = v.toLowerCase()
            for (let k in _vm.ports) {
              if (_vm.ports[k].name.toLowerCase() === v) {
                return k
              }
            }
            return '0'
          },
          type () { return 'port_indirect' },
        },
      },

      // indirect_symbol: /(@)(?![^#A-Z_])/i,

      {
        i8: {
        },
      },

      {
        s8: {
        },
      },

      {
        i16: {
        },
      },

      {
        s16: {
        },
      },

      {
        i32: {
        },
      },

      {
        s32: {
        },
      },

      {
        f32: {
        },
      },

      {
        i64: {
        },
      },

      {
        string: /"([^"]*)"/i,
      },

      {
        char: {
          match: /'(.)'/i,
          type () { return 'digit' },
          value (v) { return v.charCodeAt(0) },
        },
      },

      {
        id: /([A-Z_][A-Z_0-9\.]*)/i,
      },
    ]

    var find_def = k => {
      for (let dd of defs) {
        if (dd[k]) {
          return dd[k]
        }
      }
      return null
    }

    var add_token = (k, v) => {
      let d = find_def(k)

      let r = { type: k, value: v, row, col: si + 1 - ls, start: si, end: i, idx: tokens.length - 1 }

      while (d && (_.isFunction(d.type) || _.isFunction(d.value))) {
        let ok = k

        if (_.isFunction(d.type)) {
          k = d.type(k, v, r)
          if (k === ok) {
            error({ k, row, col }, 'recursive type loop')
            break
          }
        }

        if (_.isFunction(d.value)) {
          v = d.value(v, r)
        }

        if (ok !== k) {
          d = find_def(k)
        }
        else {
          break
        }
      }

      r.type = k
      r.value = v

      tokens.push(r)

      if (k === 'eol') {
        row++
        ls = i
      }
    }

    let rx
    let _include = false

    while (i < len) {
      let c = text[i]

      si = i

      if (c !== ' ' && c !== '\t') {
        for (let dd of defs) {
          let k = _.first(_.keys(dd))
          let d = dd[k]

          if (_.isRegExp(d)) {
            rx = d
          }
          else if (d.match) {
            rx = d.match
          }

          let r = text.substring(i).match(rx)
          if (r && r.index === 0) {
            let t = r.length > 1 ? r.slice(1).join('') : r.join('')
            i += r[0].length - 1

            if (_include && k === 'string') {
              _include = false
              let p = new Tokenizer()
              let s = ''
              let new_tokens = p.parse(s)
              if (p.errors !== 0) {
                new_tokens = []
              }
              tokens = tokens.concat(new_tokens)
              len = tokens.length
            }
            else if (d.include) {
              _include = true
            }
            else {
              add_token(k, t)
            }

            break
          }
        }
      }

      i++
    }

    return tokens
  }

}

export var is_comment = t => t.type === 'comment'

export var is_eos = t => t.type === 'eol' || is_comment(t)

export var is_assign = t => t.type === 'assign'

export var is_comp = t => t.type === 'comp'

export var is_math = t => t.type === 'math'

export var is_logic = t => t.type === 'logic'

export var is_indirect_symbol = t => t.type === 'indirect_symbol'

export var is_symbol = t => is_comp(t) || is_math(t) || is_logic(t) || is_assign(t) || is_indirect_symbol(t)

export var is_opcode = t => (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null

export var is_digit_signed = t => t.type === 's8' || t.type === 's16' || t.type === 's32'

export var is_digit = t => t.type === 'i8' || t.type === 'i16' || t.type === 'i32' || t.type === 'f32' || t.type === 'i64' || is_digit_signed(t)

export var is_string = t => t.type === 'string'

export var is_value = t => is_digit(t) || is_string(t)

export var is_comma = t => t.type === 'comma'

export var is_open_paren = t => t.type === 'open_paren'
export var is_close_paren = t => t.type === 'close_paren'

export var is_open_bracket = t => t.type === 'open_bracket'
export var is_close_bracket = t => t.type === 'close_bracket'

export var is_open_curly = t => t.type === 'open_curly'
export var is_close_curly = t => t.type === 'close_curly'

export var is_end = t => t.value === 'end'

export var is_const_def = t => t.type === 'const_def'
export var is_label_def = t => t.type === 'label_def'
export var is_struct_def = t => t.type === 'struct_def'
export var is_func_expr_def = t => t.type === 'func_expr_def'

export var is_label_assign = t => t.type === 'label_assign' || t.type === 'label_assign_indirect'

export var is_if = t => t.value === 'if'
export var is_elif = t => t.value === 'elif'
export var is_else = t => t.value === 'else'
export var is_brk = t => t.value === 'brk'
export var is_whl = t => t.value === 'whl'
export var is_for = t => t.value === 'for'

export var is_port = t => t.type === 'port' || t.type === 'port_indirect'
export var is_port_call = t => t.type === 'port_call'

export var peek_token = (p, type) => {
  if (is_comment(p)) {
    return false
  }

  if (_.isString(type)) {
    if (type === 'opcode') {
      return is_opcode(p)
    }
    else if (type === 'symbol') {
      return is_symbol(p)
    }
    else if (type === 'digit') {
      return is_digit(p)
    }
    else if (type === 'value') {
      return is_value(p)
    }
    return p.type === type || p.value === type
  }

  else if (_.isNumber(type)) {
    return p.value === type
  }

  else if (_.isRegExp(type)) {
    return p.type.match(type) || p.value.match(type)
  }

  else if (_.isArray(type)) {
    for (let a of type) {
      if (p.type === a || p.value === a) {
        return true
      }
    }
    return false
  }

  else if (_.isFunction(type)) {
    return type(p)
  }

  return false
}

export var peek_at = (x, type, tokens) => peek_token(tokens[x], type)

export var peeks_at = (x, arr, tokens) => {
  let len = tokens.length
  let ax = 0
  let alen = arr.length
  while (x < len && ax < alen) {
    if (!peek_at(x++, arr[ax++], tokens)) {
      return false
    }
  }
  return true
}

export var expected = (t, type) => {
  if (!peek_token(t, type)) {
    error(t, type + ' expected')
    return false
  }
  return true
}
