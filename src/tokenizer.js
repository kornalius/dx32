import _ from 'lodash';
import { defaults, error } from './globals.js';

class Tokenizer {

  constructor () {
    this.errors = 0;
  }

  tokenize (path, text) {
    var tokens = [];
    var len = text.length;
    var i = 0;
    var si = 0;
    var ls = 0;
    var row = 1;
    var col = 1;

    var defs = {
      eol: /[\r\n]/,

      comma: /\,/,

      open_bracket: /\[/,
      close_bracket: /\]/i,

      open_curly: /\{/,
      close_curly: /\}/,

      open_paren: /\(/,
      close_paren: /\)/,

      include: {
        match: /\.include\s/i,
        include: true,
      },

      comp: /\>|\<|\>\=|\<\=|\!\=|\=\=/,
      math: /[\+\-\*\/\%\^]/,
      logic: /[\!\&\|]/,

      assign: /^([\=])[^\=]/,

      comment: /\;([^\n]*)/,

      constant_def: /\:\:([A-Z_][A-Z_0-9]*)/i,

      label_def: /\:([A-Z_][A-Z_0-9]*)(?=\s+db|\s+dw|\s+dd|\s*\=)/i,

      label_indirect: {
        match: /(\@+[A-Z_][A-Z_0-9\.]*)(?!\s*\=)/i,
        value (v, d) {
          var i = 0;
          while (v[0] === '@') {
            i++;
            v = v.substr(1);
          }
          d.count = i;
          return v;
        },
      },

      struct_def: /\:([A-Z_][A-Z_0-9]*)(?=\s+struct)/i,

      func_def: /\:([A-Z_][A-Z_0-9]+)(?=\s*\()/i,

      port: /\#([0-9]+)(?!\:)/i,

      port_name: {
        match: /\#(\b[A-Z]+\b)(?!\:)/i,
        value (v) {
          v = v.toLowerCase();
          for (var k in _vm.ports) {
            if (_vm.ports[k].constructor.name.toLowerCase() === v) {
              return k;
            }
          }
          return '0';
        },
        type (k, v) {
          return 'port';
        },
      },

      port_call: /\#([0-9]+\:[A-Z_][A-Z_0-9]+)/i,

      port_name_call: {
        match: /\#([A-Z]+\:[A-Z_][A-Z_0-9]+)/i,
        value (v) {
          var parts = v.split(':');
          var p = parts[0].toLowerCase();
          var f = parts[1];
          for (var k in _vm.ports) {
            if (_vm.ports[k].constructor.name.toLowerCase() === p) {
              return k + ':' + f;
            }
          }
          return '0:' + f;
        },
        type (k, v) {
          return 'port_call';
        },
      },

      port_indirect: {
        match: /(\@\#[0-9]+)(?!\:)/i,
        value (v, d) {
          var i = 0;
          while (v[0] === '@') {
            i++;
            v = v.substr(1);
          }
          if (v[0] === '#') {
            v = v.substr(1);
          }
          d.count = i;
          debugger;
          return v;
        },
      },

      port_name_indirect: {
        match: /(\@\#\b[A-Z]+\b)(?!\:)/i,
        value (v, d) {
          var i = 0;
          while (v[0] === '@') {
            i++;
            v = v.substr(1);
          }
          if (v[0] === '#') {
            v = v.substr(1);
          }
          d.count = i;
          v = v.toLowerCase();
          for (var k in _vm.ports) {
            if (_vm.ports[k].constructor.name.toLowerCase() === v) {
              return k;
            }
          }
          return '0';
        },
        type (k, v) {
          return 'port_indirect';
        },
      },

      // indirect_symbol: /(\@)(?![^\#A-Z_])/i,

      id: /([A-Z_][A-Z_0-9\.]*)(?!\s*\=)/i,

      label_assign: /([A-Z_][A-Z_0-9\.]*)(?=\s*\=)/i,

      label_assign_indirect: {
        match: /(\@+[A-Z_][A-Z_0-9\.]*)(?=\s*\=)/i,
        value (v, d) {
          var i = 0;
          while (v[0] === '@') {
            i++;
            v = v.substr(1);
          }
          d.count = i;
          return v;
        },
      },

      label_assign_indirect_bracket: {
        match: /(\@+[A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*\=)/i,
        value (v, d) {
          var i = 0;
          while (v[0] === '@') {
            i++;
            v = v.substr(1);
          }
          d.count = i;
          return v;
        },
        type (k, v) {
          return 'label_assign_indirect';
        },
      },

      label_assign_bracket: {
        match: /([A-Z_][A-Z_0-9\.]*)(?=\s*\[[^\]]*\s*\=)/i,
        type (k, v) {
          return 'label_assign';
        },
      },

      digit: {
        match: /[0-9]+/,
        type (k, v) {
          v = parseInt(v);
          if (v >= 0x00 && v <= 0xFF) {
            return 'byte';
          }
          else if (v > 0xFF && v <= 0xFFFF) {
            return 'word';
          }
          else if (v > 0xFFFF && v <= 0xFFFFFFFF) {
            return 'dword';
          }
          else {
            error(this, { v, row, col }, 'value out of bounds');
          }
        },
      },

      byte: {
      },

      word: {
      },

      dword: {
      },

      hex: {
        match: /\$([0-9A-F]+)/i,
        type (k, v) { return 'digit' },
        value (v) { return parseInt('0x' + v, 16).toString() },
      },

      string: /\"([^"]*)\"/i,

      char: {
        match: /\'(.)\'/i,
        type (k, v) { return 'digit' },
        value (v) { return v.charCodeAt(0) },
      },

    };

    var add_token = (k, v) => {
      var d = defs[k];

      var r = { type: k, value: v, row: row, col: (si + 1 - ls), start: si, end: i, idx: tokens.length - 1 };

      while (d && (_.isFunction(d.type) || _.isFunction(d.value))) {
        var ok = k;

        if (_.isFunction(d.type)) {
          k = d.type(k, v, r);
          if (k === ok) {
            error(this, { k, row, col }, 'recursive type loop');
            break;
          }
        }

        if (_.isFunction(d.value)) {
          v = d.value(v, r);
        }

        if (ok !== k) {
          d = defs[k];
        }
        else {
          break;
        }
      }

      r.type = k;
      r.value = v;

      tokens.push(r);

      if (k === 'eol') {
        row++;
        ls = i;
      }
    }

    var rx;
    var _include = false;

    while (i < len) {
      var c = text[i];

      si = i;

      if (c !== ' ' && c !== '\t') {
        for (var k in defs) {
          var d = defs[k];

          if (_.isRegExp(d)) {
            rx = d;
          }
          else if (d.match) {
            rx = d.match;
          }

          var r = text.substring(i).match(rx);
          if (r && r.index === 0) {
            var t = r.length > 1 ? r.slice(1).join('') : r.join('');
            i += r[0].length - 1;

            if (_include && k === 'string') {
              _include = false;
              var p = new Tokenizer();
              var s = '';
              var new_tokens = p.parse(s);
              if (p.errors !== 0) {
                new_tokens = [];
              }
              tokens = tokens.concat(new_tokens);
              len = tokens.length;
            }
            else if (d.include) {
              _include = true;
            }
            else {
              add_token(k, t);
            }

            break;
          }

        }
      }

      i++;
    }

    return tokens;
  }

}

export default Tokenizer
