import _ from 'lodash'
import { defaults, opcodes, comma_array, error, _vm_ldb, _vm_ldw, _vm_ld, _vm_ldl, _vm_lds, _vm_stb, _vm_stw, _vm_st, _vm_sts, _vm_stl, _vm_db, _vm_dw, _vm_dd } from '../globals.js'
import { codify, CodeGenerator, _COMPACT, _PRETTY } from './codegen.js'


export var is_eos = (t) => {
  return t.type === 'comment' || t.type === 'eol'
}

export var is_symbol = (t) => {
  return t.type === 'comp' || t.type === 'math' || t.type === 'logic' || t.type === 'assign' || t.type === 'indirectSymbol'
}

export var is_opcode = (t) => {
  return (is_symbol(t) || t.type === 'id') && opcodes[t.value] ? t.value : null
}

export var is_digit = (t) => {
  return t.type === 'byte' || t.type === 'word' || t.type === 'dword'
}

export var is_string = (t) => {
  return t.type === 'string'
}

export var is_value = (t) => {
  return is_digit(t) || is_string(t)
}

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

export var peek_at = (x, type, tokens) => {
  return peek_token(tokens[x], type)
}

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
    let len = tokens.length
    let i = 0
    let t = tokens[i]

    defaults.boundscheck = false

    let code = new CodeGenerator(_PRETTY, this)

    let extra_statement_lines = []

    let frame = null
    let frames = []

    let assign_name = null

    let unions = []
    let first_unions_var = null
    let extracting_union = false

    let contants = {}

    let js_name = (name) => { return _.camelCase(name.replace('.', '-')) }

    let next_token = () => { t = tokens[++i]; return t }

    let prev_token = () => { t = tokens[--i]; return t }

    // let next_if_token = (type) => { return peek_at(i + 1, type, tokens) ? t = tokens[++i] : false }

    // let peek_token = (type) => { return peek_at(i + 1, type, tokens) }

    let is_type = (type) => { return peek_at(i, type, tokens) }

    let is_token = (o) => { return _.isObject(o) && o.type && o.value }

    let token_peeks = (arr) => { return peeks_at(i + 1, arr, tokens) }

    let expected_next_token = (self, t, type) => {
      if (expected(self, t, type)) {
        next_token()
      }
    }

    let ldb = (offset) => {
      return [_vm_ldb(), '(', offset, ')']
    }

    let ldw = (offset) => {
      return [_vm_ldw(), '(', offset, ')']
    }

    let ld = (offset) => {
      return [_vm_ld(), '(', offset, ')']
    }

    let stb = (offset, value) => {
      return [_vm_stb(), '(', offset, ',', value, ')']
    }

    let stw = (offset, value) => {
      return [_vm_stw(), '(', offset, ',', value, ')']
    }

    let st = (offset, value) => {
      return [_vm_st(), '(', offset, ',', value, ')']
    }

    let read = (offset, size = 4) => {
      switch (size)
      {
        case 1: return ldb(offset)
        case 2: return ldw(offset)
        case 4: return ld(offset)
        default: return []
      }
    }

    let write = (offset, value, size = 4) => {
      switch (size)
      {
        case 1: return stb(offset, value)
        case 2: return stw(offset, value)
        case 4: return st(offset, value)
        default: return []
      }
    }

    let find_label = (name) => {
      name = js_name(name)
      let l = frame.labels[name]
      if (!l && !frame.global) {
        l = frames[0].labels[name]
      }
      return l
    }

    let new_label = (name, fn = false, unit_size = 4, sizes = []) => {
      name = js_name(name)
      let l = find_label(name)
      if (!l) {
        l = { fn, local: !frame.global, frame, unit_size, sizes }
        frame.labels[name] = l
      }
      else {
        error(t, 'duplicate label')
        next_token()
      }
      return l
    }

    let tmp_label = (name, fn = false, unit_size = 4, sizes = []) => {
      let tn = js_name(name || 'tmp' + '_' + _.uniqueId())
      new_label(tn, fn, unit_size, sizes)
      return tn
    }

    let find_constant = (name) => { return contants[name] }

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

    let new_frame = (name) => {
      if (frame) {
        frames.push(frame)
      }
      frame = { name, labels: {}, global: frames.length === 0 }
      code.line_s('let', 'frame', '=', '{', '}')
    }

    let end_frame = () => {
      if (frame) {
        let l = _.filter(_.keys(frame.labels), (k) => { return !frame.labels[k].fn })
        if (l.length) {
          code.line_s('_vm.mm.free', '(', comma_array(l), ')')
        }
        frame = frames.pop()
      }
    }

    let check_constant = () => {
      if (find_constant(t.value)) {
        constant(false)
        return true
      }
      return false
    }

    let check_label = () => {
      let l = find_label(t.value)
      return l && !l.fn ? l : null
    }

    let check_port = () => {
      return t.type === 'port' || t.type === 'port_indirect'
    }

    let check_func = () => {
      let l = find_label(t.value)
      return l && l.fn ? l : null
    }

    let check_port_call = () => {
      return t.type === 'port_call'
    }

    let term = () => {
      let r = []
      if (is_type(['+', '-'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    let factor = () => {
      let r = []
      if (is_type(['*', '/', '%'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    let conditional = () => {
      let r = []
      if (is_type(['<', '<=', '>', '>=', '==', '!='])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    let junction = () => {
      let r = []
      if (is_type(['&', '|'])) {
        r.push(t)
        next_token()
        r = r.concat(expr())
      }
      return r
    }

    let simple_expr = () => {
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

    let expr = () => {
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

    let exprs = () => {
      return parameters(t.type === 'open_paren' ? 'open_paren' : null, t.type === 'open_paren' ? 'close_paren' : null, false, -1, true)
    }

    let subexpr = () => {
      return parameters('open_paren', 'close_paren', false, 1, true)
    }

    let parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
      let r = []

      if (open) {
        expected_next_token(this, t, open)
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
        expected_next_token(this, t, close)
      }

      return r
    }

    let union = () => {
      let genvars = assign_name !== null
      let offset = 0

      let gen = (dd, name) => {
        let a = []
        for (let k in dd) {
          let vname = js_name([genvars ? name : '', k].join('.'))
          if (genvars) {
            extra_statement_lines.push(['frame.' + vname, '=', ...ld(name), '+', offset + 4])
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

      return ['_vm.union.make', '(', '{', aa, '}', ')']
    }

    let extract_union = () => {
      let d = {}

      extracting_union = true

      expected_next_token(this, t, 'open_curly')

      let key = null
      while (i < len && !is_eos(t) && t.type !== 'close_curly') {
        if (t.type === 'label_def' && !key) {
          key = t
          next_token()
          expected_next_token(this, t, 'assign')
        }
        else if (key) {
          d[key.value] = t.type === 'open_curly' ? extract_union() : expr()
          key = null
          expected(this, t, ['comma', 'close_curly'])
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

      expected_next_token(this, t, 'close_curly')

      extracting_union = false

      return d
    }

    let port = () => {
      return indirect('_vm.ports[' + t.value + '].top')
    }

    let port_call = () => {
      let parts = t.value.split(':')
      next_token()
      return ['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(exprs()), ')']
    }

    let bracket_def = () => {
      return parameters('open_bracket', 'close_bracket', false, -1, false)
    }

    let indexed = () => {
      let r = ['+']
      r = r.concat(parameters('open_bracket', 'close_bracket', false, 1, false))
      return r
    }

    let indirect = (value) => {
      let r = []
      let i

      let _ind = _.endsWith(t.type, '_indirect')

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r = r.concat([_vm_ld(), '('])
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

    let assign = (name, alloc, value) => {
      return ['frame.' + name, '=', '_vm.mm.' + alloc, '(', codify(value), ')']
    }

    let label_def = (simple = false) => {
      let name = js_name(t.value)
      let orig_name = name

      if (unions.length) {
        name = js_name(unions.join('.') + '.' + name)
        if (!first_unions_var) {
          first_unions_var = name
        }
      }

      let nw = false
      let l = find_label(name)
      if (!l) {
        l = new_label(name)
        nw = true
      }

      assign_name = name

      next_token()

      if (is_eos(t) || simple) {
        if (nw) {
          code.line_s(...assign(name, 'alloc', 4))
        }
        else {
          code.line_s(...st(name, 0))
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
        expected_next_token(this, t, 'assign')

        let v = expr()
        if (nw) {
          code.line_s(...assign(name, 'alloc_d', v))
        }
        else {
          code.line_s(...st(name, v))
        }
      }

      else {
        let sz = 1
        let szfn = t.value
        switch (t.value)
        {
          case 'db':
            sz = 1
            break
          case 'dw':
            sz = 2
            break
          case 'dd':
            sz = 4
            break
          default:
            error(t, 'db, dw, dd expected')
            next_token()
            assign_name = null
            return
        }

        l.unit_size = sz

        next_token()

        if (t.type === 'open_bracket') {
          let aa = bracket_def()
          if (nw) {
            code.line_s(...assign(name, 'alloc', [sz, '*', aa]))
          }
          else {
            code.line_s('_vm.mm.free', '(', name, ')')
            code.line_s(name, '=', '_vm.mm.alloc', '(', sz, '*', aa, ')')
          }
        }

        else {
          let p = parameters(null, null, false, -1, true)
          if (nw) {
            code.line_s(...assign(name, 'alloc', sz * p.length))
          }
          code.line_s('_vm.' + szfn + (defaults.boundscheck ? '_bc' : ''), '(', name, ',', comma_array(p), ')')
        }
      }

      assign_name = null
    }

    let label_assign = () => {
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

      expected_next_token(this, t, 'assign')

      let v = expr()

      let r = []
      if (_ind) {
        for (i = 0; i < count; i++) {
          r = r.concat([_vm_ld(), '('])
        }

        r.push(name)

        for (i = 0; i < count; i++) {
          r.push(')')
        }
      }

      else {
        r.push(name)
      }

      code.line_s(...write(r.concat(br).join(' '), v, l.unit_size))
    }

    let label = () => { return indirect(js_name(t.value)) }

    let union_def = (name) => {
      let old_first_union_var = first_unions_var
      first_unions_var = null
      next_token()
      unions.push(name)
      block('end')
      code.line_s('frame.' + js_name(unions.join('.')), '=', first_unions_var)
      unions.pop()
      first_unions_var = old_first_union_var
    }

    let func_def = (name, l) => {
      new_frame()
      l.fn = true
      let parms = parameters('open_paren', 'close_paren', true, -1, true)
      for (let p of parms) {
        new_label(js_name(p.value))
      }
      code.line('let ' + name, '=', 'function', '(', comma_array(parms), ')', '{')
      this.indent++
      block('end')
      end_frame()
      this.indent--
      code.line_s('}')
    }

    let func_def_expr = () => {
      next_token()
      let tn = tmp_label('fn')
      func_def(tn, find_label(tn))
      return [tn]
    }

    let func = () => {
      let name = js_name(t.value)
      next_token()
      return [name, '(', comma_array(exprs()), ')']
    }

    let constant_def = () => {
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

    let constant = () => {
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

    let opcode = (expr = false) => {
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

    let statements = () => {
      while (i < len) {
        if (!is_eos(t)) {
          statement()
        }
        else {
          next_token()
        }
      }
    }

    let block = (end = 'end') => {
      while (i < len && !is_type(end)) {
        if (!is_eos(t)) {
          statement()
        }
        else {
          next_token()
        }
      }
      expected_next_token(this, t, end)
    }

    let statement = () => {
      // while (i < len && is_eos(t)) {
        // next_token()
      // }

      let l

      if (unions.length > 0) {
        if (t.type === 'label_def') {
          label_def()
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
      else if (t.type === 'label_def') {
        label_def()
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
        if (t.type === 'label_def') {
          label_def(true)
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
        code.line('for', '(', 'frame.__' + name, '=', min, ';', 'frame.__' + name, '<=', max, ';', 'frame.__' + name, '+=', '1', ')', '{')
        this.indent++
        code.line_s(...st(name, 'frame.__' + name))
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
          debugger
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

    new_frame()
    statements()
    code.line_s(['main', '(', 'args', ')'])
    end_frame()

    return code.build()
  }

}
