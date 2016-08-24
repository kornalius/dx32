import _ from 'lodash'


var indent = 0

const _COMPACT = 1
const _PRETTY = 2

class CodeGenerator {

  constructor (style) {
    this.lines = []
    this.style = style || _COMPACT
  }

  clear () { this.lines = [] }

  join (a) {
    var r = a.join(' ')
    if (this.style === _COMPACT) {
      r = r.replace(/(\s\s+)/g, ' ')
      r = r.replace(/\s?([\(\{\[\)\}\]\<\>\=\,\;\:\+\-\*\/\%\^\&\|])\s?/g, '$1')
    }
    else if (this.style === _PRETTY) {
      r = r.replace(/(\s\s+)/g, ' ')
      r = r.replace(/\s?\,\s?/g, ', ')
      r = r.replace(/\s([\(\{\[])\s/g, '$1')
      r = r.replace(/\s([\)\}\]])/g, '$1')
      r = r.replace(/\:\{/g, ': {')
    }
    return r
  }

  push (line) {
    if (this.style === _PRETTY) {
      line = _.padStart('', indent * 2) + line
    }
    console.log(line)
    this.lines.push(line)
  }

  line (...args) { this.push(this.join(codify(args))) }

  line_s (...args) { this.push(_.trimEnd(this.join(codify(args))) + ';') }

  build () { return this.lines.join('\n') }
}


export default {
  CodeGenerator,
  _COMPACT,
  _PRETTY,
}
