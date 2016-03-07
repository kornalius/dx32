import _ from 'lodash';
import { defaults, opcodes, comma_array, codify, is_eos, is_opcode, is_string, is_digit, expected, peek_at, peeks_at, error, _vmldb, _vmldw, _vmld, _vmldl, _vmlds, _vmstb, _vmstw, _vmst, _vmsts, _vmstl, _vmdb, _vmdw, _vmdd } from './globals.js';


var indent = 0;

const _COMPACT = 1;
const _PRETTY = 2;

class CodeGenerator {

  constructor (style) {
    this.lines = [];
    this.style = style || _COMPACT;
  }

  clear () { this.lines = []; }

  join (a) {
    var r = a.join(' ');
    if (this.style === _COMPACT) {
      r = r.replace(/(\s\s+)/g, ' ');
      r = r.replace(/\s?([\(\{\[\)\}\]\<\>\=\,\;\:\+\-\*\/\%\^\&\|])\s?/g, '$1');
    }
    else if (this.style === _PRETTY) {
      r = r.replace(/(\s\s+)/g, ' ');
      r = r.replace(/\s?\,\s?/g, ', ');
      r = r.replace(/\s([\(\{\[])\s/g, '$1');
      r = r.replace(/\s([\)\}\]])/g, '$1');
      r = r.replace(/\:\{/g, ': {');
    }
    return r;
  }

  push (line) {
    if (this.style === _PRETTY) {
      line = _.padStart('', indent * 2) + line;
    }
    console.log(line);
    this.lines.push(line);
  }

  line (...args) { this.push(this.join(codify(args))); }

  line_s (...args) { this.push(_.trimEnd(this.join(codify(args))) + ';'); }

  build () { return this.lines.join('\n'); }
}


class Assembler {

  constructor () {
    this.errors = 0;
    this.debug = false;
  }

  asm (path, tokens, options = {}) {
    var len = tokens.length;
    var i = 0;
    var t = tokens[i];

    defaults.boundscheck = false;

    var code = new CodeGenerator(_PRETTY);

    var extra_statement_lines = [];

    var frame = null;
    var frames = [];

    var assign_name = null;

    var structs = [];
    var first_struct_var = null;

    var extracting_dict = false;

    var contants = {};

    var expr;
    var exprs;
    var subexpr;
    var parameters;
    var block;
    var statements;
    var statement;
    var constant;
    var label;
    var label_def;
    var struct_def;
    var func;
    var func_def;
    var func_def_expr;
    var dict;
    var extract_dict;
    var port;
    var port_call;
    var indexed;
    var opcode;
    var bracket_def;
    var indirect;
    var assign;
    var label_assign;
    var constant_def;

    var js_name = (name) => { return _.camelCase(name.replace('.', '-')); };

    var next = () => { t = tokens[++i]; return t; };

    var prev = () => { t = tokens[--i]; return t; };

    var next_if = (type) => { return peek_at(i + 1, type, tokens) ? t = tokens[++i] : false; };

    var peek = (type) => { return peek_at(i + 1, type, tokens); };

    var is_type = (type) => { return peek_at(i, type, tokens); };

    var isToken = (o) => { return _.isObject(o) && o.type && o.value; };

    var peeks = (arr) => { return peeks_at(i + 1, arr, tokens); };

    var expected_next = (self, t, type) => {
      if (expected(self, t, type)) {
        next();
      }
    };

    var ldb = (offset) => {
      return [_vmldb(), '(', offset, ')'];
    };

    var ldw = (offset) => {
      return [_vmldw(), '(', offset, ')'];
    };

    var ld = (offset) => {
      return [_vmld(), '(', offset, ')'];
    };

    var stb = (offset, value) => {
      return [_vmstb(), '(', offset, ',', value, ')'];
    };

    var stw = (offset, value) => {
      return [_vmstw(), '(', offset, ',', value, ')'];
    };

    var st = (offset, value) => {
      return [_vmst(), '(', offset, ',', value, ')'];
    };

    var read = (offset, size = 4) => {
      switch (size)
      {
        case 1: return ldb(offset);
        case 2: return ldw(offset);
        case 4: return ld(offset);
        default: return [];
      }
    };

    var write = (offset, value, size = 4) => {
      switch (size)
      {
        case 1: return stb(offset, value);
        case 2: return stw(offset, value);
        case 4: return st(offset, value);
        default: return [];
      }
    };

    var find_label = (name) => {
      name = js_name(name);
      var l = frame.labels[name];
      if (!l && !frame.global) {
        l = frames[0].labels[name];
      }
      return l;
    };

    var new_label = (name, fn = false, unit_size = 4, sizes = []) => {
      name = js_name(name);
      var l = find_label(name);
      if (!l) {
        l = { fn, local: !frame.global, frame, unit_size, sizes };
        frame.labels[name] = l;
      }
      else {
        error(this, t, 'duplicate label');
        next();
      }
      return l;
    };

    var tmp_label = (name, fn = false, unit_size = 4, sizes = []) => {
      var tn = js_name(name || 'tmp' + '_' + _.uniqueId());
      new_label(tn, fn, unit_size, sizes);
      return tn;
    };

    var find_constant = (name) => { return contants[name]; };

    var new_constant = (name, args) => {
      if (!find_constant(name)) {
        contants[name] = args;
        return contants[name];
      }
      else {
        error(this, t, 'duplicate constant');
        next();
        return null;
      }
    };

    var new_frame = (name) => {
      if (frame) {
        frames.push(frame);
      }
      frame = { name, labels: {}, global: frames.length === 0 };
    };

    var end_frame = () => {
      if (frame) {
        var l = _.filter(_.keys(frame.labels), (k) => { return !frame.labels[k].fn; });
        if (l.length) {
          code.line_s(['_vm.mm.free', '(', comma_array(l), ')']);
        }
        frame = frames.pop();
      }
    };

    var check_constant = () => {
      if (find_constant(t.value)) {
        constant(false);
        return true;
      }
      return false;
    };

    var check_label = () => {
      var l = find_label(t.value);
      return l && !l.fn ? l : null;
    };

    var check_port = () => {
      return t.type === 'port' || t.type === 'port_indirect';
    };

    var check_func = () => {
      var l = find_label(t.value);
      return l && l.fn ? l : null;
    };

    var check_port_call = () => {
      return t.type === 'port_call';
    };

    var term = () => {
      var r = [];
      if (is_type(['+', '-'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    };

    var factor = () => {
      var r = [];
      if (is_type(['*', '/', '%'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    };

    var conditional = () => {
      var r = [];
      if (is_type(['<', '<=', '>', '>=', '==', '!='])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    };

    var junction = () => {
      var r = [];
      if (is_type(['&', '|'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    };

    var simple_expr = () => {
      check_constant();

      var r = [];

      if (is_digit(t) || is_string(t)) {
        r.push(t);
        next();
      }
      else if (t.type === 'open_paren') {
        r = r.concat(subexpr());
      }
      else if (t.type === 'open_curly') {
        r = r.concat(dict());
      }
      else if (check_port()) {
        r = r.concat(port());
      }
      else if (check_label()) {
        r = r.concat(label());
      }
      else if (t.type === 'func_def_expr') {
        r = r.concat(func_def_expr());
      }
      else if (check_func()) {
        r = r.concat(func());
      }
      else if (check_port_call()) {
        r = r.concat(port_call());
      }
      else if (is_opcode(t)) {
        r = r.concat(opcode());
      }
      else {
        error(this, t, 'number, string, dict, port, label, function call or opcode expected');
        next();
      }

      if (t.type === 'open_bracket') {
        r = r.concat(indexed());
      }

      return r;
    };

    expr = () => {
      var r = simple_expr();
      if (r.length) {
        var tm = term();
        if (tm.length) {
          r = r.concat(tm);
        }
        else {
          var f = factor();
          if (f.length) {
            r = r.concat(f);
          }
          else {
            var c = conditional();
            if (c.length) {
              r = r.concat(c);
            }
            else {
              var j = junction();
              if (j.length) {
                r = r.concat(j);
              }
            }
          }
        }
      }

      // if (r.length === 1) {
        // r = r[0];
      // }

      return r;
    };

    exprs = () => {
      return parameters(t.type === 'open_paren' ? 'open_paren' : null, t.type === 'open_paren' ? 'close_paren' : null, false, -1, true);
    };

    subexpr = () => {
      return parameters('open_paren', 'close_paren', false, 1, true);
    };

    parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
      var r = [];

      if (open) {
        expected_next(this, t, open);
      }

      if (close && t.type === close) {
        next();
        return [];
      }

      while (i < len && !is_eos(t)) {
        if (single_term) {
          r.push(t);
          next();
        }
        else {
          r.push(expr());
        }

        if (limit !== -1 && r.length === limit) {
          break;
        }

        if (t && !is_eos(t)) {
          if (close && t.type === close) {
            break;
          }
          else if (t.value === 'end') {
            break;
          }
          else if (!allow_ws && t.type !== 'comma') {
            error(this, t, 'comma' + (close ? ', ' + close : '') + ' or end of line expected');
            next();
            break;
          }

          if (allow_ws && t.type === 'comma') {
            next();
          }
        }
      }

      if (close) {
        expected_next(this, t, close);
      }

      return r;
    };

    dict = () => {
      var genvars = assign_name !== null;
      var offset = 0;

      var gen = (dd, name) => {
        var a = [];
        for (var k in dd) {
          var vname = js_name([genvars ? name : '', k].join('.'));
          if (genvars) {
            extra_statement_lines.push(['var', vname, '=', ...ld(name), '+', offset + 4]);
            new_label(vname);
            offset += 8;
          }
          if (!_.isArray(dd[k]) && !isToken(dd[k])) {
            a.push('"' + k + '": ' + '{ ' + gen(dd[k], vname).join(' ') + ' }');
          }
          else {
            a.push('"' + k + '": ' + codify(dd[k]));
          }
        }
        return comma_array(a);
      };

      var d = extract_dict();
      var aa = gen(d, assign_name);

      return ['_vm.dict.make', '(', '{', aa, '}', ')'];
    };

    extract_dict = () => {
      var d = {};

      extracting_dict = true;

      expected_next(this, t, 'open_curly');

      var key = null;
      while (i < len && !is_eos(t) && t.type !== 'close_curly') {
        if (t.type === 'label_def' && !key) {
          key = t;
          next();
          expected_next(this, t, 'assign');
        }
        else if (key) {
          d[key.value] = t.type === 'open_curly' ? extract_dict() : expr();
          key = null;
          expected(this, t, ['comma', 'close_curly']);
          if (t.type === 'comma') {
            next();
          }
        }
        else {
          error(this, t, 'syntax error');
          next();
          break;
        }
      }

      expected_next(this, t, 'close_curly');

      extracting_dict = false;

      return d;
    };

    port = () => {
      return indirect('_vm.ports[' + t.value + '].top');
    };

    port_call = () => {
      var parts = t.value.split(':');
      next();
      return ['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(exprs()), ')'];
    };

    bracket_def = () => {
      return parameters('open_bracket', 'close_bracket', false, -1, false);
    };

    indexed = () => {
      var r = ['+'];
      r = r.concat(parameters('open_bracket', 'close_bracket', false, 1, false));
      return r;
    };

    indirect = (value) => {
      var r = [];
      var i;

      var _ind = _.endsWith(t.type, '_indirect');

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r = r.concat([_vmld(), '(']);
        }
      }

      r.push(value);

      if (_ind) {
        for (i = 0; i < t.count; i++) {
          r.push(')');
        }
      }

      next();

      return r;
    };

    assign = (name, alloc, value) => {
      return ['var', name, '=', '_vm.mm.' + alloc, '(', codify(value), ')'];
    };

    label_def = (simple = false) => {
      var name = js_name(t.value);
      var orig_name = name;

      if (structs.length) {
        name = js_name(structs.join('.') + '.' + name);
        if (!first_struct_var) {
          first_struct_var = name;
        }
      }

      var nw = false;
      var l = find_label(name);
      if (!l) {
        l = new_label(name);
        nw = true;
      }

      assign_name = name;

      next();

      if (is_eos(t) || simple) {
        if (nw) {
          code.line_s(...assign(name, 'alloc', 4));
        }
        else {
          code.line_s(...st(name, 0));
        }
      }

      else if (t.type === 'open_paren') {
        func_def(name, l);
      }

      else if (t.type === 'struct') {
        delete frame.labels[orig_name];
        struct_def(orig_name);
      }

      else if (t.type === 'assign') {
        expected_next(this, t, 'assign');

        var v = expr();
        if (nw) {
          code.line_s(...assign(name, 'alloc_d', v));
        }
        else {
          code.line_s(...st(name, v));
        }
      }

      else {
        var sz = 1;
        var szfn = t.value;
        switch (t.value)
        {
          case 'db':
            sz = 1;
            break;
          case 'dw':
            sz = 2;
            break;
          case 'dd':
            sz = 4;
            break;
          default:
            error(this, t, 'db, dw, dd expected');
            next();
            assign_name = null;
            return;
        }

        l.unit_size = sz;

        next();

        if (t.type === 'open_bracket') {
          var aa = bracket_def();
          if (nw) {
            code.line_s(...assign(name, 'alloc', [sz, '*', aa]));
          }
          else {
            code.line_s('_vm.mm.free', '(', name, ')');
            code.line_s(name, '=', '_vm.mm.alloc', '(', sz, '*', aa, ')');
          }
        }

        else {
          var p = parameters(null, null, false, -1, true);
          if (nw) {
            code.line_s(...assign(name, 'alloc', sz * p.length));
          }
          code.line_s('_vm.' + szfn + (defaults.boundscheck ? '_bc' : ''), '(', name, ',', comma_array(p), ')');
        }
      }

      assign_name = null;
    };

    label_assign = () => {
      var name = js_name(t.value);
      var _ind = _.endsWith(t.type, '_indirect');
      var count = t.count;
      var i;

      var l = find_label(name);
      if (!l) {
        error(this, t, 'variable ' + name + ' is undefined');
        next();
        return;
      }

      var br = [];
      if (t.type === 'open_bracket') {
        br = ['+'].concat(bracket_def());
      }

      next();

      expected_next(this, t, 'assign');

      var v = expr();

      var r = [];
      if (_ind) {
        for (i = 0; i < count; i++) {
          r = r.concat([_vmld(), '(']);
        }

        r.push(name);

        for (i = 0; i < count; i++) {
          r.push(')');
        }
      }

      else {
        r.push(name);
      }

      code.line_s(...write(r.concat(br).join(' '), v, l.unit_size));
    };

    label = () => { return indirect(js_name(t.value)); };

    struct_def = (name) => {
      var old_first_struct_var = first_struct_var;
      first_struct_var = null;
      next();
      structs.push(name);
      block('end');
      code.line_s('var', js_name(structs.join('.')), '=', first_struct_var);
      structs.pop();
      first_struct_var = old_first_struct_var;
    };

    func_def = (name, l) => {
      new_frame();
      l.fn = true;
      var parms = parameters('open_paren', 'close_paren', true, -1, true);
      for (var p of parms) {
        new_label(js_name(p.value));
      }
      code.line('var ' + name, '=', 'function', '(', comma_array(parms), ')', '{');
      indent++;
      block('end');
      end_frame();
      indent--;
      code.line_s('}');
    };

    func_def_expr = () => {
      next();
      var tn = tmp_label('fn');
      func_def(tn, find_label(tn));
      return [tn];
    };

    func = () => {
      var name = js_name(t.value);
      next();
      return [name, '(', comma_array(exprs()), ')'];
    };

    constant_def = () => {
      var name = t.value;

      next();

      var a = [];
      var start = t.start;
      var col = t.col;
      var row = t.row;
      while (i < len && !is_eos(t)) {
        t.col -= col;
        t.row -= row;
        t.start -= start;
        t.end -= start;
        a.push(t);
        next();
      }

      next();

      return new_constant(name, a);
    };

    constant = () => {
      var c = find_constant(t.value);
      var col = t.col;
      var row = t.row;
      var start = t.start;
      var nc = _.cloneDeep(c);
      for (var a of nc) {
        a.col += col;
        a.row += row;
        a.start += start;
        a.end += start;
      }
      tokens.splice(i, 1, ...nc);

      t = tokens[i];
      len = tokens.length;
    };

    opcode = (expr = false) => {
      var r = [];

      var name = is_opcode(t);
      if (expr && !opcodes[name].expr) {
        error(this, t, 'opcode cannot be used in an expression');
        next();
        return [];
      }

      next();
      var _args = exprs();

      // if (_args.length === 1) {
        // _args = _args[0];
      // }

      if (opcodes[name]) {
        var a = [];
        if (opcodes[name].gen) {
          a = opcodes[name].gen(..._args);
        }
        else {
          a = [opcodes[name], '(', _args, ')'];
        }
        r.push(expr ? ['(', a, ')'] : a);
      }
      else {
        error(this, t, 'invalid opcode');
        next();
        return [];
      }

      return r;
    };

    statements = () => {
      while (i < len) {
        if (!is_eos(t)) {
          statement();
        }
        else {
          next();
        }
      }
    };

    block = (end = 'end') => {
      while (i < len && !is_type(end)) {
        if (!is_eos(t)) {
          statement();
        }
        else {
          next();
        }
      }
      expected_next(this, t, end);
    };

    statement = () => {
      // while (i < len && is_eos(t)) {
        // next();
      // }

      var l;

      if (structs.length > 0) {
        if (t.type === 'label_def') {
          label_def();
        }
        else if (!is_eos(t)) {
          error(this, t, 'label or struct definition expected');
          next();
        }
      }
      else if (t.type === 'boundscheck') {
        defaults.boundscheck = true;
        next();
      }
      else if (t.type === 'debug') {
        this.debug = true;
        next();
      }
      else if (t.type === 'label_assign' || t.type === 'label_assign_indirect') {
        label_assign();
      }
      else if (t.type === 'label_def') {
        label_def();
      }
      else if (t.type === 'constant_def') {
        constant_def();
      }
      else if (t.value === 'if') {
        next();
        code.line('if', '(', expr(), ')', '{');
        indent++;
        block('end');
        indent--;
        code.line('}');
      }
      else if (t.value === 'elif') {
        next();
        indent--;
        code.line('}', 'else', 'if', '(', expr(), ')', '{');
        indent++;
        block(['elif', 'else']);
      }
      else if (t.value === 'else') {
        next();
        indent--;
        code.line('}', 'else', '{');
        indent++;
        block('end');
        prev();
      }
      else if (t.value === 'brk') {
        next();
        code.line_s('break');
      }
      else if (t.value === 'whl') {
        next();
        code.line('while', '(', expr(), ')', '{');
        indent++;
        block('end');
        indent--;
        code.line_s('}');
      }
      else if (t.value === 'for') {
        next();
        var name = js_name(t.value);
        if (t.type === 'label_def') {
          label_def(true);
        }
        else {
          error(this, t, 'label definition expected');
          next();
          return;
        }
        var min = expr();
        if (t.type === 'comma') {
          next();
        }
        var max = expr();
        if (t.type === 'comma') {
          next();
        }
        code.line('for', '(', 'var', '__' + name, '=', min, ';', '__' + name, '<=', max, ';', '__' + name, '+=', '1', ')', '{');
        indent++;
        code.line_s(...st(name, '__' + name));
        block('end');
        indent--;
        code.line_s('}');
      }
      else if (is_opcode(t)) {
        code.line_s(opcode());
      }
      else {
        l = find_label(t.value);
        if (l && l.fn) {
          code.line_s(func());
        }
        else if (check_port_call()) {
          code.line_s(port_call());
        }
        else {
          debugger;
          error(this, t, 'syntax error');
          next();
        }
      }

      if (extra_statement_lines.length) {
        for (l of extra_statement_lines) {
          code.line_s(...l);
        }
        extra_statement_lines = [];
      }

      if (this.debug) {
        code.line_s('_vm.dbg.line', '(', t.row, ')');
      }
    };

    new_frame();
    statements();
    code.line_s(['main', '(', 'args', ')']);
    end_frame();

    return code.build();
  }

}

export default Assembler;
