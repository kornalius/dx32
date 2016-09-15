import _ from 'lodash'

import { is_eos, is_opcode, is_digit, is_digit_signed, is_string, is_comma, is_open_paren, is_open_bracket, is_end, is_const_def, is_label_def, is_struct_def, is_func_expr_def, is_label_assign, is_assign, is_if, is_elif, is_else, is_brk, is_whl, is_for, is_port, is_port_call, peek_at, peeks_at, expected } from './tokenizer.js'

import { defaults, opcodes, error, sbc, define_to_data_type } from '../globals.js'

import { data_type_size } from '../interpreter/memory.js'

import { comma_array, gen_args, codify, CodeGenerator, _PRETTY, js_name } from './codegen.js'

import { global_frame, frames, Frame } from './frame.js'


export class Assembler {

  constructor () {
    this.code = new CodeGenerator(_PRETTY, this)

    this.errors = 0
    this.debug = false
    this.indent = 0
  }

  asm (path, tokens, options = {}) {
    var len = tokens.length
    var i = 0
    var t = tokens[i]

    defaults.boundscheck = false

    var code = this.code

    var extra_statement_lines = []

    var contants = {}
    var frame = null

    var last_expr_type = null
    var structs = []
    var first_structs_label = null

    var term
    var factor
    var conditional
    var junction
    var simple_expr
    var expr
    var exprs
    var subexpr
    var statements
    var block
    var statement

    var parameters
    var indexed
    var indirect
    var label
    var func
    var port
    var port_call
    var constant
    var opcode

    var label_assign

    var const_def
    var label_def
    var struct_def
    var func_def
    var func_expr_def
    var bracket_def

    var _bind_global = (name, bc = false) => code.line_s('var', sbc(name, bc), '=', sbc('_vm.' + name, bc) + '.bind(_vm)')

    var code_init = () => {
      code.line('')
    }

    var code_end = () => {
      code.line('')
    }

    let next_token = () => { t = tokens[++i]; return t }

    let prev_token = () => { t = tokens[--i]; return t }

    let skip_token = type => {
      let p = peek_at(i, type, tokens)
      if (p) {
        next_token()
      }
      return p ? t : false
    }

    let peek_token = type => peek_at(i + 1, type, tokens)

    let is_type = type => peek_at(i, type, tokens)

    let is_token = o => _.isObject(o) && o.type && o.value

    let token_peeks = arr => peeks_at(i + 1, arr, tokens)

    let expected_next_token = type => {
      if (expected(t, type)) {
        next_token()
      }
    }

    let ld = (offset, bc = false, type = 'i8') => [sbc('_vm.ld', bc), '(', '"' + type + '"', ',', offset, ')']

    let ldl = (offset, size, bc = false) => [sbc('_vm.ldl', bc), '(', offset, ',', size, ')']

    let lds = (offset, bc = false) => [sbc('_vm.lds', bc), '(', offset, ')']

    let st = (offset, value, bc = false, type = 'i8') => [sbc('_vm.st', bc), '(', '"' + type + '"', ',', offset, ',', value, ')']

    let stl = (offset, value, bc = false) => [sbc('_vm.stl', bc), '(', offset, ',', value, ')']

    let sts = (offset, value, bc = false) => [sbc('_vm.sts', bc), '(', offset, ',', value, ')']

    let read = (offset, type, bc = defaults.boundscheck) => {
      if (_.isNumber(type)) {
        return ldl(offset, bc, true)
      }
      if (type === 'str') {
        return lds(offset, bc)
      }
      else {
        return ld(offset, bc, type)
      }
    }

    let write = (offset, type, value, bc = defaults.boundscheck) => {
      if (_.isNumber(type)) {
        return stl(offset, value, bc, true)
      }
      if (type === 'str') {
        return sts(offset, value, bc)
      }
      else {
        return st(offset, value, bc, type)
      }
    }

    let type_to_string = type => _.isString(type) ? '"' + type + '"' : type

    let var_alloc = (type, name, dimensions, args) => ['var', name, '=', '_vm.alloc', gen_args([type_to_string(type), codify(dimensions), comma_array(args)])]

    let alloc = (type, name, dimensions, args) => [name, '=', '_vm.alloc', gen_args([type_to_string(type), codify(dimensions), comma_array(args)])]

    let find_label = name => {
      let l = frame.findLabel(name)
      if (!l && !frame.is_global) {
        l = global_frame.findLabel(name)
      }
      return l
    }

    let new_label = name => {
      let l = find_label(name)
      if (!l) {
        l = frame.addLabel(name)
      }
      else {
        error(t, 'duplicate label')
        next_token()
      }
      return l
    }

    let tmp_label = name => new_label(name || 'tmp' + '_' + _.uniqueId())

    let find_constant = name => contants[name]

    let new_constant = (name, args) => {
      if (!find_constant(name)) {
        contants[name] = args
        return contants[name]
      }
      else {
        error(t, 'duplicate constant')
        next_token()
        return null
      }
    }

    let new_frame = name => {
      if (frame) {
        frames.push(frame)
      }
      frame = new Frame(null, name)
      return frame
    }

    let end_frame = () => {
      if (frame) {
        frame = frames.pop()
      }
      return frame
    }

    let new_frame_code = () => frame.start_code(code)

    let end_frame_code = () => frame.end_code(code)

    let is_constant = () => {
      if (find_constant(t.value)) {
        constant(false)
        return true
      }
      return false
    }

    let is_label = () => {
      let l = find_label(t.value)
      return l && !l.is_func ? l : null
    }

    let is_func = () => {
      let l = find_label(t.value)
      return l && l.is_func ? l : null
    }

    term = () => {
      let r = []
      if (is_type(['+', '-'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    factor = () => {
      let r = []
      if (is_type(['*', '/', '%'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    conditional = () => {
      let r = []
      if (is_type(['<', '<=', '>', '>=', '==', '!='])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    junction = () => {
      let r = []
      if (is_type(['!', '&&', '||'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    simple_expr = () => {
      is_constant()

      let r = []

      last_expr_type = defaults.type

      if (is_digit(t)) {
        last_expr_type = t.type
        r.push(t)
        next_token()
      }
      else if (is_string(t)) {
        last_expr_type = 'str'
        r.push(t)
        next_token()
      }
      else if (is_open_paren(t)) {
        r = r.concat(subexpr())
      }
      else if (is_port(t)) {
        r = r.concat(port())
      }
      else if (is_label()) {
        r = r.concat(label())
      }
      else if (is_func_expr_def(t)) {
        r = r.concat(func_expr_def())
      }
      else if (is_func()) {
        r = r.concat(func())
      }
      else if (is_port_call(t)) {
        r = r.concat(port_call())
      }
      else if (is_opcode(t)) {
        r = r.concat(opcode())
      }
      else {
        error(t, 'number, string, port, label, function call/expression or opcode expected')
        next_token()
      }

      if (is_open_bracket(t)) {
        r = r.concat(indexed())
      }

      return r
    }

    expr = () => {
      let r = simple_expr()

      let old_expr_type = last_expr_type

      if (r.length) {
        let tm = term()
        if (tm.length) {
          r = r.concat(tm)
        }
        else {
          let f = factor()
          if (f.length) {
            r = r.concat(f)
          }
          else {
            let c = conditional()
            if (c.length) {
              r = r.concat(c)
            }
            else {
              let j = junction()
              if (j.length) {
                r = r.concat(j)
              }
            }
          }
        }

        last_expr_type = old_expr_type
      }

      // if (r.length === 1) {
        // r = r[0]
      // }

      return r
    }

    exprs = () => parameters(is_open_paren(t) ? 'open_paren' : null, is_open_paren(t) ? 'close_paren' : null, false, -1, true)

    subexpr = () => parameters('open_paren', 'close_paren', false, 1, true)

    parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
      let r = []

      if (open) {
        expected_next_token(open)
      }

      if (close && t.type === close) {
        next_token()
        return []
      }

      while (i < len && !is_eos(t)) {
        if (single_term) {
          r.push(t)
          next_token()
        }
        else {
          r.push(expr())
        }

        if (limit !== -1 && r.length === limit) {
          break
        }

        if (t && !is_eos(t)) {
          if (close && t.type === close) {
            break
          }
          else if (is_end(t)) {
            break
          }
          else if (!allow_ws && !is_comma(t)) {
            error(t, 'comma' + (close ? ', ' + close : '') + ' or end of line expected')
            next_token()
            break
          }

          if (allow_ws && is_comma(t)) {
            next_token()
          }
        }
      }

      if (close) {
        expected_next_token(close)
      }

      return r
    }

    port = () => indirect('_vm.ports[' + t.value + '].mem_top')

    port_call = () => {
      let parts = t.value.split(':')
      next_token()
      return ['_vm.ports[' + parts[0] + '].publics.' + parts[1] + '.call', '(', comma_array(['_vm.ports[' + parts[0] + ']', ...exprs()]), ')']
    }

    bracket_def = () => parameters('open_bracket', 'close_bracket', false, -1, false)

    indexed = () => {
      let r = ['+']
      r = r.concat(parameters('open_bracket', 'close_bracket', false, 1, false))
      return r
    }

    indirect = value => {
      let r = []
      let i

      let _ind = _.endsWith(t.type, '_indirect')

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r = r.concat([sbc('_vm.ld', defaults.boundscheck), '(', '"' + defaults.type + '"', ','])
        }
      }

      r.push(value)

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r.push(')')
        }
      }

      next_token()

      return r
    }

    label_def = (simple = false) => {
      let name = js_name(t.value)

      if (structs.length) {
        name = js_name(structs.join('.') + '.' + name)
        if (!first_structs_label) {
          first_structs_label = name
        }
      }

      let _new = false
      let l = find_label(name)
      if (!l) {
        l = new_label(name)
        _new = true
      }

      next_token()

      if (is_eos(t) || simple) {
        if (_new) {
          code.line_s(...var_alloc(l.type, l.name, [1]))
        }
        else {
          code.line_s(...write(l.name, l.type, 0))
        }
      }

      else if (is_open_paren(t)) {
        func_def(l)
      }

      else if (is_assign(t)) {
        expected_next_token('assign')

        let v = expr()

        if (last_expr_type === 'str') {
          l.type = 'str'
        }

        if (_new) {
          code.line_s(...var_alloc(l.type, l.name, [1], v))
        }
        else {
          code.line_s(...write(l.name, l.type, v))
        }
      }

      else {
        let type = define_to_data_type(t.value)
        if (!type) {
          error(t, 'data define token expected')
          next_token()
          return l
        }

        next_token()

        if (is_open_bracket(t)) {
          l.dimensions = bracket_def()
          if (_new) {
            code.line_s(...var_alloc(type, l.name, l.dimensions))
          }
          else {
            if (!l.noFree) {
              code.line_s('_vm.free', '(', l.name, ')')
            }
            code.line_s(...alloc(type, l.name, l.dimensions))
          }
        }

        else {
          let _parms = parameters(null, null, false, -1, true)
          _parms = _.flatten(_parms)
          let parms = []
          for (let p of _parms) {
            if (is_string(p)) {
              let len = p.value.length
              for (let x = 0; x < len; x++) {
                parms.push({ type, value: p.value.charCodeAt(x), row: p.row, col: p.col + x, start: p.start + x, end: p.start + x, idx: p.idx })
              }
            }
            else {
              parms.push(p)
            }
          }
          if (_new) {
            code.line_s(...var_alloc(type, l.name, [parms.length], parms))
          }
          else {
            code.line_s(sbc('_vm.db', defaults.boundscheck), '(', type_to_string(type), ',', l.name, ',', comma_array(parms), ')')
          }
        }
      }

      return l
    }

    label_assign = () => {
      let name = js_name(t.value)
      let _ind = _.endsWith(t.type, '_indirect')
      let count = t.count
      let i

      let l = find_label(name)
      if (!l) {
        error(t, 'variable ' + name + ' is undefined')
        next_token()
        return
      }

      let br = []
      if (is_open_bracket(t)) {
        br = ['+'].concat(bracket_def())
      }

      next_token()

      expected_next_token('assign')

      let value = expr()

      let r = []
      if (_ind) {
        for (i = 0; i < count; i++) {
          r = r.concat([sbc('_vm.ld', defaults.boundscheck), '(', type_to_string(defaults.type), ','])
        }

        r.push(name)

        for (i = 0; i < count; i++) {
          r.push(')')
        }
      }

      else {
        r.push(name)
      }

      code.line_s(...write(r.concat(br).join(' '), l.type, value))
    }

    label = () => indirect(js_name(t.value))

    struct_def = () => {
      let old_first_struct_label = first_structs_label
      first_structs_label = null
      structs.push(t.value)
      let name = js_name(structs.join('.'))
      let l = find_label(name)
      if (!l) {
        l = new_label(name)
      }
      l.noFree = true
      next_token()
      block('end')
      code.line_s('var', l.name, '=', first_structs_label)
      structs.pop()
      first_structs_label = old_first_struct_label
    }

    func_def = l => {
      code.line('')
      new_frame()
      l.fn = true
      let parms = parameters('open_paren', 'close_paren', true, -1, true)
      code.line('var', l.name, '=', 'function', '(', comma_array(_.map(parms, p => '__' + p.value)), ')', '{')
      this.indent++
      new_frame_code()
      for (let p of parms) {
        let l = new_label(p.value)
        code.line_s(...var_alloc(defaults.type, l.name, ['__' + l.name]))
      }
      block('end')
      end_frame_code()
      end_frame()
      this.indent--
      code.line_s('}')
    }

    func_expr_def = () => {
      next_token()
      let l = tmp_label('fn')
      func_def(l)
      return [l.name]
    }

    func = () => {
      let name = js_name(t.value)
      next_token()
      return [name, '(', comma_array(exprs()), ')']
    }

    const_def = () => {
      let name = t.value

      next_token()

      let a = []
      let start = t.start
      let col = t.col
      let row = t.row
      while (i < len && !is_eos(t)) {
        t.col -= col
        t.row -= row
        t.start -= start
        t.end -= start
        a.push(t)
        next_token()
      }

      next_token()

      return new_constant(name, a)
    }

    constant = () => {
      let c = find_constant(t.value)
      let col = t.col
      let row = t.row
      let start = t.start
      let nc = _.cloneDeep(c)
      for (let a of nc) {
        a.col += col
        a.row += row
        a.start += start
        a.end += start
      }
      tokens.splice(i, 1, ...nc)

      t = tokens[i]
      len = tokens.length
    }

    opcode = (expr = false) => {
      let r = []

      let name = is_opcode(t)
      if (expr && !opcodes[name].expr) {
        error(t, 'opcode cannot be used in an expression')
        next_token()
        return []
      }

      next_token()
      let _args = exprs()

      // if (_args.length === 1) {
        // _args = _args[0]
      // }

      if (opcodes[name]) {
        let a = []
        if (opcodes[name].gen) {
          a = opcodes[name].gen(..._args)
        }
        else {
          a = [opcodes[name], '(', _args, ')']
        }
        r.push(expr ? ['(', a, ')'] : a)
      }
      else {
        error(t, 'invalid opcode')
        next_token()
        return []
      }

      return r
    }

    statements = () => {
      while (i < len) {
        if (!is_eos(t)) {
          statement()
        }
        else {
          next_token()
        }
      }
    }

    block = (end = 'end') => {
      while (i < len && !is_type(end)) {
        if (!is_eos(t)) {
          statement()
        }
        else {
          next_token()
        }
      }
      expected_next_token(end)
    }

    statement = () => {
      // while (i < len && is_eos(t)) {
        // next_token()
      // }

      let l

      if (structs.length > 0) {
        if (is_label_def(t)) {
          label_def()
        }
        else if (is_struct_def(t)) {
          struct_def()
        }
        else if (!is_eos(t)) {
          error(t, 'label or struct definition expected')
          next_token()
        }
      }
      else if (t.type === 'boundscheck') {
        defaults.boundscheck = true
        next_token()
      }
      else if (t.type === 'debug') {
        this.debug = true
        next_token()
      }
      else if (is_label_assign(t)) {
        label_assign()
      }
      else if (is_label_def(t)) {
        label_def()
      }
      else if (is_const_def(t)) {
        const_def()
      }
      else if (is_struct_def(t)) {
        struct_def()
      }
      else if (is_if(t)) {
        next_token()
        code.line('if', '(', expr(), ')', '{')
        this.indent++
        block('end')
        this.indent--
        code.line('}')
      }
      else if (is_elif(t)) {
        next_token()
        this.indent--
        code.line('}', 'else', 'if', '(', expr(), ')', '{')
        this.indent++
        block(['elif', 'else'])
      }
      else if (is_else(t)) {
        next_token()
        this.indent--
        code.line('}', 'else', '{')
        this.indent++
        block('end')
        prev_token()
      }
      else if (is_brk(t)) {
        next_token()
        code.line_s('break')
      }
      else if (is_whl(t)) {
        next_token()
        code.line('while', '(', expr(), ')', '{')
        this.indent++
        block('end')
        this.indent--
        code.line_s('}')
      }
      else if (is_for(t)) {
        next_token()
        let l
        if (is_label_def(t)) {
          l = label_def(true)
        }
        else {
          error(t, 'label definition expected')
          next_token()
          return
        }
        let min = expr()
        skip_token('comma')
        let max = expr()
        skip_token('comma')
        code.line('for', '(', 'var', '__' + l.name, '=', min, ';', '__' + l.name, '<=', max, ';', '__' + l.name, '+=', '1', ')', '{')
        this.indent++
        code.line_s(sbc('_vm.st', defaults.boundscheck), '(', type_to_string(defaults.type), ',', l.name, ',', '__' + l.name, ')')
        block('end')
        this.indent--
        code.line_s('}')
      }
      else if (is_opcode(t)) {
        code.line_s(opcode())
      }
      else {
        l = find_label(t.value)
        if (l && l.is_func) {
          code.line_s(func())
        }
        else if (is_port_call(t)) {
          code.line_s(port_call())
        }
        else {
          error(t, 'syntax error')
          next_token()
        }
      }

      if (extra_statement_lines.length) {
        for (l of extra_statement_lines) {
          code.line_s(...l)
        }
        extra_statement_lines = []
      }

      if (this.debug) {
        code.line_s('_vm.dbg_line', '(', t.row, ')')
      }
    }

    code_init()

    new_frame()
    new_frame_code()

    statements()

    code.line('if', '(', 'main', ')', '{')
    this.indent++
    code.line_s('main', '(', 'args', ')')
    this.indent--
    code.line('}')

    end_frame_code()
    end_frame()

    code_end()

    return code.build()
  }

}
