import _ from 'lodash'
import { defaults, data_type_size } from '../globals.js'
import { js_name } from './assembler.js'


export class Label {

  constructor (frame, name, type, size) {
    this.frame = frame
    this.name = name
    this.type = type || defaults.type
    this.size = size || data_type_size(this.type)
    this.local = !frame.global
    this.fn = null
    this.dict = null
    this.dimensions = null
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

  get alloc_size () {
    let sz = 0

    if (this.is_func) {
      sz = data_type_size(defaults.type)
    }
    else if (this.is_custom_type) {
      for (let k in this.custom_type) {
        sz += this.custom_type[k].alloc_size
      }
    }
    else if (this.is_array) {
      for (let d of this.dimensions) {
        sz += d * this.size
      }
    }
    else {
      sz = this.size
    }

    return sz
  }

  get is_custom_type () { return this.frame.custom_type }
  get is_func () { return this.fn !== null }
  get is_array () { return this.dimensions !== null }

}
