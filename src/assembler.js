import _ from 'lodash';
import { defaults, opcodes, is_eos, is_opcode, is_symbol, is_value, is_string, is_digit, peek_at, peeks_at, error } from './globals.js';


class Code {

  constructor () {
    this.lines = [];
  }

  clear () { this.lines = []; }

  line (...args) { this.lines.push(args.join(' ')); }

  line_s (...args) { this.line(...args) + ';'; }

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

    var code = new Code();

    var frame = null;
    var frames = [];

    var contants = {};

    var find_label = (name) => {
      var l = frame.labels[name];
      if (!l && frames.indexOf(frame) > 0) {
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
      if (frame.length > 0) {
        frame = frames.pop();
      }
    }

    var args_values = (_args) => {
      var r = [];
      for (var a of _args) {
        if (a.type) {
          r.push(a.value);
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

    var args = (def = false, type = '') => {
      var a = [];

      while (i < len && !is_eos(t)) {
        if (t.type === 'comma') {
          next();
          continue;
        }

        if (!def) {
          if (t.type === 'close_paren' || t.type === 'close_bracket' || t.type === 'close_curly') {
            break;
          }
          else if (t.type === 'open_paren') {
            next();
            a = a.concat(args_values(args(false, 'paren')));
            if (t.type !== 'close_paren') {
              error(this, t, ') expected');
              break;
            }
            continue;
          }
          else if (t.type === 'open_curly') { // indirect
            next();
            a = a.concat(args_values(args(false, 'curly')));
            if (t.type !== 'close_curly') {
              error(this, t, '} expected');
              break;
            }
          }
          // else if (t.type === 'open_bracket') {
          //   next();
          //   a = a.concat(args_values(args(false, 'bracket')));
          //   if (t.type !== 'close_bracket') {
          //     error(this, t, '] expected');
          //     break;
          //   }
          // }
          else {
            var l = find_label(t.value);
            if (l) {
              a.push(l.fn ? func(false) : label(false));
            }
            else if (find_constant(t.value)) {
              constant(false);
              continue;
            }
            else if (is_digit(t)) {
              a.push(t);
            }
            else if (is_string(t)) {
              a.push('"' + t + '"');
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
        }

        else {
          while (i < len && find_constant(t.value)) {
            constant(false);
            continue;
          }
          while (i < len && t.type === 'comma') {
            next();
          }
          a.push(t);
        }

        next();
      }

      return a;
    }

    var block = (type) => {
      while (i < len) {
        if (t.value === 'end') {
          next();
          break;
        }
        else {
          statement();
          continue;
        }
        next();
      }
    }

    var label = (def) => {
      var name = t.value;

      if (def) {
        var l = new_label(name);
        next();

        if (is_eos(t)) {
          code.line_s('var', name);
          next();
        }
        else if (is_digit(t)) {
          code.line_s('var', name, '=', t.value);
          next();
        }
        else if (is_string(t)) {
          code.line_s('var', name, '=', '"' + t.value + '"');
          next();
        }
        else {
          var szfn = 'db';
          if (i < len && !is_eos(t) && (t.value !== 'db' || t.value !== 'dw' || t.value !== 'dd')) {
            szfn = t.value;
          }
          else {
            error(this, t, 'db, dw, dd expected');
            return;
          }
          next();
          code.line_s('var', name, '=', 'this.' + szfn, '(', args_values(args(true, 'label')), ')');
        }
      }

      else {
        return name;
      }
    }

    var func = (def) => {
      var fct = null;
      var name = t.value;

      if (def) {
        fct = new_label(name, true);
        next();
        new_frame();
        code.line('var ' + name, '=', 'function', '(', args_values(args(true, 'func')), ')', '{');
        block_statements();
        end_frame();
        code.line('}', true);
      }
      else {
        fct = find_label(name);
        code.line_s('this.' + name + '.apply', '(', args_values(args(true, 'func')), ')');
      }

      return fct;
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

    var opcode = (expr) => {
      var a = [];

      var name = is_opcode(t);

      if (expr && !opcodes[name].expr) {
        error(this, t, 'opcode cannot be used in an expression');
        return;
      }

      next();

      if (t.type === 'open_paren') {
        next();
      }

      var _args = args(false, 'paren');

      if (t.type !== 'close_paren') {
        error(this, t, ') expected');
        return [];
      }

      if (opcodes[name] && opcodes[name].gen) {
        if (expr) {
          a = a.push(opcodes[name].gen(...args_values(_args)));
        }
        else {
          code.line_s(opcodes[name].gen(...args_values(_args)));
        }
      }
      else {
        error(this, t, 'invalid opcode');
        return [];
      }

      return a;
    }

    var block_statements = () => {
      while (i < len) {
        statement();
        if (i < len && t.value === 'end') {
          next();
          break;
        }
      }
    }

    var statement = () => {
      while (i < len) {
        if (t.value === 'end') {
          break;
        }
        else if (t.type === 'label') {
          label(true);
        }
        else if (t.type === 'func') {
          func(true);
        }
        else if (t.type === 'constant') {
          constant(true);
        }
        else if (is_opcode(t)) {
          opcode();
        }
        else if (t.value === 'if') {
          next();
          code.line('if', '(', args_values(args(false, 'paren')), ')', '{');
          block();
          code.line('}');
        }
        else if (t.value === 'elif') {
          next();
          code.line('else', 'if', '(', args_values(args(false, 'paren')), ')', '{');
          block();
          code.line('}');
        }
        else if (t.value === 'else') {
          next();
          code.line('else', '{');
          block();
          code.line('}');
        }
        else if (t.value === 'whl') {
          next();
          code.line('while', '(', args_values(args(false, 'paren')), ')', '{');
          block();
          code.line_s('}');
        }
        else {
          var l = find_label(t.value);

          if (l && l.fn) {
            func(false);
          }

          else if (find_constant(t.value)) {
            constant(false);
            continue;
          }

          else if (!t.type === 'eol' && !t.type === 'comment') {
            error(this, t, 'syntax error');
          }
        }

        next();
      }
    }

    new_frame();
    block_statements();
    end_frame();

    return code.build();
  }

}

export default Assembler
