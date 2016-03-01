import { rnd } from './globals.js';


class IO {

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

  _playSound (name, options = {}, min_time = 250, max_time = 500, min = 1, max = 1, random = false, queue = true) {
    if (_.isUndefined(this._sounds_queue)) {
      this._sounds_queue = [];
    }

    var that = this;

    max = rnd(min, max);
    while (max > 0) {

      if (!queue) {
        var s = this._sounds[this._sound_name(name, random)];
        if (s) {
          s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }));
        }
      }
      else {
        this._sounds_queue.push({ elapse: rnd(min_time, max_time), name: this._sound_name(name, random) });

        var tt = 0;
        for (var sq of this._sounds_queue) {
          tt += sq.elapse;
        }

        setTimeout(() => {
          var sq = that._sounds_queue.shift();
          var s = that._sounds[sq.name];
          if (s) {
            s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }));
          }
        }, tt);
      }

      max--;
    }
  }

}

export default IO;
