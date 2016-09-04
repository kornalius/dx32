import _ from 'lodash'
import { defaults, opcodes, comma_array, error, _vm_ldb, _vm_ldw, _vm_ld, _vm_ldf, _vm_ldd, _vm_ldl, _vm_lds, _vm_stb, _vm_stw, _vm_st, _vm_stf, _vm_std, _vm_stl, _vm_sts, data_type_size } from '../globals.js'
import { codify, CodeGenerator, _PRETTY } from './codegen.js'
import { Label } from './label.js'
import { frames, Frame } from './frame.js'


export var data_type_to_alloc = type => {
  switch (type) {
    case 'i8': return 'alloc_b'
    case 's8': return 'alloc_b_s'
    case 'i16': return 'alloc_w'
    case 's16': return 'alloc_w_s'
    case 'i32': return 'alloc_dw'
    case 's32': return 'alloc_dw_s'
    case 'f32': return 'alloc_f'
    case 'i64': return 'alloc_dd'
    default: return 'alloc'
  }
}

export var define_to_data_type = def_name => {
  switch (def_name) {
    case 'db': return 'i8'
    case 'dbs': return 's8'
    case 'dw': return 'i16'
    case 'dws': return 's16'
    case 'dl': return 'i32'
    case 'dls': return 's32'
    case 'df': return 'f32'
    case 'dd': return 'i64'
    default: return null
  }
}

export var data_type_to_define = type => {
  switch (type) {
    case 'i8': return 'db'
    case 's8': return 'dbs'
    case 'i16': return 'dw'
    case 's16': return 'dws'
    case 'i32': return 'dl'
    case 's32': return 'dls'
    case 'f32': return 'df'
    case 'i64': return 'dd'
    default: return null
  }
}

export var js_name = name => _.camelCase(name.replace('.', '-'))

export var is_eos = t => t.type === 'comment' || t.type === 'eol'

export var is_symbol = t => t.type === 'comp' || t.type === 'math' || t.type === 'logic' || t.type === 'assign' || t.type === 'indirectSymbol'

export var is_opcode = t => (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null

export var is_digit = t => t.type === 'i8' || t.type === 's8' || t.type === 'i16' || t.type === 's16' || t.type === 'i32' || t.type === 's32' || t.type === 'f32' || t.type === 'i64'

export var is_string = t => t.type === 'string'

export var is_value = t => is_digit(t) || is_string(t)

export var peek_token = (p, type) => {
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


export class Assembler {

  constructor () {
    this.errors = 0
    this.debug = false
    this.indent = 0
  }

  asm (path, tokens, options = {}) {
    var len = tokens.length
    var i = 0
    var t = tokens[i]

    defaults.boundscheck = false

    var code = new CodeGenerator(_PRETTY, this)

    var frame = null

    var current_custom_type_def = null

    var constants = {}

    var next_token
    var prev_token
    var skip_token
    var peek_token
    var is_type
    var is_token
    var token_peeks
    var expected_next_token
    var ldb
    var ldw
    var ld
    var ldb_s
    var ldw_s
    var ld_s
    var ldf
    var ldd
    var ldl
    var lds
    var stb
    var stw
    var st
    var stb_s
    var stw_s
    var st_s
    var stf
    var std
    var stl
    var sts
    var read
    var write
    var tmp_name
    var find_label
    var new_label
    var tmp_label
    var find_constant
    var new_constant
    var new_frame
    var end_frame
    var new_frame_code
    var end_frame_code
    var is_constant
    var is_label
    var is_func
    var is_port
    var is_port_call
    var term
    var factor
    var conditional
    var junction
    var simple_expr
    var expr
    var exprs
    var sub_expr
    var parameters
    var port
    var port_call
    var array_def
    var array_dimensions_def
    var indexed
    var indirect
    var assign
    var type_def
    var label_def
    var assign_def
    var label
    var custom_type_def
    var func
    var func_def
    var func_expr_def
    var constant_def
    var constant
    var opcode
    var statements
    var block
    var statement

    var code_init = () => {
      code.line_s('var', 'alloc', '=', '_vm.alloc.bind(_vm)')
      code.line_s('var', 'alloc_b', '=', '_vm.alloc_b.bind(_vm)')
      code.line_s('var', 'alloc_b_s', '=', '_vm.alloc_b_s.bind(_vm)')
      code.line_s('var', 'alloc_w', '=', '_vm.alloc_w.bind(_vm)')
      code.line_s('var', 'alloc_w_s', '=', '_vm.alloc_w_s.bind(_vm)')
      code.line_s('var', 'alloc_dw', '=', '_vm.alloc_dw.bind(_vm)')
      code.line_s('var', 'alloc_dw_s', '=', '_vm.alloc_dw_s.bind(_vm)')
      code.line_s('var', 'alloc_dd', '=', '_vm.alloc_dd.bind(_vm)')
      code.line_s('var', 'alloc_str', '=', '_vm.alloc_str.bind(_vm)')
      code.line_s('var', 'free', '=', '_vm.free.bind(_vm)')

      code.line_s('var', 'db', '=', '_vm.db.bind(_vm)')
      code.line_s('var', 'db_bc', '=', '_vm.db_bc.bind(_vm)')
      code.line_s('var', 'db_s', '=', '_vm.db_s.bind(_vm)')
      code.line_s('var', 'db_s_bc', '=', '_vm.db_s_bc.bind(_vm)')

      code.line_s('var', 'dw', '=', '_vm.dw.bind(_vm)')
      code.line_s('var', 'dw_bc', '=', '_vm.dw_bc.bind(_vm)')
      code.line_s('var', 'dw_s', '=', '_vm.dw_s.bind(_vm)')
      code.line_s('var', 'dw_s_bc', '=', '_vm.dw_s_bc.bind(_vm)')

      code.line_s('var', 'dl', '=', '_vm.dl.bind(_vm)')
      code.line_s('var', 'dl_bc', '=', '_vm.dl_bc.bind(_vm)')
      code.line_s('var', 'dl_s', '=', '_vm.dl_s.bind(_vm)')
      code.line_s('var', 'dl_s_bc', '=', '_vm.dl_s_bc.bind(_vm)')

      code.line_s('var', 'df', '=', '_vm.df.bind(_vm)')
      code.line_s('var', 'df_bc', '=', '_vm.df_bc.bind(_vm)')

      code.line_s('var', 'dd', '=', '_vm.dd.bind(_vm)')
      code.line_s('var', 'dd_bc', '=', '_vm.dd_bc.bind(_vm)')

      code.line('')
    }

    var code_end = () => {
      code.line('')
    }

    next_token = () => {
      t = tokens[++i]
      return t
    }

    prev_token = () => {
      t = tokens[--i]
      return t
    }

    skip_token = type => {
      let p = peek_at(i, type, tokens)
      if (p) {
        next_token()
      }
      return p ? t : false
    }

    peek_token = type => peek_at(i + 1, type, tokens)

    is_type = type => peek_at(i, type, tokens)

    is_token = o => _.isObject(o) && o.type && o.value

    token_peeks = arr => peeks_at(i + 1, arr, tokens)

    expected_next_token = type => {
      if (expected(t, type)) {
        next_token()
      }
    }

    ldb = offset => [_vm_ldb(defaults.boundscheck), '(', offset, ')']

    ldb_s = offset => [_vm_ldb(defaults.boundscheck, true), '(', offset, ')']

    ldw = offset => [_vm_ldw(defaults.boundscheck), '(', offset, ')']

    ldw_s = offset => [_vm_ldw(defaults.boundscheck, true), '(', offset, ')']

    ld = offset => [_vm_ld(defaults.boundscheck), '(', offset, ')']

    ldf = offset => [_vm_ldf(defaults.boundscheck), '(', offset, ')']

    ldd = offset => [_vm_ldd(defaults.boundscheck), '(', offset, ')']

    ldl = (offset, size) => [_vm_ldl(defaults.boundscheck), '(', offset, size, ')']

    lds = offset => [_vm_lds(defaults.boundscheck), '(', offset, ')']

    stb = (offset, value) => [_vm_stb(defaults.boundscheck), '(', offset, ',', value, ')']

    stb_s = (offset, value) => [_vm_stb(defaults.boundscheck, true), '(', offset, ',', value, ')']

    stw = (offset, value) => [_vm_stw(defaults.boundscheck), '(', offset, ',', value, ')']

    stw_s = (offset, value) => [_vm_stw(defaults.boundscheck, true), '(', offset, ',', value, ')']

    st = (offset, value) => [_vm_st(defaults.boundscheck), '(', offset, ',', value, ')']

    st_s = (offset, value) => [_vm_st(defaults.boundscheck, true), '(', offset, ',', value, ')']

    stf = (offset, value) => [_vm_stf(defaults.boundscheck), '(', offset, ',', value, ')']

    std = (offset, value) => [_vm_std(defaults.boundscheck), '(', offset, ',', value, ')']

    stl = (offset, value, size) => [_vm_stl(defaults.boundscheck), '(', offset, ',', value, size, ')']

    sts = (offset, value) => [_vm_sts(defaults.boundscheck), '(', offset, ',', value, ')']

    read = (offset, type) => {
      switch (type || defaults.type) {
        case 'i8': return ldb(offset)
        case 'i16': return ldw(offset)
        case 'i32': return ld(offset)
        case 's8': return ldb_s(offset)
        case 's16': return ldw_s(offset)
        case 's32': return ld_s(offset)
        case 'f32': return ldf(offset)
        case 'i64': return ldd(offset)
        default: return []
      }
    }

    write = (offset, value, type) => {
      switch (type || defaults.type) {
        case 'i8': return stb(offset, value)
        case 'i16': return stw(offset, value)
        case 'i32': return st(offset, value)
        case 's8': return stb_s(offset, value)
        case 's16': return stw_s(offset, value)
        case 's32': return st_s(offset, value)
        case 'f32': return stf(offset, value)
        case 'i64': return std(offset, value)
        default: return []
      }
    }

    tmp_name = name => name || 'tmp' + '_' + _.uniqueId()

    find_label = name => frame.find(name)

    new_label = (name, type, size) => {
      let l = find_label(name)
      if (!l) {
        l = frame.add(name, type, size)
      }
      else {
        error(t, 'duplicate label')
        next_token()
      }
      return l
    }

    tmp_label = (name, type, size) => {
      return new_label(tmp_name(name), type, size)
    }

    find_constant = name => constants[name]

    new_constant = (name, args) => {
      if (!find_constant(name)) {
        constants[name] = args
        return constants[name]
      }
      else {
        error(t, 'duplicate constant')
        next_token()
        return null
      }
    }

    new_frame = name => {
      if (frame) {
        frames.push(frame)
      }
      frame = new Frame(null, name)
      return frame
    }

    end_frame = () => {
      if (frame) {
        frame = frames.pop()
      }
      return frame
    }

    new_frame_code = () => frame.start_code(code)

    end_frame_code = () => frame.end_code(code)

    is_constant = () => {
      if (find_constant(t.value)) {
        constant(false)
        return true
      }
      return false
    }

    is_label = () => {
      let l = find_label(t.value)
      return l && !l.is_func ? l : null
    }

    is_port = () => t.type === 'port' || t.type === 'port_indirect'

    is_func = () => {
      let l = find_label(t.value)
      return l && l.is_func ? l : null
    }

    is_port_call = () => t.type === 'port_call'

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

      if (is_digit(t) || is_string(t)) {
        r.push(t)
        next_token()
      }
      else if (t.type === 'open_paren') {
        r = r.concat(sub_expr())
      }
      else if (is_port()) {
        r = r.concat(port())
      }
      else if (is_label()) {
        r = r.concat(label())
      }
      else if (is_func()) {
        r = r.concat(func())
      }
      else if (is_port_call()) {
        r = r.concat(port_call())
      }
      else if (is_opcode(t)) {
        r = r.concat(opcode())
      }
      else if (t.type === 'func_expr_def') {
        r = r.concat(func_expr_def())
      }
      else {
        error(t, 'number, string, port, label, function call or opcode expected')
        next_token()
      }

      if (t.type === 'open_bracket') {
        r = r.concat(indexed())
      }

      return r
    }

    expr = () => {
      let r = simple_expr()
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
      }

      // if (r.length === 1) {
        // r = r[0]
      // }

      return r
    }

    exprs = () => parameters(t.type === 'open_paren' ? 'open_paren' : null, t.type === 'open_paren' ? 'close_paren' : null, false, -1, true)

    sub_expr = () => parameters('open_paren', 'close_paren', false, 1, true)

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

      if (current_custom_type_def && current_custom_type_def.length > 0) {
        if (t.type === 'type_def') {
          type_def()
        }
        else if (!is_eos(t)) {
          error(t, 'label definition expected')
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
      else if (t.type === 'type_def') {
        type_def()
      }
      else if (t.type === 'custom_type_def') {
        custom_type_def()
      }
      else if (t.type === 'func_def') {
        func_def()
      }
      else if (t.type === 'constant_def') {
        constant_def()
      }
      else if (t.value === 'if') {
        next_token()
        code.line('if', '(', expr(), ')', '{')
        this.indent++
        block('end')
        this.indent--
        code.line('}')
      }
      else if (t.value === 'elif') {
        next_token()
        this.indent--
        code.line('}', 'else', 'if', '(', expr(), ')', '{')
        this.indent++
        block(['elif', 'else'])
      }
      else if (t.value === 'else') {
        next_token()
        this.indent--
        code.line('}', 'else', '{')
        this.indent++
        block('end')
        prev_token()
      }
      else if (t.value === 'brk') {
        next_token()
        code.line_s('break')
      }
      else if (t.value === 'whl') {
        next_token()
        code.line('while', '(', expr(), ')', '{')
        this.indent++
        block('end')
        this.indent--
        code.line_s('}')
      }
      else if (t.value === 'for') {
        next_token()
        let l
        if (t.type === 'type_def') {
          l = type_def(true, false)
        }
        else {
          error(t, 'label definition expected')
          next_token()
          return
        }
        debugger;
        expected_next_token('assign')
        let min = expr()
        skip_token('comma')
        let max = expr()
        skip_token('comma')
        code.line('for', '(', ...assign(l.name, l.type, min), ';', l.name, '<=', max, ';', l.name, '++', ')', '{')
        this.indent++
        block('end')
        this.indent--
        code.line_s('}')
      }
      else if (is_opcode(t)) {
        code.line_s(opcode())
      }
      else {
        let l = find_label(t.value)
        if (l && l.is_func) {
          code.line_s(func())
        }
        else if (l && !l.is_func) {
          if (peek_token('assign')) {
            next_token()
            assign_def(l)
          }
          else {
            label()
            next_token()
          }
        }
        else if (is_port_call()) {
          code.line_s(port_call())
        }
        else {
          error(t, 'syntax error')
          next_token()
        }
      }

      if (this.debug) {
        code.line_s('_vm.dbg_line', '(', t.row, ')')
      }
    }

    parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
      let r = []

      if (open) {
        expected_next_token(open)
      }

      if (close && t.type === close) {
        next_token()
        return r
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
          else if (t.value === 'end') {
            break
          }
          else if (!allow_ws && t.type !== 'comma') {
            error(t, 'comma' + (close ? ', ' + close : '') + ' or end of line expected')
            next_token()
            break
          }

          if (allow_ws) {
            skip_token('comma')
          }
        }
      }

      if (close) {
        expected_next_token(close)
      }

      return r
    }

    assign = (name, type, value, _write = false, entry_type) => {
      let r = ['var', name, '=']

      if (type === 'arr') {
        r = r.concat(['_vm.arr_make', '(', '\'' + (entry_type || defaults.type) + '\'', ',', '[', comma_array(_.map(value, p => p.value)), ']', ')'])
      }
      else if (type === 'fun') {
        r = r.concat(['function', '(', comma_array(_.map(value, p => p.value)), ')'])
      }
      else if (!_write) {
        r = r.concat([data_type_to_alloc(type), '(', codify(value), ')'])
      }
      else {
        r = write(name, type, value)
      }

      return r
    }

    array_def = () => parameters('open_bracket', 'close_bracket', false, -1, true)

    array_dimensions_def = () => parameters('open_bracket', 'close_bracket', true, -1, true)

    type_def = (simple = false, _assign = true) => {
      let type = t.value
      next_token()
      return label_def(type, simple, _assign)
    }

    label_def = (type, simple = false, _assign = true) => {
      let name = t.value

      if (current_custom_type_def) {
        name = current_custom_type_def.$name + '.' + name
      }

      let _new = false
      let l = find_label(name)
      if (!l) {
        l = new_label(name, type)
        _new = true
      }

      if (current_custom_type_def) {
        current_custom_type_def[js_name(t.value)] = l
      }

      next_token()

      if (is_eos(t) || simple) {
        if (_assign) {
          code.line_s(...assign(l.name, l.type, 0, _new))
        }
      }

      else {
        if (t.type === 'open_bracket') {
          l.dimensions = array_dimensions_def()
          if (!_new) {
            code.line_s('free', '(', l.name, ')')
          }
          code.line_s(...assign(l.name, 'arr', [l.size, '*', l.dimensions], _new))
          next_token()
        }

        if (t.type === 'assign') {
          assign_def(l)
        }
      }

      return l
    }

    assign_def = (l, indirect = false) => {
      next_token()

      if (t.type === 'open_bracket') {
        code.line_s(...assign(l.name, 'arr', ...array_def(), false, l.type))
      }
      else {
        code.line_s(...assign(l.name, l.type, expr()))
      }
    }

    custom_type_def = () => {
      next_token()
      let name = t.value
      let l = new_label(name)
      let prev_current_type = current_custom_type_def
      current_custom_type_def = { $name: name, $offset: 0 }
      l.custom_type = current_custom_type_def
      next_token()
      block('end')
      l.data_size = current_custom_type_def.$offset
      code.line_s(...assign(name, 'alloc', l.data_size))
      current_custom_type_def = prev_current_type
      return l
    }

    func_def = () => {
      let l = new_label(t.value)
      next_token()
      code.line('')
      new_frame()
      l.fn = parameters('open_paren', 'close_paren', true, -1, true)
      code.line(...assign(l.name, 'fun', l.fn), '{')
      this.indent++
      new_frame_code()
      block('end')
      end_frame_code()
      end_frame()
      this.indent--
      code.line_s('}')
    }

    func_expr_def = () => {
      let l = tmp_label('fn', 'fun')
      next_token()
      code.line('')
      new_frame()
      l.fn = parameters('open_paren', 'close_paren', true, -1, true)
      code.line(...assign(l.name, 'fun', l.fn), '{')
      this.indent++
      new_frame_code()
      block('end')
      end_frame_code()
      end_frame()
      this.indent--
      code.line_s('}')
      return l
    }

    constant_def = () => {
      next_token()

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

    port = () => indirect('_vm.ports[' + t.value + '].top')

    port_call = () => {
      let parts = t.value.split(':')
      next_token()
      return ['_vm.ports[' + parts[0] + '].publics.' + parts[1] + '.call', '(', comma_array(['_vm.ports[' + parts[0] + ']', ...exprs()]), ')']
    }

    indexed = () => {
      let r = ['[']
      r = r.concat(parameters('open_bracket', 'close_bracket', false, -1, false))
      r.push(']')
      return r
    }

    indirect = value => {
      let r = []
      let i

      let _ind = _.endsWith(t.type, '_indirect')

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r = r.concat([_vm_ld(defaults.boundscheck), '('])
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

    label = () => indirect(js_name(t.value))

    func = () => {
      let name = js_name(t.value)
      next_token()
      return [name, '(', comma_array(exprs()), ')']
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


    code.line('')
    code_init()
    new_frame()
    new_frame_code()
    statements()
    code.line('if', '(', 'main', ')', '{')
    code.line_s('main', '(', 'args', ')')
    code.line('}')
    end_frame_code()
    end_frame()
    code_end()


    return code.build()
  }

}
