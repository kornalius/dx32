import { Readline } from './readline.js'

export class Shell {

  constructor (prompt) {
    this.prompt = prompt || '>'
    this.rdl = new Readline(this.prompt)
    this.history = []
    this.history_ptr = 0
  }

  add_to_history (text) {
    this.history.push(text)
    this.history_ptr = this.history.length - 1
  }

  prev_history () {
    if (this.history_ptr < 0) {
      this.history_ptr = this.history.length
    }
  }

  next_history () {
    if (this.history_ptr > this.history.length - 1) {
      this.history_ptr = 0
    }
  }

  clear_history () {
    this.history = []
    this.history_ptr = 0
  }

}
