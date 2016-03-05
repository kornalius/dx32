import { rnd } from './globals.js';


class Sound {

  _loadSound (i) {
    if (_.isUndefined(this._sounds)) {
      this._sounds = {};
    }
    this._sounds[i.name] = new Wad({ source: require('file?name=[path]/[name].[ext]!../sounds/' + i.path), loop: i.loop || false });
  }

  _sound_name (name, random = false) {
    if (random) {
      var c = _.reduce(this._sounds, (r, v, k) => { return r + (_.startsWith(k, name) ? 1 : 0); }, 0);
      return name + rnd(1, c);
    }
    else {
      return name;
    }
  }

  _playSound (name, options = {}, random = false, min = 1, max = 1) {
    max = rnd(min, max);
    while (max > 0) {
      var s = this._sounds[this._sound_name(name, random)];
      if (s) {
        s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }));
      }
      max--;
    }
  }

}

export default Sound;
