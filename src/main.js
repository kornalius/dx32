require('file?name=[name].[ext]!../node_modules/pixi.js/bin/pixi.js');
require('file?name=[name].[ext]!../bower_components/Wad/build/wad.min.js');

import css from '../style/main.css';
import t from '../html/main.html';

import hexy from 'hexy';

import VM from './vm.js';

var src = '\n\
            #my-const $FF $20\n\
            :my-label db $FF my-const, 40\n\
            \n\
            ::init\n\
              :v = "a string now" \n\
              sts v ("a string now")\n\
              if (& (> 10 $A0) (< 20 $02))\n\
                :v = (- $FFFF 30)\n\
              else\n\
                :v = ((+ $FF 30)) ;this is a comment\n\
              end\n\
              \n\
            end\n\
            \n\
            ::shut\n\
            end\n\
            \n\
            ::tick ms\n\
            end\n\
            \n\
            ::main\n\
              init()\n\
              (#1:moveTo 10 2)\n\
              :i = 0\n\
              whl (< (ld i) 5)\n\
                #1:bs\n\
                :i = (+ (ld i) 1)\n\
              end\n\
              \n\
              :n db $01 $01 $02 \'F\' \'3\' $00 $03 $10 $08 $14 $30 $00 $00\n\
              :wad = #6:note(n)\n\
              #6:play(@wad)\n\
              \n\
              hlt()\n\
              \n\
            end\n\
            \n\
          ';
console.log(src);

var vm = new VM();
vm.load(src);
vm.run();
vm.mm.dump();

// console.log(hexy.hexy(vm.mem, { offset: 0, length: 512, display_offset: 0x00, width: 16, caps: 'upper', indent: 2 }));

// var el = document.createElement('div');
// el.innerHTML = t;
// document.body.appendChild(el);
