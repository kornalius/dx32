import Port from '../port.js';
import { defaults } from '../globals.js';


/*
  shapes (1 = sine, 2 = square, 3 = triangle, 4 = sawtooth)

  [ cmd, value, ..., 00 ]

  cmd ( 0 = end, 1 = shape, 2 = pitch, 3 = volume, 4 = loop, 5 = detune, 6 = wait, 7 = label, 8 = envelop, 9 = filter, 10 = delay, 11 = vibrato, 12 = tremolo )

  value (2 bytes)

  ENVELOP ( 20 = sustain, 21 = hold, 22 = release, 23 = decay, 24 = attack )

  FILTER ( 30 = type (L H), 31 = freq, 32 = Q, 33 = envelop)

  REVERB ( )

  DELAY ( 40 = time, 41 = wet, 42 = feedback )

  VIBRATO ( 50 = shape, 51 = magnitude, 52 = speed, 53 = attack )

  TREMOLO ( 60 = shape, 61 = magnitude, 62 = speed, 63 = attack )
*/


class Sound extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.sounds = {};
  }

  boot (cold = false) {
    super.boot(cold);

    if (cold) {
    }

    // var saw = new Wad({source : 'sawtooth', pitch: 'E1', volume : .1});
    // saw.play();
  }

  reset () {
    super.reset();
  }

  shut () {
    super.shut();
  }

  _process_note (addr) {
    // note ( 0 = end, 1 = shape, 2 = pitch, 3 = volume, 4 = loop, 5 = detune, 6 = wait, 7 = label, 8 = envelop, 9 = filter, 10 = delay, 11 = vibrato, 12 = tremolo )

    var note = {
      source: 'sine',
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 1:  // shape
          var value = _vm.ldb(addr);
          addr++;
          if (value === 1) {
            note.source = 'sine'
          }
          else if (value === 2) {
            note.source = 'square'
          }
          else if (value === 3) {
            note.source = 'triangle'
          }
          else if (value === 4) {
            note.source = 'sawtooth'
          }
          else if (value === 5) {
            note.source = _vm.lds(addr);
            addr += note.source.length + 1;
          }
          break;

        case 2:  // pitch
          note.pitch = _vm.lds(addr, 3);
          addr += 3;
          break;

        case 3:  // volume
          note.volume = _vm.ldb(addr) / 100;
          addr++;
          break;

        case 4:  // loop
          note.loop = _vm.ldb(addr) === 1;
          addr++;
          break;

        case 5:  // detune
          note.detune = _vm.ldb(addr) / 100;
          addr++;
          break;

        case 6:  // wait
          note.wait = _vm.ldw(addr);
          addr += 2;
          break;

        case 7:  // label
          note.label = _vm.ldb(addr);
          addr++;
          break;

        case 8:  // envelop
          var r = this._process_envelop(addr);
          note.env = r.envelop;
          addr = r.addr;
          break;

        case 9:  // filter
          var r = this._process_filter(addr);
          note.filter = r.filter;
          addr = r.addr;
          break;

        case 10:  // delay
          var r = this._process_delay(addr);
          note.delay = r.delay;
          addr = r.addr;
          break;

        case 11:  // vibrato
          var r = this._process_vibrato(addr);
          note.vibrato = r.vibrato;
          addr = r.addr;
          break;

        case 12:  // tremolo
          var r = this._process_tremolo(addr);
          note.tremolo = r.tremolo;
          addr = r.addr;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { note, addr };
  }

  _process_envelop (addr) {
    // ENVELOP ( 20 = sustain, 21 = hold, 22 = release, 23 = decay, 24 = attack )

    var envelop = {
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 20:  // sustain
          envelop.sustain = _vm.ldb(addr) / 100;
          addr++;
          break;

        case 21:  // hold
          envelop.hold = _vm.ldw(addr);
          addr += 2;
          break;

        case 22:  // release
          envelop.release = _vm.ldw(addr);
          addr += 2;
          break;

        case 23:  // decay
          envelop.decay = _vm.ldw(addr);
          addr += 2;
          break;

        case 24:  // attack
          envelop.attack = _vm.ldw(addr);
          addr += 2;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { envelop, addr };
  }

  _process_filter (addr) {
    // FILTER ( 30 = type (L H), 31 = freq, 32 = Q, 33 = envelop)

    var filter = {
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 30:  // type (L H)
          var value = _vm.ldb(addr);
          addr++;
          if (value === 1) {
            filter.type = 'lowpass';
          }
          else if (value === 2) {
            filter.type = 'hipass';
          }
          break;

        case 31:  // freq
          filter.freq = _vm.ldw(addr);
          addr += 2;
          break;

        case 32:  // Q
          filter.q = _vm.ldb(addr);
          addr++;
          break;

        case 33:  // envelop
          var r = this._process_envelop(addr);
          filter.env = r.envelop;
          addr = r.addr;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { filter, addr };
  }

  _process_reverb (addr) {

  }

  _process_delay (addr) {
    // DELAY ( 40 = time, 41 = wet, 42 = feedback )

    var delay = {
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 40:  // time
          delay.time = _vm.ldw(addr);
          addr += 2;
          break;

        case 41:  // wet
          delay.freq = _vm.ldw(addr);
          addr += 2;
          break;

        case 42:  // feedback
          delay.feedback = _vm.ldw(addr);
          addr += 2;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { delay, addr };
  }

  _process_vibrato (addr) {
    // VIBRATO ( 50 = shape, 51 = magnitude, 52 = speed, 53 = attack )

    var vibrato = {
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 50:  // time
          var value = _vm.ldb(addr);
          addr++;
          if (value === 1) {
            vibrato.shape = 'sine'
          }
          else if (value === 2) {
            vibrato.shape = 'square'
          }
          else if (value === 3) {
            vibrato.shape = 'triangle'
          }
          else if (value === 4) {
            vibrato.shape = 'sawtooth'
          }
          break;

        case 51:  // magnitude
          vibrato.magnitude = _vm.ldw(addr);
          addr += 2;
          break;

        case 52:  // speed
          vibrato.speed = _vm.ldw(addr);
          addr += 2;
          break;

        case 53:  // attack
          vibrato.attack = _vm.ldw(addr);
          addr += 2;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { vibrato, addr };
  }

  _process_tremolo (addr) {
    // TREMOLO ( 60 = shape, 61 = magnitude, 62 = speed, 63 = attack )

    var tremolo = {
    };

    var cmd = _vm.mem[addr++];
    while (cmd !== 0) {
      switch(cmd) {
        case 60:  // shape
          var value = _vm.ldb(addr);
          addr++;
          if (value === 1) {
            tremolo.shape = 'sine'
          }
          else if (value === 2) {
            tremolo.shape = 'square'
          }
          else if (value === 3) {
            tremolo.shape = 'triangle'
          }
          else if (value === 4) {
            tremolo.shape = 'sawtooth'
          }
          break;

        case 61:  // magnitude
          tremolo.magnitude = _vm.ldw(addr);
          addr += 2;
          break;

        case 62:  // speed
          tremolo.speed = _vm.ldw(addr);
          addr += 2;
          break;

        case 63:  // attack
          tremolo.attack = _vm.ldw(addr);
          addr += 2;
          break;
      }

      cmd = _vm.mem[addr++];
    }

    return { tremolo, addr };
  }

  note (addr) {
    var { note } = this._process_note(addr);
    var id = _.uniqueId();
    this.sounds[id] = new Wad(note);
    return id;
  }

  free (id) {
    delete this.sounds[id];
  }

  poly () {
    var id = _.uniqueId();
    this.sounds[id] = new Wad.Poly();
    return id;
  }

  poly_add (poly_id, wad_id) {
    this.sounds[poly_id].add(this.sounds[wad_id]);
  }

  poly_remove (poly_id, wad_id) {
    this.sounds[poly_id].remove(this.sounds[wad_id]);
  }

  play (id) {
    this.sounds[id].play();
  }

  stop (id) {
    this.sounds[id].stop();
  }

}

export default Sound
