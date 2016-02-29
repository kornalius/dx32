import _ from 'lodash';
import { defaults, opcodes, comma_array, codify, is_eos, is_opcode, is_symbol, is_value, is_string, is_digit, expected, peek_at, peeks_at, error } from './globals.js';


var indent = 0;


class CodeGenerator {

  constructor () {
    this.lines = [];
  }

  clear () { this.lines = []; }

  join (a) {
    var r = a.join(' ');
    r = r.replace(/(\s\s+)/g, ' ');
    r = r.replace(/\s([\,])\s?/g, '$1 ');
    r = r.replace(/\s([\(\{\[])\s/g, '$1');
    r = r.replace(/\s([\)\}\]])/g, '$1');
    return r;
  }

  push (line) {
    line = _.padStart('', indent * 2) + line;
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
  }

  asm (path, tokens, options = {}) {
    var len = tokens.length;
    var i = 0;
    var t = tokens[i];

    var code = new CodeGenerator();

    var extra_statement_lines = [];

    var frame = null;
    var frames = [];

    var assign_name = null;

    var structs = [];

    var extracting_dict = false;

    var contants = {};

    var find_label = (name) => {
      name = js_name(name);
      var l = frame.labels[name];
      if (!l && !frame.global) {
        l = frames[0].labels[name];
      }
      return l;
    }

    var new_label = (name, fn = false, unit_size = 4, sizes = []) => {
      name = js_name(name);
      var l = find_label(name);
      if (!l) {
        l = { fn: fn, local: !frame.global, frame: frame, unit_size: unit_size, sizes: sizes };
        frame.labels[name] = l;
      }
      else {
        error(this, t, 'duplicate label');
        next();
      }
      return l;
    }

    var find_constant = (name) => { return contants[name]; }

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
    }

    var new_frame = (name) => {
      if (frame) {
        frames.push(frame);
      }
      frame = { name: name, labels: {}, global: frames.length === 0 };
    }

    var end_frame = () => {
      if (frame) {
        code.line_s(['_vm.mm.free', '(', comma_array(_.keys(frame.labels)), ')']);
        frame = frames.pop();
      }
    }

    var next = () => { return t = tokens[++i]; }

    var prev = () => { return t = tokens[--i]; }

    var next_if = (type) => { return peek_at(i + 1, type, tokens) ? t = tokens[++i] : false; }

    var peek = (type) => { return peek_at(i + 1, type, tokens); }

    var is_type = (type) => { return peek_at(i, type, tokens); }

    var isToken = (o) => { return _.isObject(o) && o.type && o.value }

    var peeks = (arr) => { return peeks_at(i + 1, arr, tokens); }

    var expected_next = (self, t, type) => {
      if (expected(self, t, type)) {
        next();
      }
    }

    var readUInt8LE = (offset) => {
      return ['_vm.mem[' + offset + ']'];
    }

    var readUInt16LE = (offset) => {
      return ['_vm.mem.readUInt16LE', '(', offset, ')'];
    }

    var readUInt32LE = (offset) => {
      return ['_vm.mem.readUInt32LE', '(', offset, ')'];
    }

    var writeUInt8LE = (value, offset) => {
      return ['_vm.mem[' + offset + ']', '=', value];
    }

    var writeUInt16LE = (value, offset) => {
      return ['_vm.mem.writeUInt16LE', '(', value, ',', offset, ')'];
    }

    var writeUInt32LE = (value, offset) => {
      return ['_vm.mem.writeUInt32LE', '(', value, ',', offset, ')'];
    }

    var write = (value, offset, size = 4) => {
      switch(size) {
        case 1: return ['_vm.mem.writeUInt8LE', '(', value, ',', offset, ')'];
        case 2: return ['_vm.mem.writeUInt16LE', '(', value, ',', offset, ')'];
        case 4: return ['_vm.mem.writeUInt32LE', '(', value, ',', offset, ')'];
      }
    }
    var check_constant = () => {
      if (find_constant(t.value)) {
        constant(false);
        return true;
      }
      return false;
    }

    var js_name = (name) => { return _.camelCase(name.replace('.', '-')); }

    var check_label = () => {
      var l = find_label(t.value);
      return l && !l.fn ? l : null;
    }

    var check_port = () => {
      return t.type === 'port' || t.type === 'port_indirect';
    }

    var check_func = () => {
      var l = find_label(t.value);
      return l && l.fn ? l : null;
    }

    var check_port_call = () => {
      return t.type === 'port_call';
    }

    var term = () => {
      var r = [];
      if (is_type(['+', '-'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    }

    var factor = () => {
      var r = [];
      if (is_type(['*', '/', '%'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    }

    var conditional = () => {
      var r = [];
      if (is_type(['<', '<=', '>', '>=', '==', '!='])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    }

    var junction = () => {
      var r = [];
      if (is_type(['&', '|'])) {
        r.push(t);
        next();
        r = r.concat(expr());
      }
      return r;
    }

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
    }

    var expr = () => {
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
    }

    var exprs = () => {
      return parameters(t.type === 'open_paren' ? 'open_paren' : null, t.type === 'open_paren' ? 'close_paren' : null, false, -1, true);
    }

    var subexpr = () => {
      return parameters('open_paren', 'close_paren', false, 1, true);
    }

    var parameters = (open = null, close = null, single_term = false, limit = -1, allow_ws = true) => {
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
    }

    var dict = () => {
      var genvars = assign_name !== null;
      var aa = [];
      var offset = 0;

      var gen = (dd, name) => {
        var a = [];
        for (var k in dd) {
          var vname = js_name([genvars ? name : '', k].join('.'));
          if (genvars) {
            extra_statement_lines.push(['var', vname, '=', '_vm.mem.readUInt32LE', '(', name, ')', '+', offset + 4]);
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
      }

      var d = extract_dict();
      var aa = gen(d, assign_name);

      return ['_vm.dict.make', '(', '{', aa, '}', ')'];
    }

    var extract_dict = () => {
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
          d[key.value] = t.type === 'open_curly' ?  extract_dict() : expr();
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
    }

    var port = () => {
      return indirect('_vm.ports[' + t.value + '].top')
    }

    var port_call = () => {
      var parts = t.value.split(':');
      next();
      return ['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(exprs()), ')'];
    }

    var bracket_def = () => {
      return parameters('open_bracket', 'close_bracket', false, -1, false)
    }

    var indexed = () => {
      var r = ['+'];
      r = r.concat(parameters('open_bracket', 'close_bracket', false, 1, false));
      return r;
    }

    var indirect = (value) => {
      var r = [];

      var _ind = _.endsWith(t.type, '_indirect');

      if (_ind) {
        for (var i = 0; i < t.count; i++) {
          r = r.concat(['_vm.mem.readUInt32LE', '(']);
        }
      }

      r.push(value);

      if (_ind) {
        for (var i = 0; i < t.count; i++) {
          r.push(')');
        }
      }

      next();

      return r;
    }

    var assign = (name, alloc, value) => {
      return ['var', name, '=', '_vm.mm.' + alloc, '(', codify(value), ')'];
    }

    var label_def = () => {
      var name = js_name(t.value);
      if (structs.length) {
        name = js_name(structs.join('.') + '.' + name);
      }

      var nw = false;
      var l = find_label(name);
      if (!l) {
        l = new_label(name);
        nw = true;
      }

      assign_name = name;

      next();

      if (is_eos(t)) {
        if (nw) {
          code.line_s(...assign(name, 'alloc', 4));
        }
        else {
          code.line_s(...writeUInt32LE(0, name));
        }
      }

      else if (t.type === 'assign') {
        expected_next(this, t, 'assign');

        var v = expr();
        if (nw) {
          code.line_s(...assign(name, 'alloc_d', v));
        }
        else {
          code.line_s(...writeUInt32LE(v, name));
        }
      }

      else {
        var sz = 1;
        var szfn = t.value;
        switch(t.value) {
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
          code.line_s('_vm.' + szfn, '(', name, ',', comma_array(p), ')');
        }
      }

      assign_name = null;
    }

    var label_assign = () => {
      var name = t.value;
      var _ind = _.endsWith(t.type, '_indirect');
      var count = t.count;

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
        for (var i = 0; i < count; i++) {
          r = r.concat(['_vm.mem.readUInt32LE', '(']);
        }

        r.push(name);

        for (var i = 0; i < count; i++) {
          r.push(')');
        }
      }
      else {
        r.push(name);
      }

      code.line_s(...write(v, r.concat(br).join(' '), l.unit_size));
    }

    var label = () => { return indirect(js_name(t.value)); }

    var struct_def = () => {
      structs.push(t.value);
      next();
      expected_next(this, t, 'struct');
      block('end');
      structs.pop();
    }

    var func_def = () => {
      var name = js_name(t.value);

      var fct = new_label(name, true);

      next();

      new_frame();
      code.line('var ' + name, '=', 'function', '(', comma_array(parameters('open_paren', 'close_paren', true, -1, true)), ')', '{');
      indent++;
      block('end');
      end_frame();
      indent--;
      code.line_s('}');
    }

    var func = () => {
      var name = js_name(t.value);

      next();

      return [name, '(', comma_array(exprs()), ')'];
    }

    var constant_def = () => {
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
    }

    var constant = () => {
      var name = t.value;

      var c = find_constant(name);
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
    }

    var opcode = (expr = false) => {
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
    }

    var statements = () => {
      while (i < len) {
        if (!is_eos(t)) {
          statement();
        }
        else {
          next();
        }
      }
    }

    var block = (end = 'end') => {
      while (i < len && !is_type(end)) {
        if (!is_eos(t)) {
          statement();
        }
        else {
          next();
        }
      }
      expected_next(this, t, end);
    }

    var statement = () => {
      // while (i < len && is_eos(t)) {
        // next();
      // }

      if (structs.length > 0) {
        if (t.type === 'label_def') {
          label_def();
        }
        else if (t.type === 'struct_def') {
          struct_def();
        }
        else if (!is_eos(t)) {
          error(this, t, 'label or struct definition expected');
          next();
        }
      }

      else {
        if (t.type === 'label_assign' || t.type === 'label_assign_indirect') {
          label_assign();
        }
        else if (t.type === 'label_def') {
          label_def();
        }
        else if (t.type === 'struct_def') {
          struct_def();
        }
        else if (t.type === 'func_def') {
          func_def();
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
        else if (t.value === 'whl') {
          next();
          code.line('while', '(', expr(), ')', '{');
          indent++;
          block('end');
          indent--;
          code.line_s('}');
        }
        else if (is_opcode(t)) {
          code.line_s(opcode());
        }
        else {
          var l = find_label(t.value);
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
      }

      if (extra_statement_lines.length) {
        for (var l of extra_statement_lines) {
          code.line_s(...l);
        }
        extra_statement_lines = [];
      }

    }

    new_frame();
    statements();
    code.line_s(['main', '(', 'args', ')']);
    end_frame();

    return code.build();
  }

}

export default Assembler
