import _ from 'lodash'
import { error } from '../globals.js'


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

    let defs = {
      eol: /[\r\n]/,

      comma: /,/,

      open_bracket: /\[/,
      close_bracket: /\]/,

      open_curly: /\{/,
      close_curly: /\}/,

      open_paren: /\(/,
      close_paren: /\)/,

      comp: />|<|>=|<=|!=|==/,
      math: /[\+\-\*\/%\^]/,
      logic: {
        match: /[!&\|]/,
        value (v, d) {
          if (v === '&') {
            v = '&&'
          }
          else if (v === '|') {
            v = '||'
          }
          return v
        }
      },

      assign: /^([=])[^=]/,

      comment: /;([^\n]*)/,

      boundscheck: /\.bounds\b/i,
      debug: /\.debug\b/i,
      include: {
        match: /\.include\s/,
        include: true,
      },

      constant_def: /const\b/,

      label_def: /:([A-Z_][A-Z_0-9]*)/i,

      struct_def: /struct\b/,

      func_expr_def: /:(?=\()/,

      label_indirect: {
        match: /(@+[A-Z_][A-Z_0-9\.]*)/i,
        value (v, d) {
          d.count = indirect_count(v)
          v = v.substr(d.count - 1)
          return v
        },
      },

      label_assign: /([A-Z_][A-Z_0-9\.]*)(?=\s*=)/i,

      label_assign_indirect: {
        match: /(@+[A-Z_][A-Z_0-9\.]*)(?=\s*=)/i,
        value (v, d) {
          d.count = indirect_count(v)
          v = v.substr(d.count - 1)
          return v
        },
      },

      label_assign_bracket: {
        match: /([A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*=)/i,
        type () { return 'label_assign' },
      },

      label_assign_indirect_bracket: {
        match: /(@+[A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*=)/i,
        value (v, d) {
          d.count = indirect_count(v)
          v = v.substr(d.count - 1)
          return v
        },
        type () { return 'label_assign_indirect' },
      },

      port: /#([0-9]+)(?!:)/i,

      port_name: {
        match: /#([A-Z]+\b)(?!:)/i,
        value (v) {
          return _vm.port_by_name(v)
        },
        type () { return 'port' },
      },

      port_call: /#([0-9]+:[A-Z_][A-Z_0-9]*\b)/i,

      port_name_call: {
        match: /#([A-Z]+\b:[A-Z_][A-Z_0-9]*\b)/i,
        value (v) {
          let parts = v.split(':')
          return _vm.port_by_name(parts[0]) + ':' + parts[1]
        },
        type () { return 'port_call' },
      },

      port_indirect: {
        match: /(@#[0-9]+)(?!:)/i,
        value (v, d) {
          d.count = indirect_count(v)
          v = v.substr(d.count - 1)
          if (v[0] === '#') {
            v = v.substr(1)
          }
          return v
        },
      },

      port_name_indirect: {
        match: /(@#[A-Z]+)(?!:)/i,
        value (v, d) {
          d.count = indirect_count(v)
          v = v.substr(d.count - 1)
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

      // indirect_symbol: /(@)(?![^#A-Z_])/i,

      id: /([A-Z_][A-Z_0-9\.]*)(?!\s*=)/i,

      digit: {
        match: /([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/,
        type (k, v) {
          let r = parseInt(v)
          if (_.isNaN(r)) {
            r = parseFloat(v)
            return 'f32'
          }
          else {
            let t = 'i'
            if (r < 0) {
              t = 's'
            }
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

      i8: {
      },

      s8: {
      },

      i16: {
      },

      s16: {
      },

      i32: {
      },

      s32: {
      },

      f32: {
      },

      i64: {
      },

      hex: {
        match: /\$([0-9A-F]+)/i,
        type () { return 'digit' },
        value (v) { return parseInt('0x' + v, 16).toString() },
      },

      string: /"([^"]*)"/i,

      char: {
        match: /'(.)'/i,
        type () { return 'digit' },
        value (v) { return v.charCodeAt(0) },
      },

    }

    var add_token = (k, v) => {
      let d = defs[k]

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
          d = defs[k]
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
        for (let k in defs) {
          let d = defs[k]

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
