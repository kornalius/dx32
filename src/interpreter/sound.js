import _ from 'lodash'

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


export class Sound {

  snd_init () {
    this.sounds = {}
  }

  snd_reset () {
    for (let k in this.sounds) {
      let s = this.sounds[k]
      if (s.playable) {
        s.stop()
      }
    }
  }

  snd_shut () {
    this.sounds = {}
  }

  snd_tick (t) {
  }

  snd_load (name, path, loop) {
    this.sounds[name] = new Wad({ source: require('file?name=[path]/[name].[ext]!../../sounds/' + path), loop: loop || false })
  }

  snd_name (name, random = false) {
    if (random) {
      let c = _.reduce(this.sounds, (r, v, k) => { return r + (_.startsWith(k, name) ? 1 : 0) }, 0)
      return name + _.random(1, c)
    }
    else {
      return name
    }
  }

  snd_play (name, options = {}, random = false, repeat_min = 1, repeat_max = 1) {
    repeat_max = _.random(repeat_min, repeat_max)
    while (repeat_max > 0) {
      let s = this.sounds[this.snd_name(name, random)]
      if (s) {
        s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }))
      }
      repeat_max--
    }
  }

  snd_stop (name) {
    let s = this.sounds[this.snd_name(name, false)]
    if (s) {
      s.stop()
    }
  }

  snd_free (name) {
    delete this.sounds[this.snd_name(name)]
  }

  process_note (addr) {
    // note ( 0 = end, 1 = shape, 2 = pitch, 3 = volume, 4 = loop, 5 = detune, 6 = wait, 7 = label, 8 = envelop, 9 = filter, 10 = delay, 11 = vibrato, 12 = tremolo )

    let note = {
      source: 'sine',
    }

    let r

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 1:  // shape
          let value = _vm.ldb(addr)
          addr++
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
            note.source = _vm.lds(addr)
            addr += note.source.length + 1
          }
          break

        case 2:  // pitch
          note.pitch = _vm.lds(addr, 3)
          addr += 3
          break

        case 3:  // volume
          note.volume = _vm.ldb(addr) / 100
          addr++
          break

        case 4:  // loop
          note.loop = _vm.ldb(addr) === 1
          addr++
          break

        case 5:  // detune
          note.detune = _vm.ldb(addr) / 100
          addr++
          break

        case 6:  // wait
          note.wait = _vm.ldw(addr)
          addr += 2
          break

        case 7:  // label
          note.label = _vm.ldb(addr)
          addr++
          break

        case 8:  // envelop
          r = this.process_envelop(addr)
          note.env = r.envelop
          addr = r.addr
          break

        case 9:  // filter
          r = this.process_filter(addr)
          note.filter = r.filter
          addr = r.addr
          break

        case 10:  // delay
          r = this.process_delay(addr)
          note.delay = r.delay
          addr = r.addr
          break

        case 11:  // vibrato
          r = this.process_vibrato(addr)
          note.vibrato = r.vibrato
          addr = r.addr
          break

        case 12:  // tremolo
          r = this.process_tremolo(addr)
          note.tremolo = r.tremolo
          addr = r.addr
          break
      }

      cmd = mem[addr++]
    }

    return { note, addr }
  }

  process_envelop (addr) {
    // ENVELOP ( 20 = sustain, 21 = hold, 22 = release, 23 = decay, 24 = attack )

    let envelop = {
    }

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 20:  // sustain
          envelop.sustain = _vm.ldb(addr) / 100
          addr++
          break

        case 21:  // hold
          envelop.hold = _vm.ldw(addr)
          addr += 2
          break

        case 22:  // release
          envelop.release = _vm.ldw(addr)
          addr += 2
          break

        case 23:  // decay
          envelop.decay = _vm.ldw(addr)
          addr += 2
          break

        case 24:  // attack
          envelop.attack = _vm.ldw(addr)
          addr += 2
          break
      }

      cmd = mem[addr++]
    }

    return { envelop, addr }
  }

  process_filter (addr) {
    // FILTER ( 30 = type (L H), 31 = freq, 32 = Q, 33 = envelop)

    let filter = {
    }

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 30:  // type (L H)
          let value = _vm.ldb(addr)
          addr++
          if (value === 1) {
            filter.type = 'lowpass'
          }
          else if (value === 2) {
            filter.type = 'hipass'
          }
          break

        case 31:  // freq
          filter.freq = _vm.ldw(addr)
          addr += 2
          break

        case 32:  // Q
          filter.q = _vm.ldb(addr)
          addr++
          break

        case 33:  // envelop
          let r = this.process_envelop(addr)
          filter.env = r.envelop
          addr = r.addr
          break
      }

      cmd = mem[addr++]
    }

    return { filter, addr }
  }

  process_reverb (addr) {

  }

  process_delay (addr) {
    // DELAY ( 40 = time, 41 = wet, 42 = feedback )

    let delay = {
    }

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 40:  // time
          delay.time = _vm.ldw(addr)
          addr += 2
          break

        case 41:  // wet
          delay.freq = _vm.ldw(addr)
          addr += 2
          break

        case 42:  // feedback
          delay.feedback = _vm.ldw(addr)
          addr += 2
          break
      }

      cmd = mem[addr++]
    }

    return { delay, addr }
  }

  process_vibrato (addr) {
    // VIBRATO ( 50 = shape, 51 = magnitude, 52 = speed, 53 = attack )

    let vibrato = {
    }

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 50:  // time
          let value = _vm.ldb(addr)
          addr++
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
          break

        case 51:  // magnitude
          vibrato.magnitude = _vm.ldw(addr)
          addr += 2
          break

        case 52:  // speed
          vibrato.speed = _vm.ldw(addr)
          addr += 2
          break

        case 53:  // attack
          vibrato.attack = _vm.ldw(addr)
          addr += 2
          break
      }

      cmd = mem[addr++]
    }

    return { vibrato, addr }
  }

  process_tremolo (addr) {
    // TREMOLO ( 60 = shape, 61 = magnitude, 62 = speed, 63 = attack )

    let tremolo = {
    }

    let mem = _vm.mem_array

    let cmd = mem[addr++]
    while (cmd !== 0) {
      switch (cmd) {
        case 60:  // shape
          let value = _vm.ldb(addr)
          addr++
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
          break

        case 61:  // magnitude
          tremolo.magnitude = _vm.ldw(addr)
          addr += 2
          break

        case 62:  // speed
          tremolo.speed = _vm.ldw(addr)
          addr += 2
          break

        case 63:  // attack
          tremolo.attack = _vm.ldw(addr)
          addr += 2
          break
      }

      cmd = mem[addr++]
    }

    return { tremolo, addr }
  }

  snd_note (addr) {
    let { note } = this.process_note(addr)
    let id = _.uniqueId()
    this.sounds[id] = new Wad(note)
    return id
  }

  snd_poly () {
    let id = _.uniqueId()
    this.sounds[id] = new Wad.Poly()
    return id
  }

  snd_poly_add (poly_id, wad_id) {
    this.sounds[poly_id].add(this.sounds[wad_id])
  }

  snd_poly_remove (poly_id, wad_id) {
    this.sounds[poly_id].remove(this.sounds[wad_id])
  }

}
