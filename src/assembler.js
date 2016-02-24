import _ from 'lodash';
import { defaults, opcodes, comma_array, is_eos, is_opcode, is_symbol, is_value, is_string, is_digit, expected, peek_at, peeks_at, error } from './globals.js';


class Generator {

  constructor () {
    this.lines = [];
  }

  clear () { this.lines = []; }

  process (args) {
    var r = [];
    for (var a of args) {
      if (_.isArray(a)) {
        r = r.concat(this.process(a));
      }
      else {
        r.push(a);
      }
    }
    return r;
  }

  line (...args) { this.lines.push(this.process(args).join(' ')); }

  line_s (...args) { this.lines.push(this.process(args).join(' ') + ';'); }

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

    var code = new Generator();

    var frame = null;
    var frames = [];

    var structs = [];

    var contants = {};

    var find_label = (name) => {
      var l = frame.labels[name];
      if (!l && !frame.global) {
        l = frames[0].labels[name];
      }
      return l;
    }

    var new_label = (name, fn = false) => {
      var l = find_label(name);
      if (!l) {
        l = { fn: fn, local: !frame.global, frame: frame };
        frame.labels[name] = l;
      }
      else {
        error(this, t, 'duplicate label');
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
      if (frames.length > 0) {
        frame = frames.pop();
      }
    }

    var args_values = (_args) => {
      var r = [];
      if (!_.isArray(_args)) {
        _args = [_args];
      }
      for (var a of _args) {
        if (a.type) {
          if (is_string(a)) {
            r.push('"' + a.value + '"');
          }
          else {
            r.push(a.value);
          }
        }
        else if (_.isArray(a)) {
          r.push(args_values(a));
        }
        else {
          r.push(a);
        }
      }
      return r;
    }

    var next = () => { return t = tokens[++i]; }

    var prev = () => { return t = tokens[--i]; }

    var next_if = (type) => { return peek_at(i + 1, type, tokens) ? t = tokens[++i] : false; }

    var peek = (type) => { return peek_at(i + 1, type, tokens); }

    var peeks = (arr) => { return peeks_at(i + 1, arr, tokens); }

    var peek_indexed = () => { return peeks_at(i + 1, [/[\+\-]/, 'value'], tokens); }

    var args = (type = '') => {
      var a = [];

      if (type === 'def' || type === 'func_def') {
        while (i < len && !is_eos(t)) {
          if (t.type !== 'comma') {
            if (type === 'func_def' && t.type === 'close_paren') {
              break;
            }
            else if (type === 'def' && t.type === 'close_bracket') {
              break;
            }
            if (find_constant(t.value)) {
              constant(false);
              continue;
            }
            else {
              a.push(t);
            }
          }
          next();
        }
      }

      else {
        while (i < len && !is_eos(t)) {
          if (t.type === 'comma') {
            next();
            continue;
          }

          if (t.type === 'close_paren' || t.type === 'close_bracket' || t.type === 'close_curly') {
            break;
          }
          else if (t.type === 'open_paren') {
            next();
            a.push(args_values(args('paren')));
            expected(this, t, 'close_paren');
          }
          else if (t.type === 'open_curly') { // dict
            var d = dict();
            var aa = [];
            for (var k in d) {
              aa.push('"' + k + '": ' + args_values([d[k]]));
            }
            a = a.concat(['_vm.dict.make', '(', '_vm.mm.alloc', '(', _.keys(d).length * 8, ')', '{', comma_array(aa), '}', ')']);
          }
          else if (t.type === 'open_bracket') { // indexed
            next();
            a.push(['+', args_values(args('bracket'))]);
            expected(this, t, 'close_bracket');
          }
          else {
            var l = find_label(t.value.replace('.', '_'));
            if (l) {
              a.push(l.fn ? func(false) : label(false, t.type === 'indirect'));
            }
            else if (t.type === 'portFunc') {
              var parts = t.value.split(':');
              next();
              a.push(['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(args_values(args('func'))), ')']);
              continue;
            }
            else if (is_digit(t) || is_string(t)) {
              a.push(t);
            }
            else if (find_constant(t.value)) {
              constant(false);
              continue;
            }
            else if (is_opcode(t)) {
              a.push(opcode(true));
              continue;
            }
            else if (!is_eos(t)) {
              error(this, t, 'syntax error');
              break;
            }
          }

          next();
        }
      }

      return a;
    }

    var dict = () => {
      var d = {};
      next();
      var key = null;
      while (i < len && !is_eos(t) && t.type !== 'close_curly') {
        if (t.type === 'label' && !key) {
          key = t;
          next();
          if (t.type !== 'assign') {
            error(this, t, 'syntax error');
            break;
          }
        }
        else if (key) {
          d[key.value] = t;
          key = null;
        }
        else if (t.type !== 'comma') {
          error(this, t, 'syntax error');
          break;
        }
        next();
      }
      expected(this, t, 'close_curly');
      return d;
    }

    var label = (def, indirect = false) => {
      var name = t.value.replace('.', '_');

      if (def) {
        next();

        if (structs.length) {
          name = structs.join('_') + '_' + name;
        }

        var nw = false;
        var l = find_label(name);
        if (!l) {
          l = new_label(name);
          nw = true;
        }

        if (find_constant(t.value)) {
          constant(false);
        }

        if (is_eos(t)) {
          if (nw) {
            code.line_s('var', name, '=', '_vm.mm.alloc', '(', 4, ')');
          }
          else {
            code.line_s('_vm.mem.writeUInt32LE', '(', 0, ',', name, ')');
          }
        }
        else if (t.value === '=') {
          next();
          if (is_digit(t)) {
            if (nw) {
              code.line_s('var', name, '=', '_vm.mm.alloc_d', '(', t.value, ')');
            }
            else {
              code.line_s('_vm.mem.writeUInt32LE', '(', t.value, ',', name, ')');
            }
          }
          else if (is_string(t)) {
            var v = '"' + t.value + '"';
            if (nw) {
              code.line_s('var', name, '=', '_vm.mm.alloc_s', '(', v, ')');
            }
            else {
              code.line_s('_vm.sts', '(', name, ',', v, ')');
            }
          }
          else if (t.type === 'open_paren') {
            next();
            var v = args_values(args());
            if (nw) {
              code.line_s('var', name, '=', '_vm.mm.alloc_d', '(', v, ')');
            }
            else {
              code.line_s('_vm.mem.writeUInt32LE', '(', v, ',', name, ')');
            }
            expected(this, t, 'close_paren');
          }
          else if (t.type === 'open_curly') {
            var d = dict();
            if (nw) {
              code.line_s('var', name, '=', '_vm.mm.alloc', '(', _.keys(d).length * 8, ')');
            }
            var aa = [];
            var offset = 4;
            for (var k in d) {
              code.line_s(['var', [name, k].join('_'), '=', name, '+', offset]);
              new_label([name, k].join('_'))
              offset += 8;
              aa.push('"' + k + '": ' + args_values([d[k]]));
            }
            code.line_s(['_vm.dict.make', '(', name, ',', '{', comma_array(aa), '}', ')']);
          }
          else {
            var l = find_label(t.value.replace('.', '_'));
            if (l) {
              var v = l.fn ? func(false) : label(false, t.type === 'indirect');
              if (nw) {
                code.line_s('var', name, '=', '_vm.mm.alloc', '(', 4, ',', v, ')');
              }
              else {
                code.line_s('_vm.mem.writeUInt32LE', '(', v, ',', name, ')');
              }
            }
            else if (t.type === 'portFunc') {
              var parts = t.value.split(':');
              next();
              var v = ['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(args_values(args('func'))), ')'];
              if (nw) {
                code.line_s('var', name, '=', '_vm.mm.alloc', '(', 4, ',', v, ')');
              }
              code.line_s('_vm.mem.writeUInt32LE', '(', v, ',', name, ')');
            }
            else if (is_opcode(t)) {
              var v = opcode(true);
              if (nw) {
                code.line_s('var', name, '=', '_vm.mm.alloc_d', '(', v, ')');
              }
              else {
                code.line_s('_vm.mem.writeUInt32LE', '(', v, ',', name, ')');
              }
            }
          }
        }
        else {
          var szfn = 'db';
          var sz = 1;
          if (i < len && !is_eos(t)) {
            szfn = t.value;
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
                return;
            }
            next();
            if (t.type === 'open_bracket' && nw) {
              next();
              var aa = args('def');
              code.line_s('var', name, '=', '_vm.mm.alloc', '(', sz, '*', args_values(aa), ')');
              expected(this, t, 'close_bracket')
            }
            else {
              var aa = args('def');
              if (nw) {
                code.line_s('var', name, '=', '_vm.mm.alloc', '(', sz * aa.length, ')');
              }
              code.line_s('_vm.' + szfn, '(', name, ',', comma_array(args_values(aa)), ')');
            }
          }
          else {
            error(this, t, 'db, dw, dd expected');
            return;
          }
        }
      }

      else {
        if (indirect) {
          return ['_vm.mem.readUInt32LE', '(', name, ')'];
        }
        else {
          return name;
        }
      }
    }

    var struct = () => {
      structs.push(t.value);
      next();
      expected(this, t, 'struct');
      next();
      block_statements(true);
      expected(this, t, 'end');
      structs.pop();
    }

    var func = (def, statement = false) => {
      var name = t.value.replace('.', '_');
      next();

      if (def) {
        expected(this, t, 'open_paren');
        next();
        var fct = new_label(name, true);
        new_frame();
        code.line('var ' + name, '=', 'function', '(', comma_array(args_values(args('func_def'))), ')', '{');
        expected(this, t, 'close_paren');
        next();
        block_statements();
        code.line_s('}');
        expected(this, t, 'end');
        end_frame();
      }
      else {
        if (statement) {
          code.line_s([name, '(', comma_array(args_values(args('func'))), ')']);
        }
        else {
          code.line([name, '(', comma_array(args_values(args('func'))), ')']);
        }
      }
    }

    var constant = (def) => {
      var name = t.value;
      if (def) {
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
        new_constant(name, a);
      }

      else {
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
    }

    var opcode = (expr = false) => {
      var a = [];

      var name = is_opcode(t);

      next();

      var _args = args('paren');

      if (expr && !opcodes[name].expr) {
        error(this, t, 'opcode cannot be used in an expression');
        return [];
      }

      if (_args.length === 1) {
        _args = _args[0];
      }

      if (opcodes[name]) {
        var av = args_values(_args);
        var r = [];
        if (opcodes[name].gen) {
          r = opcodes[name].gen(...av);
        }
        else {
          r = [opcodes[name], '(', av, ')'];
        }
        if (expr) {
          a.push(['(', r, ')']);
        }
        else {
          a.push(r);
        }
      }
      else {
        error(this, t, 'invalid opcode');
        return [];
      }

      return a;
    }

    // var block = (type) => {
    //   while (i < len) {
    //     if (t.value === 'end') {
    //       break;
    //     }
    //     else {
    //       statement();
    //       continue;
    //     }
    //     next();
    //   }
    // }

    var block_statements = (_struct) => {
      while (i < len) {
        statement(_struct);
        if (i < len && t.value === 'end') {
          break;
        }
      }
    }

    var statement = (_struct) => {
      if (_struct) {
        while (i < len) {
          if (t.value === 'end') {
            break;
          }
          else if (t.type === 'label') {
            label(true);
          }
          else if (t.type === 'struct') {
            struct();
          }
          else if (t.type !== 'eol' && t.type !== 'comment') {
            error(this, t, 'label or struct definition expected');
          }

          next();
        }
      }

      else {
        while (i < len) {
          if (t.value === 'end') {
            break;
          }
          else if (t.type === 'label') {
            label(true);
          }
          else if (t.type === 'struct') {
            struct();
          }
          else if (t.type === 'func') {
            func(true);
          }
          else if (t.type === 'constant') {
            constant(true);
          }
          else if (t.type === 'open_paren') {
            next();
            code.line_s(args_values(args('paren')));
            expected(this, t, 'close_paren');
          }
          else if (is_opcode(t)) {
            code.line_s(opcode());
          }
          else if (t.value === 'if') {
            next();
            code.line('if', '(', args_values(args('paren')), ')', '{');
            block_statements();
            code.line('}');
            expected(this, t, 'end');
          }
          else if (t.value === 'elif') {
            next();
            code.line('}', 'else', 'if', '(', args_values(args('paren')), ')', '{');
            block_statements();
            expected(this, t, 'end');
            break;
          }
          else if (t.value === 'else') {
            next();
            code.line('}', 'else', '{');
            block_statements();
            expected(this, t, 'end');
            break;
          }
          else if (t.value === 'whl') {
            next();
            code.line('while', '(', args_values(args('paren')), ')', '{');
            block_statements();
            expected(this, t, 'end');
            code.line_s('}');
          }
          else {
            var l = find_label(t.value.replace('.', '_'));
            if (l && l.fn) {
              func(false, true);
            }
            else if (t.type === 'portFunc') {
              var parts = t.value.split(':');
              next();
              code.line_s(['_vm.ports[' + parts[0] + '].' + parts[1], '(', comma_array(args_values(args('func'))), ')']);
            }
            else if (find_constant(t.value)) {
              constant(false);
              continue;
            }
            else if (t.type !== 'eol' && t.type !== 'comment') {
              error(this, t, 'syntax error');
            }
          }

          next();
        }
      }
    }

    new_frame();
    block_statements();
    code.line_s(['main', '(', 'args', ')']);
    end_frame();

    return code.build();
  }

}

export default Assembler
