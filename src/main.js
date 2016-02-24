require('file?name=[name].[ext]!../node_modules/pixi.js/bin/pixi.js');
require('file?name=[name].[ext]!../bower_components/Wad/build/wad.min.js');

import css from '../style/main.css';
import t from '../html/main.html';

import hexy from 'hexy';

import VM from './vm.js';

var src = '\n\
            #my_const $FF $20\n\
            :my_label db $FF my_const, 40\n\
            :my_dict = { :k1 = 3, :k2 = 100, :k3 = "string" }\n\
            print(lds(@my_dict.k3))\n\
            \n\
            :s22 struct\n\
              :a1 db 0\n\
              :b1 db 0\n\
              :st struct\n\
                :a2 db 0\n\
                :b2 db 0\n\
              end\n\
            end\n\
            \n\
            :init()\n\
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
            :shut()\n\
            end\n\
            \n\
            :tick(ms)\n\
            end\n\
            \n\
            :main()\n\
              init()\n\
              (#1:moveTo 10 2)\n\
              :i = 0\n\
              whl (< @i 5)\n\
                #1:bs\n\
                :i = +(@i 1)\n\
                print(@i)\n\
              end\n\
              \n\
              :n db $01 $01 $02 \'F\' \'3\' $00 $03 $10 $08 $14 $30 $00 $00\n\
              :wad = #6:note(n)\n\
              #6:play(@wad)\n\
              \n\
              :stack dd [100]\n\
              stk stack 100\n\
              psh stack 10 20 30\n\
              print pop stack\n\
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
