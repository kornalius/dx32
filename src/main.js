require('file?name=[name].[ext]!../node_modules/pixi.js/bin/pixi.js')
require('file?name=[name].[ext]!../bower_components/Wad/build/wad.min.js')

import css from '../style/main.css'
import t from '../html/main.html'

import { VM } from './interpreter/vm.js'

setTimeout(() => {
  let src = require('raw!../test/test1.x32')
  console.log(src)

  let vm = new VM()
  vm.load(src)
  vm.run()
  vm.mm.dump()
}, 100)

// console.log(hexy.hexy(vm.mem_buffer, { offset: 0, length: 512, display_offset: 0x00, width: 16, caps: 'upper', indent: 2 }))

// let el = document.createElement('div')
// el.innerHTML = t
// document.body.appendChild(el)
