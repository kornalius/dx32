import _ from 'lodash'
import { defaults, opcodes, comma_array, error, type_size, type_class, to_type } from '../globals.js'
import { codify, CodeGenerator, _PRETTY } from './codegen.js'


export var is_eos = t => t.type === 'comment' || t.type === 'eol'

export var is_symbol = t => t.type === 'comp' || t.type === 'math' || t.type === 'logic' || t.type === 'assign' || t.type === 'indirect_symbol'

export var is_opcode = t => (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null

export var is_digit = t => t.type === 'i8' || t.type === 's8' || t.type === 'i16' || t.type === 's16' || t.type === 'i32' || t.type === 's32' || t.type === 'f32' || t.type === 'i64'

export var is_string = t => t.type === 'string'

export var is_value = t => is_digit(t) || is_string(t)

export var is_comma = t => t.type === 'comma'

export var is_open_paren = t => t.type === 'open_paren'

export var is_open_curly = t => t.type === 'open_curly'

export var is_open_bracket = t => t.type === 'open_bracket'

export var is_func_def = t => t.type === 'func_def'

export var is_func_def_expr = t => t.type === 'func_def_expr'

export var is_constant_def = t => t.type === 'constant_def'

export var is_label_def = t => t.type === 'label_def'

export var is_label_assign = t => t.type === 'label_assign'

export var is_signed_def = t => t.type === 'type_def'

export var is_type_def = t => t.type === 'type_def' || t.type === 'signed_def'

export var is_port = t => t.type === 'port'

export var is_assign = t => t.type === 'assign'

export var is_port_call = t => t.type === 'port_call'


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
    var frames = []

    var contants = {}

    var js_name
    var next_token
    var prev_token
    var next_if_token
    var peek_token
    var is_type
    var is_token
    var is_constant
    var is_label
    var is_func
    var token_peeks
    var expected_next_token
    var new_instance
    var free_instance
    var get_instance_value
    var set_instance_value
    var instance_addr
    var find_label
    var new_label
    var tmp_label
    var find_constant
    var new_constant
    var new_frame
    var end_frame
    var gen_start_frame_code
    var gen_end_frame_code
    var term
    var factor
    var conditional
    var junction
    var simple_expr
    var expr
    var exprs
    var subexpr
    var parameters
    var gen_union
    var union
    var extract_union
    var port
    var port_call
    var bracket_def
    var indexed
    var assign
    var get_type_def
    var type_def
    var label_def
    var label_assign
    var label
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

    is_constant = () => {
      if (find_constant(t.value)) {
        constant(false)
        return true
      }
      return false
    }

    is_label = () => {
      let l = find_label(t.value)
      return l && !l.fn ? l : null
    }

    is_func = () => {
      let l = find_label(t.value)
      return l && l.fn ? l : null
    }

    new_instance = (type, value) => ['new', type_class(type), '(', value, ')']

    free_instance = label => [label, '.free', '(', ')']

    get_instance_value = label => [label, '.value']

    set_instance_value = (label, value) => [get_instance_value(label), '=', value]

    instance_addr = label => [label, '.addr']

    find_label = name => {
      name = js_name(name)
      let l = frame.labels[name]
      if (!l && !frame.global) {
        l = frames[0].labels[name]
      }
      return l
    }

    new_label = (name, fn, type, dimensions) => {
      type = type || defaults.type
      name = js_name(name)
      let l = find_label(name)
      if (!l) {
        l = {
          name,
          fn,
          local: !frame.global,
          frame,
          type,
          size: type_size(type),
          dimensions: dimensions || []
        }
        frame.labels[name] = l
      }
      else {
        error(t, 'duplicate label')
        next_token()
      }
      return l
    }

    tmp_label = (name, fn, type, dimensions) => {
      type = type || defaults.type
      return new_label(name || 'tmp' + '_' + _.uniqueId(), fn, type, dimensions)
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

    gen_start_frame_code = () => {
      // code.line_s('var', 'frame', '=', '{', '}')
    }

    gen_end_frame_code = () => {
      if (frame) {
        let labels = _.filter(_.keys(frame.labels), k => !frame.labels[k].fn)
        if (labels.length) {
          for (let l of labels) {
            code.line_s(l, '.free', '(', ')')
          }
        }
      }
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
      if (is_type(['&', '|'])) {
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
      else if (is_open_paren(t)) {
        r = r.concat(subexpr())
      }
      else if (is_open_curly(t)) {
        r = r.concat(union())
      }
      else if (is_port(t)) {
        r = r.concat(port())
      }
      else if (is_label(t)) {
        r = r.concat(label())
      }
      else if (is_func_def_expr(t)) {
        r = r.concat(func_def_expr())
      }
      else if (is_func(t)) {
        r = r.concat(func())
      }
      else if (is_port_call(t)) {
        r = r.concat(port_call())
      }
      else if (is_opcode(t)) {
        r = r.concat(opcode())
      }
      else {
        error(t, 'number, string, union, port, label, function call or opcode expected')
        next_token()
      }

      if (is_open_bracket(t)) {
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

    exprs = () => parameters(is_open_paren(t) ? 'open_paren' : null, is_open_paren(t) ? 'close_paren' : null, false, -1, true)

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

          if (allow_ws && is_comma(t)) {
            next_token()
          }
        }
      }

      if (close) {
        expected_next_token(t, close)
      }

      return r
    }

    gen_union = dd => {
      let a = []
      for (let k in dd) {
        if (!_.isArray(dd[k].value) && !is_token(dd[k].value)) {
          a.push('"' + k + '": ' + '{ ' + gen_union(dd[k].value).join(' ') + ' }')
        }
        else {
          a.push('"' + k + '": ' + codify(dd[k].value))
        }
      }
      return comma_array(a)
    }

    union = () => {
      let d = extract_union()
      let aa = gen_union(d)
      return new_instance('uni', ['{', aa, '}'])
    }

    extract_union = () => {
      let d = {}

      expected_next_token(t, 'open_curly')

      let key = null
      let type = defaults.type
      let signed = null

      while (i < len && !is_eos(t) && t.type !== 'close_curly') {
        if (is_type_def(t) && !key) {
          let ts = type_def()
          type = ts.type
          signed = ts.type
          next_token()
        }
        else if (is_label_def(t) && !key) {
          key = t
          next_token()
          expected_next_token(t, 'assign')
        }
        else if (key) {
          let kv = {
            type: to_type(type, signed),
            value: is_open_curly(t) ? extract_union() : expr(),
          }
          d[key.value] = kv
          key = null
          type = defaults.type
          signed = false
          expected(t, ['comma', 'close_curly'])
          if (is_comma(t)) {
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

      return d
    }

    port = () => ['_vm.ports', '[', t.value, ']', '.top']

    port_call = () => {
      let parts = t.value.split(':')
      next_token()
      let p = '_vm.ports[' + parts[0] + ']'
      return [p + '.publics.' + parts[1] + '.call', '(', comma_array([p, ...exprs()]), ')']
    }

    bracket_def = () => parameters('open_bracket', 'close_bracket', false, -1, false)

    indexed = () => ['+'].concat(parameters('open_bracket', 'close_bracket', false, 1, false))

    assign = (name, type, value, _var = true) => [_var ? 'var' : '', name, '=', new_instance(type, codify(value))]

    get_type_def = () => {
      let signed = false
      if (is_signed_def(t)) {
        signed = true
        expected_next_token(t, 'type_def')
      }
      let type = t.value
      return { type, signed }
    }

    type_def = (simple = false) => {
      let ts = get_type_def()
      expected_next_token(t, 'label_def')
      label_def(to_type(ts.type, ts.signed), simple)
      return { type: ts.type, signed: ts.signed }
    }

    label_def = (type, simple = false) => {
      type = type || defaults.type
      let name = js_name(t.value)

      let _new = false
      let l = find_label(name)
      if (!l) {
        l = new_label(name)
        _new = true
      }

      next_token()

      if (is_eos(t) || simple) {
        if (_new) {
          code.line_s(...assign(name, type, 0))
        }
        else {
          code.line_s(...set_instance_value(name, 0))
        }
      }

      else if (is_open_paren(t)) {
        func_def(name, l)
      }

      else if (is_assign(t)) {
        label_assign(name, type)
      }

      else {
        error(t, 'syntax error')
      }
    }

    label_assign = (name, type) => {
      type = type || defaults.type
      if (name) {
        name = js_name(name)
      }
      else {
        name = js_name(t.value)
        next_token()
        expected_next_token(t, 'assign')
      }

      let l = find_label(name)
      if (!l) {
        error(t, 'variable ' + name + ' is undefined')
        return
      }

      let value = []
      if (is_open_bracket(t)) {
        value = bracket_def()
      }
      else {
        value = expr()
      }

      code.line_s(...set_instance_value(name, value))
    }

    label = () => [js_name(t.value)]

    func_def = (name, l) => {
      code.line('')
      new_frame()
      l.fn = true
      let parms = parameters('open_paren', 'close_paren', true, -1, true)
      code.line('var', name, '=', 'function', '(', comma_array(_.map(parms, p => '__' + p.value)), ')', '{')
      this.indent++
      gen_start_frame_code()
      for (let p of parms) {
        let l = new_label(p.value)
        let n = l.name
        code.line_s(...assign(n, type_class(defaults.type), '__' + n))
      }
      block('end')
      gen_end_frame_code()
      end_frame()
      this.indent--
      code.line_s('}')
    }

    func_def_expr = () => {
      next_token()
      let l = tmp_label('fn')
      let tn = l.name
      func_def(tn, l)
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

      if (t.type === 'boundscheck') {
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
      else if (is_type_def(t)) {
        type_def()
      }
      else if (is_label_def(t)) {
        label_def()
      }
      else if (is_constant_def(t)) {
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
        if (is_type_def(t)) {
          type_def(true)
        }
        else if (is_label_def(t)) {
          label_def(null, true)
        }
        else {
          error(t, 'label definition expected')
          next_token()
          return
        }

        let name = js_name(t.value)

        let min = expr()
        if (is_comma(t)) {
          next_token()
        }

        let max = expr()
        if (is_comma(t)) {
          next_token()
        }

        code.line('for', '(', 'var', name, '=', min, ';', '__' + name, '<=', max, ';', '__' + name, '+=', '1', ')', '{')
        this.indent++
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
        else if (is_port_call(t)) {
          code.line_s(port_call())
        }
        else {
          error(t, 'syntax error')
          next_token()
        }
      }

      if (this.debug) {
        code.line_s('_vm.dbg.line', '(', t.row, ')')
      }
    }

    code.line('')
    code_init()
    new_frame()
    gen_start_frame_code()
    statements()
    code.line_s('main', '(', 'args', ')')
    gen_end_frame_code()
    end_frame()

    return code.build()
  }

}
