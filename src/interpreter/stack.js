import { StructEntry } from './struct.js'


export class Stack {

  stk_init () {
    this.stack = []
  }

  stk_tick (t) {
  }

  stk_reset () {
    this.stack = []
  }

  stk_shut () {
  }

  stk_push (e) {
    this.stack.push(e)
    return this
  }

  stk_pop (fmt) {
    let value = this.stack.length ? this.stack.pop() : null
    if (value instanceof StructEntry) {
      value = value.struct_top
    }
    else if (_.isObject(value) && fmt) {
      value = new StructEntry(fmt).from_object(value).struct_top
    }
    return value
  }

  stk_pull_buffer (fmt, buf, offset = 0) {
    let value = this.stk_pop(fmt)
    if (value instanceof StructEntry) {
      value = value.to_buffer(buf, offset)
    }
    return value
  }

  stk_size () {
    return this.stack.length
  }

}
