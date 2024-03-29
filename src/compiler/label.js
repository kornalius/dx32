import _ from 'lodash'
import { defaults } from '../globals.js'
import { data_type_size } from '../interpreter/memory.js'
import { js_name } from './codegen.js'


export class Label {

  constructor (frame, name, type, size, dimensions) {
    this.frame = frame
    this.name = name
    this.type = type || defaults.type
    this.size = size || data_type_size(this.type)
    this.local = !frame.global
    this.noFree = false
    this.fn = null
    this.dict = null
    this.dimensions = dimensions || null
    if (frame) {
      frame.labels[this.js_name] = this
    }
  }

  get js_name () { return js_name(this.name) }

  get (path) {
    let paths = path.split('.')
    if (this.is_custom_type) {
      let n = paths.shift()
      let l = this.frame.get(n)
      if (l) {
        l.get(paths.join('.'))
      }
    }
  }

  get is_func () { return this.fn !== null }
  get is_array () { return this.dimensions !== null }

}
