import _ from 'lodash'
import { is_string } from './tokenizer.js'


export const _COMPACT = 1
export const _PRETTY = 2

export var js_name = name => name.replace(/\./g, '_')

export var codify = args => {
  let r = []
  if (!_.isArray(args)) {
    args = [args]
  }
  for (let a of args) {
    if (a && a.type) {
      if (is_string(a)) {
        r.push('"' + a.value + '"')
      }
      else {
        r.push(a.value)
      }
    }
    else if (_.isArray(a)) {
      r = r.concat(codify(a))
    }
    else {
      if (_.isUndefined(a)) {
        a = 'undefined'
      }
      else if (_.isNull(a)) {
        a = 'null'
      }
      r.push(a)
    }
  }
  return r
}


export class CodeGenerator {

  constructor (style, assembler) {
    this.lines = []
    this.style = style || _COMPACT
    this.assembler = assembler
  }

  clear () { this.lines = [] }

  join (a) {
    let r = a.join(' ')
    if (this.style === _COMPACT) {
      r = r.replace(/(\s\s+)/g, ' ')
      r = r.replace(/\s?([\(\{\[\)\}\]<>=,;:\+\-\*\/%\^&\|])\s?/g, '$1')
    }
    else if (this.style === _PRETTY) {
      r = r.replace(/(\s\s+)/g, ' ')
      r = r.replace(/\s?,\s?/g, ', ')
      r = r.replace(/\s([\(\{\[])\s/g, '$1')
      r = r.replace(/\s([\)\}\]])/g, '$1')
      r = r.replace(/:\{/g, ': {')
    }
    return r
  }

  push (line) {
    if (this.style === _PRETTY) {
      line = _.padStart('', this.assembler.indent * 2) + line
    }
    console.log(line)
    this.lines.push(line)
  }

  line (...args) { this.push(this.join(codify(args))) }

  line_s (...args) { this.push(_.trimEnd(this.join(codify(args))) + ';') }

  build () { return this.lines.join('\n') }
}
