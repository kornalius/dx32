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

      comp: /\>|\<|\>\=|\<\=|\!\=|\=\=/,
      math: /[\+\-\*\\\%\^]/,
      logic: /[\!\&\|]/,

      assign: /^([\=])[^\=]/,

      comment: /\;([^\n]*)/,

      constant: /\#([A-Z_][A-Z_0-9\-]*)/i,

      label: /\:([A-Z_][A-Z_0-9\-]*)/i,

      func: /\:\:([A-Z_][A-Z_0-9\-]+)/i,

      portFunc: /\#([0-9]+\:[A-Z_][A-Z_0-9\-]+)/i,

      include: {
        match: /\.include\s/i,
        include: true,
      },

      indirect: /\@([A-Z_][A-Z_0-9\-]*)/i,

      indirectsym: /(\@)[^A-Z_]/i,

      id: /([A-Z_][A-Z_0-9\-]*)/i,

      digit: {
        match: /[0-9]+/,
        type (k, v) {
          v = parseInt(v);
          if (v >= 0x00 && v <= 0xFF) {
            return 'byte';
          }
          else if (v > 0xFF00 && v <= 0xFFFF) {
            return 'word';
          }
          else if (v > 0xFFFF && v <= 0xFFFF0000) {
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

      while (d && d.type) {
        if (d.value) {
          v = d.value(v);
        }
        var ok = k;
        k = d.type(k, v);
        if (k === ok) {
          error(this, { k, row, col }, 'recursive type loop');
          break;
        }
        d = defs[k];
      }

      tokens.push({ type: k, value: v, row: row, col: (si + 1 - ls), start: si, end: i });

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
