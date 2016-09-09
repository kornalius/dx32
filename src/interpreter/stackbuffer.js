import { Struct } from './struct.js'


export class StackBuffer {

  stk_buf_init (format = {}) {
    this.struct = new Struct(format)
    this.queue = []
  }

  stk_buf_push (s) {
    if (s instanceof Buffer) {
      s = this.struct.from_buffer(s)
    }
    this.queue.push(s)
  }

  stk_buf_pull () {
    if (this.queue.length) {
      let s = this.queue.pop()
      return this.struct.to_buffer(s)
    }
    return null
  }

  stk_buf_size () {
    return this.queue.length
  }

}
