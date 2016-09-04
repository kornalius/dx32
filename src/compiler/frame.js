import { comma_array } from '../globals.js'
import { js_name } from './assembler.js'
import { Label } from './label.js'


export var frames = []
export var global_frame = null

export class Frame {

  constructor (parent, name, custom_type) {
    this.parent = parent
    this.name = name
    this.custom_type = custom_type || false
    this.labels = {}
    this.is_global = !global_frame
    if (!global_frame) {
      global_frame = this
    }
  }

  get js_name () { return js_name(this.name) }

  find (name) {
    name = js_name(name)
    let l = this.labels[name]
    if (!l && !this.is_global) {
      l = global_frame.find(name)
    }
    return l
  }

  add (name, type, size) {
    return new Label(this, name, type, size)
  }

  start_code (code) {
    // code.line_s('var', 'frame', '=', '{', '}')
  }

  end_code (code) {
    let l = _.filter(_.keys(this.labels), k => !this.labels[k].is_func)
    if (l.length) {
      code.line_s('free', '(', comma_array(l), ')')
    }
  }

}
