import _ from 'lodash';
import { defaults, opcodes, opcodes_idx, registers, register_names, byte, word, dword, write, read, is_register, is_eos, is_opcode, is_symbol, is_value, is_string, is_digit, peek_at, peeks_at, error } from './globals.js';

class Assembler {

  constructor () {
    this.errors = 0;
    this.buffer = null;
    this.org = -1;
    this.stack_size = defaults.vm.stack_size;
  }

  asm (path, tokens, options = {}) {
    var pc = 0;

    var buffer = new Buffer(8092);

    this.buffer = buffer;

    var len = tokens.length;
    var i = 0;
    var t = tokens[i];

    var contants = {};
    var frame = null;
    var frames = [];

    var frame_size = defaults.vm.frame_size;

    var data_table = [];

    var jmp_stack = [];
    var jmp = null;

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
        if (fn) {
          l = { fn: true, addr: pc, frame: frame, local: !frame.global };
        }
        else {
          l = { fn: false, local: !frame.global, addr: 0, offset: frame.labels.length, frame: frame, value: 0, data_table: null };
        }
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
      frame = { name: name, labels: {}, addr: 0, size: 0, global: frames.length === 0 };
    }

    var pop_frame = () => {
      var opc = pc;

      if (frame.global) {
        pc = frame.addr;
      }

      for (var k in frame.labels) {
        var l = frame.labels[k];
        if (l.data_table) {
          gen_dword(0x00000000);
          l.data_table.addrs.push(pc - 4);
        }
        else {
          gen_dword(l.value);
        }
      }

      if (frame.global) {
        pc = opc;
      }

      if (frame.length > 0) {
        frame = frames.pop();
      }
    }

    var next = () => { return t = tokens[++i]; }

    var prev = () => { return t = tokens[--i]; }

    var next_if = (type) => { return peek_at(i + 1, type, tokens) ? t = tokens[++i] : false; }

    var peek = (type) => { return peek_at(i + 1, type, tokens); }

    var peeks = (arr) => { return peeks_at(i + 1, arr, tokens); }

    var peek_indexed = () => { return peeks_at(i + 1, [/[\+\-]/, 'value'], tokens); }

    var gen_byte = (v) => {
      byte(buffer, v, pc);
      pc++;
    }

    var gen_word = (v) => {
      word(buffer, v, pc);
      pc += 2;
    }

    var gen_dword = (v) => {
      dword(buffer, v, pc);
      pc += 4;
    }

    var gen = (op, v) => {
      var vsz = 4;
      if (_.isObject(v) && v.type && v.value) {
        if (op === 'psh') {
          if (is_register(v)) {
            op = 'pshr';
            v = registers[v.value];
            vsz = 1;
          }
          else if (find_label(v.value)) {
            var l = find_label(v.value);
            if (l.addr) { // function
              op = 'psh';
              v = l.addr;
            }
            else { // local label
              if (l.local) {
                op = 'pshl';
                v = l.offset;
              }
              else { // global label
                op = 'pshg';
                v = l.addr;
              }
            }
          }
          else {
            v = parseInt(v.value);
          }
        }
        else if (op === 'pop') {
          if (is_register(v)) {
            op = 'popr';
            v = registers[v.value];
            vsz = 1;
          }
          else if (find_label(v.value)) {
            var l = find_label(v.value);
            if (!l.fn) {
              if (l.local) { // local label
                op = 'popl';
                v = l.offset;
              }
              else { // global label
                op = 'popg';
                v = l.addr;
              }
            }
            else {
              error(this, t, 'cannot pop to a func address');
              return;
            }
          }
          else {
            v = parseInt(v.value);
          }
        }
      }
      if (opcodes[op]) {
        gen_byte(opcodes[op].idx);
      }
      else {
        error(this, t, 'invalid opcode');
        return;
      }
      if (v) {
        write(buffer, v, pc, vsz);
        pc += vsz;
      }
    }

    var value_size = (value, sz = 4) => {
      if (_.isObject(value) && value.type && value.value) {
        if (is_digit(value)) {
          return sz;
        }
        else if (is_string(value)) {
          return value_size(value.value);
        }
      }
      else if (_.isString(value)) {
        return value.length + 1;
      }
      else if (Buffer.isBuffer(value)) {
        return value.length;
      }
      return sz;
    }

    var write_data = (_buffer, addr, value, sz = 4) => {
      if (_.isObject(value) && value.type && value.value) {
        if (is_digit(value)) {
          return write_data(_buffer, addr, parseInt(value.value), sz);
        }
        return write_data(_buffer, addr, value.value, sz);
      }
      else if (_.isString(value)) {
        _buffer.write(value, addr, value.length, 'ascii');
        byte(_buffer, addr + value.length, 0);
        return value.length + 1;
      }
      else if (Buffer.isBuffer(value)) {
        value.copy(_buffer, addr);
        return value.length;
      }
      else if (_.isNumber(value)) {
        write(_buffer, value, addr, sz);
        return sz;
      }
    }

    var add_to_data_table = (value, l) => {
      var d;
      var _label = !_.isNumber(l);
      for (d of data_table) {
        if (d.value === value) {
          d.addrs.push(l);
          if (_label) {
            l.data_table = d;
          }
          return d;
        }
      }
      var sz = value_size(value);
      d = { addrs: [l], value: value, sz: sz };
      data_table.push(d);
      if (_label) {
        l.data_table = d;
      }
      return d;
    }

    var write_data_table = () => {
      dword(buffer, 0, pc);

      for (var d of data_table) {
        for (var a in d.addrs) {
          dword(buffer, pc, a);
        }
        pc += write_data(buffer, d.value, pc);
      }
      data_table = [];
    }

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
            args(false, 'paren');
            if (t.type !== 'close_paren') {
              error(this, t, ') expected');
              break;
            }
            continue;
          }

          else if (t.type === 'open_curly') { // indirect
            next();
            args(false, 'curly');
            if (t.type !== 'close_curly') {
              error(this, t, '} expected');
              break;
            }
            gen('ld');
          }

          // else if (t.type === 'open_bracket') {
          //   next();
          //   args(false, 'bracket');
          //   if (t.type !== 'close_paren') {
          //     error(this, t, '] expected');
          //     break;
          //   }
          //   gen('add');
          // }

          else {
            var l = find_label(t.value);
            if (l) {
              l.fn ? func(false) : label(false);
            }

            else if (find_constant(t.value)) {
              constant(false);
              continue;
            }

            else if (is_digit(t) || is_register(t)) {
              gen('psh', t);
            }

            else if (is_opcode(t)) {
              opcode(true);
              continue;
            }

            else if (is_string(t)) {
              gen_dword(0x00000000);
              add_to_data_table(t.value, pc - 4);
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

    var new_jmp = (type, addr) => {
      jmp = [];
      jmp.push({ type: type, addr: addr || pc - 4 });
    }

    var process_jmps = (type, pop = false) => {
      for (var j of jmp) {
        if (j.type === type) {
          j.op = null;
          dword(buffer, pc, j.addr);
        }
      }
      if (pop) {
        jmp = jmp_stack.length > 0 ? jmp_stack.pop() : null;
      }
    }

    var block = (type) => {
      while (i < len) {
        if (t.value === 'end') {
          next();
          process_jmps('jmp', true);
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
      var l = null;
      var name = t.value;

      if (def) {
        l = new_label(name);

        next();

        var sz = 1;
        var tsz = 0;
        var aa = [];

        if (is_eos(t) || is_digit(t)) {
          l.value = t.value ? parseInt(t.value) : 0;
          return l;
        }
        else if (is_string(t)) {
          aa.push(t);
          next();
        }
        else {
          if (i < len && !is_eos(t) && (t.value !== 'db' || t.value !== 'dw' || t.value !== 'dd')) {
            sz = t.value === 'db' ? 1 : t.value === 'dw' ? 2 : t.value === 'dd' ? 4 : 1;
          }
          else {
            error(this, t, 'db, dw, dd expected');
            return;
          }
          next();
          aa = args(true, 'label');
        }

        var a;

        for (a of aa) {
          tsz += value_size(a, sz);
        }

        var b = new Buffer(tsz);
        var pos = 0;

        for (a of aa) {
          pos += write_data(b, pos, a, sz);
        }

        add_to_data_table(b, l);
      }

      else {
        l = find_label(name);
        if (l.local) { // local label
          gen('pshl', l.offset);
        }
        else { // global label
          gen('pshg', l.addr);
        }
      }

      return l;
    }

    var func = (def) => {
      var fct = null;
      var name = t.value;

      if (def) {
        fct = new_label(name, true);
        next();

        // create new frame
        new_frame(name);

        // get func arguments
        var f_args = args(true, 'func');

        var locals = 0;
        var ai;

        // create local labels for arguments
        for (ai = f_args.length - 1; ai >= 0; ai--) {
          var a = f_args[ai];
          new_label(a.value);
          locals++;
        }

        // find locals
        var x = i;
        var lt = tokens[x];
        while (x < len && lt.type !== 'end') {
          if (lt.type === 'label') {
            locals++;
          }
          lt = tokens[x++];
        }

        // func starts here
        fct.addr = pc;

        // if org not set and the func is called main, set it
        if (this.org === -1 && name.toLowerCase() === 'main') {
          this.org = pc;
        }

        // pop argument values from the stack
        for (ai = f_args.length - 1; ai >= 0; ai--) {
          gen('popl', ai);
        }

        // copy all local label values to the stack
        gen('alof', locals * 4);

        // reserve space for pushing local variables to the stack frame
        frame.addr = pc;
        pc += locals * 4;

        // generate func content
        block_statements();

        // pop frame data from stack
        gen('popf');

        pop_frame();
      }

      else {
        fct = find_label(name);
        args(false, 'func');
        gen('psh', f.addr);
        gen('call');
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
      var name = is_opcode(t);

      if (expr && !opcodes[name].expr) {
        error(this, t, 'opcode cannot be used in an expression');
        return;
      }

      next();

      if (t.type === 'open_paren') {
        next();
      }

      args(false, 'paren');

      if (t.type !== 'close_paren') {
        error(this, t, ') expected');
        return;
      }

      gen(name);
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
        if (t.type === 'org') {
          next();
          if (is_digit(t)) {
            this.org = parseInt(t.value);
          }
          else {
            error(this, t, 'numeric value expected');
            break;
          }
        }

        // else if (t.type === 'frame') {
        //   next();
        //   if (is_digit(t)) {
        //     frame.size = parseInt(t.value);
        //   }
        //   else {
        //     error(this, t, 'numeric value expected');
        //     break;
        //   }
        // }

        // else if (t.type === 'stack') {
        //   next();
        //   if (is_digit(t)) {
        //     this.stack_size = parseInt(t.value);
        //   }
        //   else {
        //     error(this, t, 'numeric value expected');
        //     break;
        //   }
        // }

        else if (t.type === 'label') {
          label(true);
        }

        else if (t.type === 'func') {
          func(true);
        }

        else if (t.type === 'constant') {
          constant(true);
        }

        else if (t.value === 'end') {
          break;
        }

        else if (t.value === 'if') {
          next();

          args(false, 'paren');

          if (jmp) { jmp_stack.push(jmp); }

          gen('jmpf', 0x00000000);
          new_jmp('jmpf');

          block();

          gen('jmp', 0x00000000);
          new_jmp('jmp');
        }

        else if (t.value === 'elif') {
          next();

          process_jmps('jmpf');

          args(false, 'paren');

          gen('jmpf', 0x00000000);
          new_jmp('jmpf');

          block();

          gen('jmp', 0x00000000);
          new_jmp('jmp');
        }

        else if (t.value === 'else') {
          next();
          process_jmps('jmpf');
          block();
        }

        else if (t.value === 'whl') {
          next();

          var toc = pc;

          args(false, 'paren');

          gen('jmpf', 0x00000000);
          var j = pc - 4;

          block();

          gen('jmp', toc);

          dword(buffer, pc, j);
        }

        else if (is_opcode(t)) {
          opcode();
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

    // data table addr
    gen_dword(0x00000000);

    new_frame('main');

    block_statements();

    pop_frame();

    write_data_table();
  }

  disasm (buffer) {
    var lines = [];

    var i = 0;
    var len = buffer.length;
    var line = '00000000  ';

    var dt = read(buffer, i, 4);
    i += 4;

    while (i < len) {
      var b = buffer[i++];

      var op = opcodes_idx[b];
      if (op) {
        line += op;
        var a = read(buffer, i, op.arg_size);
        i += op.arg_size;
        if (op.arg_size === 1) { // register
          line += ' ' + register_names[a];
        }
        else { // value
          line += ' $' + a.toString(16);
        }
        lines.push(line);
        line = _.lpad(i.toString(16), '0', 8) + '  ';
      }
      else {
        line += b.toString(16) + ' ';
      }
    }

    lines.push(line);

    return lines.join('\n');
  }

}

export default Assembler
