import _ from 'lodash'
import { defaults, opcodes, comma_array, error, _vm_ldb, _vm_ldw, _vm_ld, _vm_ldf, _vm_ldd, _vm_ldl, _vm_lds, _vm_stb, _vm_stw, _vm_st, _vm_stf, _vm_std, _vm_stl, _vm_sts, data_type_size } from '../globals.js'
import { codify, CodeGenerator, _PRETTY } from './codegen.js'


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

    var extra_statement_lines = []

    var frame = null
    var frames = []

    var assign_name = null

    var unions = []
    var first_unions_label = null
    var extracting_union = false

    var contants = {}

    var js_name
    var next_token
    var prev_token
    var next_if_token
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
    var find_label
    var new_label
    var tmp_label
    var find_constant
    var new_constant
    var new_frame
    var end_frame
    var new_frame_code
    var end_frame_code
    var check_constant
    var check_label
    var check_port
    var check_port_call
    var term
    var factor
    var conditional
    var junction
    var simple_expr
    var expr
    var exprs
    var subexpr
    var parameters
    var union
    var extract_union
    var port
    var port_call
    var bracket_def
    var indexed
    var indirect
    var assign
    var type_def
    var label_def
    var label_assign
    var label
    var union_def
    var func_def
    var func_def_expr
    var func
    var constant_def
    var constant
    var opcode
    var statements
    var block
    var statement

    var code_init = () => {
      code.line_s('var', 'alloc', '=', '_vm.mm.alloc')
      code.line_s('var', 'alloc_b', '=', '_vm.mm.alloc_b')
      code.line_s('var', 'alloc_b_s', '=', '_vm.mm.alloc_b_s')
      code.line_s('var', 'alloc_w', '=', '_vm.mm.alloc_w')
      code.line_s('var', 'alloc_w_s', '=', '_vm.mm.alloc_w_s')
      code.line_s('var', 'alloc_dw', '=', '_vm.mm.alloc_dw')
      code.line_s('var', 'alloc_dw_s', '=', '_vm.mm.alloc_dw_s')
      code.line_s('var', 'alloc_dd', '=', '_vm.mm.alloc_dd')
      code.line_s('var', 'alloc_str', '=', '_vm.mm.alloc_str')
      code.line_s('var', 'free', '=', '_vm.mm.free')
    }

    js_name = name => _.camelCase(name.replace('.', '-'))

    next_token = () => { t = tokens[++i]; return t }

    prev_token = () => { t = tokens[--i]; return t }

    next_if_token = type => {
      let p = peek_at(i + 1, type, tokens)
      if (p) {
        t = tokens[++i]
      }
      return p ? t : false
    }

    peek_token = type => peek_at(i + 1, type, tokens)

    is_type = type => peek_at(i, type, tokens)

    is_token = o => _.isObject(o) && o.type && o.value

    token_peeks = arr => peeks_at(i + 1, arr, tokens)

    expected_next_token = (t, type) => {
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

    find_label = name => {
      name = js_name(name)
      let l = frame.labels[name]
      if (!l && !frame.global) {
        l = frames[0].labels[name]
      }
      return l
    }

    new_label = (name, fn = false, data_type, dimensions = []) => {
      data_type = data_type || defaults.type
      name = js_name(name)
      let l = find_label(name)
      if (!l) {
        l = { fn, local: !frame.global, frame, data_type, data_size: data_type_size(data_type), dimensions }
        frame.labels[name] = l
      }
      else {
        error(t, 'duplicate label')
        next_token()
      }
      return l
    }

    tmp_label = (name, fn = false, data_type, dimensions = []) => {
      data_type = data_type || defaults.type
      let tn = js_name(name || 'tmp' + '_' + _.uniqueId())
      new_label(tn, fn, data_type, dimensions)
      return tn
    }

    find_constant = name => contants[name]

    new_constant = (name, args) => {
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

    new_frame = name => {
      if (frame) {
        frames.push(frame)
      }
      frame = { name, labels: {}, global: frames.length === 0 }
      return frame
    }

    end_frame = () => {
      if (frame) {
        frame = frames.pop()
      }
      return frame
    }

    new_frame_code = () => {
      // code.line_s('var', 'frame', '=', '{', '}')
    }

    end_frame_code = () => {
      if (frame) {
        let l = _.filter(_.keys(frame.labels), k => !frame.labels[k].fn)
        if (l.length) {
          code.line_s('free', '(', comma_array(l), ')')
        }
      }
    }

    check_constant = () => {
      if (find_constant(t.value)) {
        constant(false)
        return true
      }
      return false
    }

    check_label = () => {
      let l = find_label(t.value)
      return l && !l.fn ? l : null
    }

    check_port = () => t.type === 'port' || t.type === 'port_indirect'

    let check_func = () => {
      let l = find_label(t.value)
      return l && l.fn ? l : null
    }

    check_port_call = () => t.type === 'port_call'

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
      if (is_type(['&', '|'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    simple_expr = () => {
      check_constant()

      let r = []

      if (is_digit(t) || is_string(t)) {
        r.push(t)
        next_token()
      }
      else if (t.type === 'open_paren') {
        r = r.concat(subexpr())
      }
      else if (t.type === 'open_curly') {
        r = r.concat(union())
      }
      else if (check_port()) {
        r = r.concat(port())
      }
      else if (check_label()) {
        r = r.concat(label())
      }
      else if (t.type === 'func_def_expr') {
        r = r.concat(func_def_expr())
      }
      else if (check_func()) {
        r = r.concat(func())
      }
      else if (check_port_call()) {
        r = r.concat(port_call())
      }
      else if (is_opcode(t)) {
        r = r.concat(opcode())
      }
      else {
        error(t, 'number, string, union, port, label, function call or opcode expected')
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

    subexpr = () => parameters('open_paren', 'close_paren', false, 1, true)

    parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
      let r = []

      if (open) {
        expected_next_token(t, open)
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
          else if (t.value === 'end') {
            break
          }
          else if (!allow_ws && t.type !== 'comma') {
            error(t, 'comma' + (close ? ', ' + close : '') + ' or end of line expected')
            next_token()
            break
          }

          if (allow_ws && t.type === 'comma') {
            next_token()
          }
        }
      }

      if (close) {
        expected_next_token(t, close)
      }

      return r
    }

    union = () => {
      let genvars = assign_name !== null
      let offset = 0

      let gen = (dd, name) => {
        let a = []
        for (let k in dd) {
          let vname = js_name([genvars ? name : '', k].join('.'))
          if (genvars) {
            extra_statement_lines.push(['var', vname, '=', ...ld(name), '+', offset + 4])
            new_label(vname)
            offset += 8
          }
          if (!_.isArray(dd[k]) && !is_token(dd[k])) {
            a.push('"' + k + '": ' + '{ ' + gen(dd[k], vname).join(' ') + ' }')
          }
          else {
            a.push('"' + k + '": ' + codify(dd[k]))
          }
        }
        return comma_array(a)
      }

      let d = extract_union()
      let aa = gen(d, assign_name)

      return ['_vm.union_make', '(', '{', aa, '}', ')']
    }

    extract_union = () => {
      let d = {}

      extracting_union = true

      expected_next_token(t, 'open_curly')

      let key = null
      let type = null

      while (i < len && !is_eos(t) && t.type !== 'close_curly') {
        if (t.type === 'type_def' && !key) {
          type = t.value
          expected_next_token('label_def')
          key = t
          next_token()
          expected_next_token(t, 'assign')
        }
        else if (t.type === 'label_def' && !key) {
          if (!type) {
            type = defaults.type
          }
          key = t
          next_token()
          expected_next_token(t, 'assign')
        }
        else if (key) {
          let kv = {
            type,
            value: t.type === 'open_curly' ? extract_union() : expr(),
          }
          d[key.value] = kv
          key = null
          type = null
          expected(t, ['comma', 'close_curly'])
          if (t.type === 'comma') {
            next_token()
          }
        }
        else {
          error(t, 'syntax error')
          next_token()
          break
        }
      }

      expected_next_token(t, 'close_curly')

      extracting_union = false

      return d
    }

    port = () => indirect('_vm.ports[' + t.value + '].top')

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

    assign = (name, alloc, value) => ['var', name, '=', alloc, '(', codify(value), ')']

    type_def = (simple = false) => {
      let type = t.value
      expected_next_token(t, 'label_def')
      label_def(type, simple)
    }

    label_def = (type, simple = false) => {
      type = type || defaults.type

      let name = js_name(t.value)
      let orig_name = name

      if (unions.length) {
        name = js_name(unions.join('.') + '.' + name)
        if (!first_unions_label) {
          first_unions_label = name
        }
      }

      let _new = false
      let l = find_label(name)
      if (!l) {
        l = new_label(name)
        _new = true
      }

      assign_name = name

      next_token()

      if (is_eos(t) || simple) {
        if (_new) {
          code.line_s(...assign(name, data_type_to_alloc(type), 0))
        }
        else {
          code.line_s(...write(name, type, 0))
        }
      }

      else if (t.type === 'open_paren') {
        func_def(name, l)
      }

      else if (t.type === 'union') {
        delete frame.labels[orig_name]
        union_def(orig_name)
      }

      else if (t.type === 'assign') {
        expected_next_token(t, 'assign')

        let v = expr()

        if (_new) {
          code.line_s(...assign(name, data_type_to_alloc(type), v))
        }
        else {
          code.line_s(...write(name, type, v))
        }
      }

      else {
        let def_fn = t.value
        type = define_to_data_type(t.value)
        if (!type) {
          error(t, 'data define token expected')
          next_token()
          assign_name = null
          return
        }

        let size = data_type_size(type)
        l.data_size = size
        l.data_type = type

        next_token()

        if (t.type === 'open_bracket') {
          let aa = bracket_def()
          if (_new) {
            code.line_s(...assign(name, 'alloc', [size, '*', aa]))
          }
          else {
            code.line_s('free', '(', name, ')')
            code.line_s(name, '=', 'alloc', '(', size, '*', aa, ')')
          }
        }

        else {
          let p = parameters(null, null, false, -1, true)
          if (_new) {
            code.line_s(...assign(name, 'alloc', size * p.length))
          }
          code.line_s(def_fn + (defaults.boundscheck ? '_bc' : '') + (type.starsWith('s') ? '_s' : ''), '(', name, ',', comma_array(p), ')')
        }
      }

      assign_name = null
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
      if (t.type === 'open_bracket') {
        br = ['+'].concat(bracket_def())
      }

      next_token()

      expected_next_token(t, 'assign')

      let value = expr()

      let r = []
      if (_ind) {
        for (i = 0; i < count; i++) {
          r = r.concat([_vm_ld(defaults.boundscheck), '('])
        }

        r.push(name)

        for (i = 0; i < count; i++) {
          r.push(')')
        }
      }

      else {
        r.push(name)
      }

      code.line_s(...write(r.concat(br).join(' '), value, l.data_type))
    }

    label = () => indirect(js_name(t.value))

    union_def = name => {
      let old_first_union_label = first_unions_label
      first_unions_label = null
      next_token()
      unions.push(name)
      block('end')
      code.line_s('var', js_name(unions.join('.')), '=', first_unions_label)
      unions.pop()
      first_unions_label = old_first_union_label
    }

    func_def = (name, l) => {
      code.line('')
      new_frame()
      l.fn = true
      let parms = parameters('open_paren', 'close_paren', true, -1, true)
      code.line('var', name, '=', 'function', '(', comma_array(_.map(parms, p => '__' + p.value)), ')', '{')
      this.indent++
      new_frame_code()
      for (let p of parms) {
        let n = js_name(p.value)
        new_label(n)
        code.line_s(...assign(n, data_type_to_alloc(defaults.type), '__' + n))
      }
      block('end')
      end_frame_code()
      end_frame()
      this.indent--
      code.line_s('}')
    }

    func_def_expr = () => {
      next_token()
      let tn = tmp_label('fn')
      func_def(tn, find_label(tn))
      return [tn]
    }

    func = () => {
      let name = js_name(t.value)
      next_token()
      return [name, '(', comma_array(exprs()), ')']
    }

    constant_def = () => {
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
      expected_next_token(t, end)
    }

    statement = () => {
      // while (i < len && is_eos(t)) {
        // next_token()
      // }

      let l

      if (unions.length > 0) {
        if (t.type === 'type_def') {
          type_def()
        }
        else if (!is_eos(t)) {
          error(t, 'label or union definition expected')
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
      else if (t.type === 'label_assign' || t.type === 'label_assign_indirect') {
        label_assign()
      }
      else if (t.type === 'type_def') {
        type_def()
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
        let name = js_name(t.value)
        if (t.type === 'type_def') {
          type_def(true)
        }
        else {
          error(t, 'label definition expected')
          next_token()
          return
        }
        let min = expr()
        if (t.type === 'comma') {
          next_token()
        }
        let max = expr()
        if (t.type === 'comma') {
          next_token()
        }
        code.line('for', '(', 'var', '__' + name, '=', min, ';', '__' + name, '<=', max, ';', '__' + name, '+=', '1', ')', '{')
        this.indent++
        code.line_s(...st(name, '__' + name))
        block('end')
        this.indent--
        code.line_s('}')
      }
      else if (is_opcode(t)) {
        code.line_s(opcode())
      }
      else {
        l = find_label(t.value)
        if (l && l.fn) {
          code.line_s(func())
        }
        else if (check_port_call()) {
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
        code.line_s('_vm.dbg.line', '(', t.row, ')')
      }
    }

    code.line('')
    code_init()
    new_frame()
    new_frame_code()
    statements()
    code.line_s('main', '(', 'args', ')')
    end_frame_code()
    end_frame()

    return code.build()
  }

}
