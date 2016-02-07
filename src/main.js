import css from '../style/main.css';
import t from '../html/main.html';

import hexy from 'hexy';

import VM from './vm.js';

var src = '\n\
            #my-const $FF $20\n\
            :my-label db $FF my-const, 40\n\
            \n\
            @_init\n\
              if (> 10 $A0)\n\
                psh (- $FFFF 30)\n\
              end\n\
              \n\
              psh ((+ $FF 30)) ;this is a comment\n\
              psh ("a string now")\n\
              hlt()\n\
              \n\
              end\n\
            \n\
            @_shut\n\
              end\n\
            \n\
            @_tick ms\n\
              end\n\
            \n\
            @main\n\
              end\n\
            \n\
          ';
console.log(src);

var vm = new VM();
var addr = vm.load(src);
vm.run(addr);

console.log(hexy.hexy(vm.mem, { offset: 0, length: 512, display_offset: 0x00, width: 16, caps: 'upper', indent: 2 }));

var el = document.createElement('div');
el.innerHTML = t;
document.body.appendChild(el);
