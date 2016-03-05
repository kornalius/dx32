import _ from 'lodash';
import Port from '../port.js';

var crtUrl = require('file?name=[path]/[name].[ext]!../../imgs/crt.png');

PIXI.Point.prototype.distance = (target) => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y));
};


class BDF {

  constructor () {
    this.meta = null;
    this.glyphs = null;
  }

  load (data) {
    this.meta = {};
    this.glyphs = {};

    var fontLines = data.split('\n');
    var declarationStack = [];
    var currentChar = null;

    for (var i = 0; i < fontLines.length; i++) {
      var line = fontLines[i];
      var line_data = line.split(/\s+/);
      var declaration = line_data[0];

      switch (declaration)
      {
        case 'STARTFONT':
          declarationStack.push(declaration);
          this.meta.version = +line_data[1];
          break;
        case 'FONT':
          this.meta.name = +line_data[1];
          break;
        case 'SIZE':
          this.meta.size = {
            points:      +line_data[1],
            resolutionX: +line_data[2],
            resolutionY: +line_data[3]
          };
          break;
        case 'FONTBOUNDINGBOX':
          this.meta.boundingBox = {
            width:  +line_data[1],
            height: +line_data[2],
            x:      +line_data[3],
            y:      +line_data[4]
          };
          break;
        case 'STARTPROPERTIES':
          declarationStack.push(declaration);
          this.meta.properties = {};
          break;
        case 'FONT_DESCENT':
          this.meta.properties.fontDescent = +line_data[1];
          break;
        case 'FONT_ASCENT':
          this.meta.properties.fontAscent = +line_data[1];
          break;
        case 'DEFAULT_CHAR':
          this.meta.properties.defaultChar = +line_data[1];
          break;
        case 'ENDPROPERTIES':
          declarationStack.pop();
          break;
        case 'CHARS':
          this.meta.totalChars = +line_data[1];
          break;
        case 'STARTCHAR':
          declarationStack.push(declaration);
          currentChar = {
            name:   +line_data[1],
            bytes:  [],
            bitmap: []
          };
          break;
        case 'ENCODING':
          currentChar.code = +line_data[1];
          currentChar.char = String.fromCharCode(+line_data[1]);
          break;
        case 'SWIDTH':
          currentChar.scalableWidthX = +line_data[1];
          currentChar.scalableWidthY = +line_data[2];
          break;
        case 'DWIDTH':
          currentChar.deviceWidthX = +line_data[1];
          currentChar.deviceWidthY = +line_data[2];
          break;
        case 'BBX':
          currentChar.boundingBox = {
            x:      +line_data[3],
            y:      +line_data[4],
            width:  +line_data[1],
            height: +line_data[2]
          };
          break;
        case 'BITMAP':
          for (var row = 0; row < currentChar.boundingBox.height; row++, i++) {
            var byte = parseInt(fontLines[i + 1], 16);
            currentChar.bytes.push(byte);
            currentChar.bitmap[row] = [];
            for (var bit = 7; bit >= 0; bit--) {
              currentChar.bitmap[row][7 - bit] = byte & 1 << bit ? 1 : 0;
            }
          }
          break;
        case 'ENDCHAR':
          declarationStack.pop();
          this.glyphs[currentChar.code] = currentChar;
          currentChar = null;
          break;
        case 'ENDFONT':
          declarationStack.pop();
          break;
      }
    }

    if (declarationStack.length) {
      throw "Couldn't correctly parse font";
    }
  }
}


class Video extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);
  }

  _overlay (name, width, height, scale = 1.0, stageit = true) {
    var canvas = new PIXI.CanvasBuffer(width, height);
    var tex = PIXI.Texture.fromCanvas(canvas.canvas, PIXI.SCALE_MODES.NEAREST);
    tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
    var sprite = new PIXI.Sprite(tex);
    sprite.scale.x = sprite.scale.y = scale;
    if (stageit) {
      this.stage.addChild(sprite);
    }
    var context = canvas.canvas.getContext('2d', { alpha: true, antialias: false });
    var o = { context, canvas, tex, sprite, width, height, scale };
    _.set(this.overlays, name, o);
    return o;
  }

  _makeTextCursor (style = 'block', color = 1) {
    var cursor = this.overlays.cursor.text;
    var data = cursor.context.getImageData(0, 0, cursor.sprite.width, cursor.sprite.height);
    var pixels = data.data;
    var sz = cursor.sprite.width * 4;
    var c = this.paletteRGBA(color);
    var i;
    if (style === 'block') {
      for (i = 0; i < pixels.length; i += 4) {
        this.RGBAToMem(pixels, i, c);
      }
    }
    else if (style === 'underline') {
      for (i = pixels.length - 3 * sz; i < pixels.length; i += 4) {
        this.RGBAToMem(pixels, i, c);
      }
    }
    else if (style === 'line') {
      for (var y = 0; y < cursor.sprite.height; y++) {
        i = y * sz;
        for (var x = 0; x < 2 * 4; x++) {
          this.RGBAToMem(pixels, i + x, c);
        }
      }
    }
    cursor.context.putImageData(data, 0, 0);
  }

  _makeNoises (count = 8, rate = 0.85, red = 100, green = 100, blue = 100, alpha = 0.15) {
    this.overlays.noises = {};
    var a = alpha * 255;
    for (var c = 0; c < count; c++) {
      var noise = this._overlay('noises.noise' + c, this.renderer.width, this.renderer.height);
      noise.visible = c === 0;
      var data = noise.context.getImageData(0, 0, noise.width, noise.height);
      var pixels = data.data;
      for (var i = 0; i < pixels.length; i += 4) {
        if (Math.random() >= rate) {
          pixels[i] = Math.trunc(Math.random() * red);
          pixels[i + 1] = Math.trunc(Math.random() * green);
          pixels[i + 2] = Math.trunc(Math.random() * blue);
          pixels[i + 3] = a;
        }
      }
      noise.context.putImageData(data, 0, 0);
    }
  }

  _makeCrt (radius = 0.25, inside_alpha = 0.2, outside_alpha = 0.15) {
    var crt = this.overlays.crt;
    crt.context.globalCompositeOperation = 'darker';
    var grd = crt.context.createRadialGradient(crt.width / 2, crt.height / 2, crt.height / 2, crt.width / 2, crt.height / 2, crt.height / radius);
    grd.addColorStop(0, 'rgba(255, 255, 255, ' + inside_alpha + ')');
    grd.addColorStop(1, 'rgba(0, 0, 0, ' + outside_alpha + ')');
    crt.context.fillStyle = grd;
    crt.context.fillRect(0, 0, crt.width, crt.height);
    crt.context.globalCompositeOperation = 'source-over';
  }

  _makeScanlines (distance = 3, alpha = 0.35) {
    var scanlines = this.overlays.scanlines;
    var data = scanlines.context.getImageData(0, 0, scanlines.width, scanlines.height);
    var pixels = data.data;
    var sz = scanlines.width * 4;
    for (var y = 0; y < scanlines.height; y += distance) {
      var idx = y * sz;
      for (var i = idx; i < idx + sz; i += 4) {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 255 * alpha;
      }
    }
    scanlines.context.putImageData(data, 0, 0);
  }

  _makeScanline (alpha = 0.1) {
    var scanline = this.overlays.scanline;
    var data = scanline.context.getImageData(0, 0, scanline.width, scanline.height);
    var pixels = data.data;
    var sz = scanline.width * 4;
    var l = 0;
    var h = scanline.height;
    var a = alpha * 255;
    for (var y = 0; y < scanline.height * sz; y += sz) {
      for (var i = y; i < y + sz; i += 4) {
        pixels[i] = 25;
        pixels[i + 1] = 25;
        pixels[i + 2] = 25;
        pixels[i + 3] = l / h * a;
      }
      l++;
    }
    scanline.context.putImageData(data, 0, 0);
  }

  _makeRGB (alpha = 0.075) {
    var rgb = this.overlays.rgb;
    var data = rgb.context.getImageData(0, 0, rgb.width, rgb.height);
    var pixels = data.data;
    for (var i = 0; i < pixels.length; i += 16) {
      pixels[i] = 100;
      pixels[i + 1] = 100;
      pixels[i + 2] = 100;
      pixels[i + 3] = 255 * alpha;
    }
    rgb.context.putImageData(data, 0, 0);
  }

  boot (cold = false) {
    super.boot(cold);

    if (cold) {
      this.info = _vm.mm.alloc(80);

      this.reset();

      this.palette = _vm.mm.alloc(this.palette_size);
      this.sprites = _vm.mm.alloc(this.sprites_size);
      this.fonts = _vm.mm.alloc(this.fonts_size);
      this.screen = _vm.mm.alloc(this.screen_size);
      this.text_buffer = _vm.mm.alloc(this.text_size);

      this.writeInfo();

      this._setupPalette();

      this._loadFont();

      this.stage = new PIXI.Container();

      this.renderer = new PIXI.autoDetectRenderer(this.width * this.scale + this.offset.x * 2, this.height * this.scale + this.offset.y * 2, null, { });
      this.renderer.view.style.position = 'absolute';
      this.renderer.view.style.top = '0px';
      this.renderer.view.style.left = '0px';
      this._resize();
      document.body.appendChild(this.renderer.view);
      window.addEventListener('resize', this._resize.bind(this));

      this.overlays = {};

      this.setupOverlays();

      this.overlays.scanline.sprite.y = -this.overlays.scanline.sprite.height;
      var noises = this.overlays.noises;
      var noiseKeys = _.keys(noises);

      var that = this;
      PIXI.ticker.shared.add((time) => {
        var t = performance.now();

        if (t - that.lastNoises >= 250) {
          var noise = noiseKeys[Math.trunc(Math.random() * noiseKeys.length)];
          for (var k in noises) {
            noises[k].sprite.visible = false;
          }
          noises[noise].sprite.visible = true;
          that.lastNoises = t;
          that.forceUpdate = true;
        }

        if (t - that.lastScanline >= 50) {
          that.overlays.scanline.sprite.y += 16;
          if (that.overlays.scanline.sprite.y > that.renderer.height) {
            that.overlays.scanline.sprite.y = -that.overlays.scanline.sprite.height;
          }
          that.lastScanline = t;

          that.overlays.cursor.mouse.sprite.x = 0;
          that.overlays.cursor.mouse.sprite.y = 0;
          that.lastMouseCursor = t;

          that.forceUpdate = true;
        }

        if (t - that.lastTextCursor >= 500) {
          that.overlays.cursor.text.sprite.visible = !that.overlays.cursor.text.sprite.visible;
          that.lastTextCursor = t;
          that.forceUpdate = true;
        }

        if (that.forceUpdate) {
          that.forceUpdate = false;

          that.overlays.cursor.text.sprite.x = (that.overlays.cursor.text.x - 1) * that.overlays.cursor.text.sprite.width + that.offset.x;
          that.overlays.cursor.text.sprite.y = (that.overlays.cursor.text.y - 1) * that.overlays.cursor.text.sprite.height + that.offset.y;

          if (that.forceSprites) {
            that.draw_sprites();
            that.forceSprites = false;
          }

          if (that.forceText) {
            that.draw_text();
            that.forceText = false;
          }

          if (that.forceFlip) {
            that.flip();
            that.forceFlip = false;
          }

          that.renderer.render(that.stage);
        }
      });

      this.clear();

      this.test();
    }

  }

  setupOverlays () {
    this._overlay('screen', this.width, this.height, this.scale);
    this.overlays.screen.sprite.x = this.offset.x;
    this.overlays.screen.sprite.y = this.offset.y;

    this._overlay('scanline', this.renderer.width, 640);

    this._overlay('cursor.text', this.char_width * this.scale, this.char_height * this.scale);
    this.overlays.cursor.text.x = 11;
    this.overlays.cursor.text.y = 10;
    this._makeTextCursor();

    this._overlay('cursor.mouse', this.sprite_width * this.scale, this.sprite_height * this.scale);
    // this._makeMouseCursor();

    this._overlay('rgb', this.renderer.width, this.renderer.height);
    this._overlay('scanlines', this.renderer.width, this.renderer.height);
    this._overlay('crt', this.renderer.width, this.renderer.height);

    this._makeNoises();
    this._makeRGB();
    this._makeScanlines();
    this._makeScanline();
    this._makeCrt();

    var tex = PIXI.Texture.fromImage(crtUrl);
    var monitor = new PIXI.Sprite(tex);
    monitor.width = this.renderer.width;
    monitor.height = this.renderer.height;
    this.stage.addChild(monitor);
  }

  test () {
    _vm.fill(this.screen, 10, 2000);

    this.pixel(200, 0);
    this.pixel(400, 6);
    this.pixel(500, 8);
    this.pixel(600, 20);

    this.moveTo(1, 1);
    this.putChar('A', 29, 15);

    this.moveTo(10, 11);
    this.print('Welcome to DX32\nÉgalitée!', 2, 6);

    var chars = '';
    for (var i = 33; i < 256; i++) {
      chars += String.fromCharCode(i);
    }
    this.moveTo(1, 2);
    this.print(chars, 1, 0);

    this.moveTo(1, 23);
    this.print('Second to last line', 30, 0);

    this.moveTo(1, 24);
    this.print('012345678901234567890123456789012345678901234567890123', 1, 0);

    this.refreshText();
  }

  writeInfo () {
    _vm.beginSequence(this.info);

    _vm.dword(this.screen);
    _vm.dword(this.width);
    _vm.dword(this.height);
    _vm.dword(this.scale);

    _vm.dword(this.palette);
    _vm.dword(this.palette_count);
    _vm.dword(this.palette_size);

    _vm.dword(this.sprites);
    _vm.dword(this.sprite_width);
    _vm.dword(this.sprite_height);
    _vm.dword(this.sprite_size);
    _vm.dword(this.sprites_size);

    _vm.dword(this.fonts);
    _vm.dword(this.font_size);
    _vm.dword(this.fonts_size);

    _vm.dword(this.char_count);
    _vm.dword(this.char_width);
    _vm.dword(this.char_height);

    _vm.dword(this.text_width);
    _vm.dword(this.text_height);
    _vm.dword(this.text_buffer);
    _vm.dword(this.text_size);

    _vm.endSequence();
  }

  reset () {
    super.reset();

    this.width = 378;
    this.height = 264;
    this.scale = 3;

    this.screen_size = this.width * this.height;
    this.offset = new PIXI.Point(16, 16);

    this.palette_count = 32;
    this.palette_size = this.palette_count * 4;

    this.sprite_count = 16;
    this.sprite_width = 16;
    this.sprite_height = 16;
    this.sprite_size = this.sprite_width * this.sprite_height;
    this.sprites_size = this.sprite_count * this.sprite_size;

    this.char_count = 256;
    this.char_width = 7;
    this.char_height = 11;
    this.char_offset_x = 0;
    this.char_offset_y = 1;

    this.text_width = Math.round(this.width / this.char_width);
    this.text_height = Math.round(this.height / this.char_height);
    this.text_size = this.text_width * this.text_height * 3;

    this.font_size = this.char_width * this.char_height;
    this.fonts_size = this.char_count * this.font_size;

    this.lastMouse = new PIXI.Point();
    this.forceUpdate = false;
    this.forceFlip = false;
    this.forceText = false;
    this.forceSprites = false;
    this.lastTextCursor = 0;
    this.lastMouseCursor = 0;
    this.lastNoises = 0;
    this.lastScanline = 0;

    this.writeInfo();

    if (this.palette) {
      this._setupPalette();
    }

    if (this.fonts) {
      this._loadFont();
    }

    this.clear();
  }

  shut () {
    super.shut();

    this.stage.destroy();
    this.stage = null;

    this.renderer.destroy();
    this.renderer = null;

    for (var k in this.overlays) {
      this.overlays[k].canvas.destroy();
      this.overlays[k].canvas = null;
    }
  }

  _resize () {
    // var ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height);
    // this.stage.scale.x = this.stage.scale.y = ratio;
    // this.renderer._resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio));
    this.renderer.view.style.left = window.innerWidth * 0.5 - this.renderer.width * 0.5 + 'px';
    this.renderer.view.style.top = window.innerHeight * 0.5 - this.renderer.height * 0.5 + 'px';
    this.refresh();
  }

  _setupPalette () {
    this.paletteRGBA(0, 0x000000ff);
    this.paletteRGBA(1, 0xffffffff);
    this.paletteRGBA(2, 0x120723ff);
    this.paletteRGBA(3, 0x080e41ff);
    this.paletteRGBA(4, 0x12237aff);
    this.paletteRGBA(5, 0x4927a1ff);
    this.paletteRGBA(6, 0x7f65d0ff);
    this.paletteRGBA(7, 0x60c8d0ff);
    this.paletteRGBA(8, 0xaad7dfff);
    this.paletteRGBA(9, 0x331a36ff);
    this.paletteRGBA(10, 0x993dadff);
    this.paletteRGBA(11, 0xdf8085ff);
    this.paletteRGBA(12, 0xf2d5e8ff);
    this.paletteRGBA(13, 0x152418ff);
    this.paletteRGBA(14, 0x12451aff);
    this.paletteRGBA(15, 0x50bf50ff);
    this.paletteRGBA(16, 0x8fea88ff);
    this.paletteRGBA(17, 0xf2efdeff);
    this.paletteRGBA(18, 0x28130dff);
    this.paletteRGBA(19, 0x5f1500ff);
    this.paletteRGBA(20, 0x3f2a00ff);
    this.paletteRGBA(21, 0x5e4800ff);
    this.paletteRGBA(22, 0x91382dff);
    this.paletteRGBA(23, 0x9c6526ff);
    this.paletteRGBA(24, 0xbfd367ff);
    this.paletteRGBA(25, 0xe2d38eff);
    this.paletteRGBA(26, 0x211f35ff);
    this.paletteRGBA(27, 0x36324bff);
    this.paletteRGBA(28, 0x5a5871ff);
    this.paletteRGBA(29, 0x877f97ff);
    this.paletteRGBA(30, 0xc1aebdff);
    this.paletteRGBA(31, 0xe3d1d6ff);
  }

  _loadFont () {
    var b = new BDF();
    var f = require('raw!../../fonts/ctrld-fixed-10r.bdf');
    b.load(f);

    // var points = b.meta.size.points;
    var fontAscent = b.meta.properties.fontAscent;
    // var fontDescent = b.meta.properties.fontDescent;
    var baseline = fontAscent + this.char_offset_y;

    for (var k in b.glyphs) {
      var g = b.glyphs[k];
      var bb = g.boundingBox;
      var dsc = baseline - bb.height - bb.y;
      var ptr = this.fonts + g.code * this.font_size;

      for (var y = 0; y < bb.height; y++) {
        var p = ptr + (y + dsc) * this.char_width;
        for (var x = 0; x < bb.width; x++) {
          _vm.mem[p + x + bb.x + this.char_offset_x] |= g.bitmap[y][x];
        }
      }
    }

    return b;
  }

  flip () {
    var screen = this.overlays.screen;
    var data = screen.context.getImageData(0, 0, screen.width, screen.height);
    var pixels = data.data;

    var sn = this.screen + this.screen_size;
    for (var si = this.screen, pi = 0; si < sn; si++, pi += 4) {
      this.RGBAToMem(pixels, pi, _vm.mem.readUInt32LE(this.palette + _vm.mem[si] * 4));
    }

    screen.context.putImageData(data, 0, 0);
  }

  draw_text () {
    var cw = this.char_width;
    var ch = this.char_height;
    var tw = this.text_width;
    var th = this.text_height;

    var idx = this.text_buffer;
    for (var y = 0; y < th; y++) {
      for (var x = 0; x < tw; x++) {
        var c = _vm.mem[idx];
        if (c) {
          var fg = _vm.mem[idx + 1];
          var bg = _vm.mem[idx + 2];

          var px = x * cw;
          var py = y * ch;

          var ptr = this.fonts + c * this.font_size;
          for (var by = 0; by < ch; by++) {
            var pi = (py + by) * this.width + px;
            for (var bx = 0; bx < cw; bx++) {
              this.pixel(pi++, _vm.mem[ptr++] ? fg : bg);
            }
          }
        }
        idx += 3;
      }
    }
  }

  refresh (flip = true) {
    this.forceUpdate = true;
    this.forceFlip = flip;
  }

  refreshText (flip = true) {
    this.forceUpdate = true;
    this.forceFlip = flip;
    this.forceText = true;
  }

  refreshSprites (flip = true) {
    this.forceUpdate = true;
    this.forceFlip = flip;
    this.forceSprites = true;
  }

  clear () {
    _vm.fill(this.screen, 0, this.screen_size);
    _vm.fill(this.text_buffer, 0, this.text_size);
    this.refresh();
  }

  pixelToIndex (x, y) { return y * this.width + x; }

  indexToPixel (i) {
    var y = Math.trunc(i / this.width);
    var x = i - y;
    return { x, y };
  }

  splitRGBA (rgba) { return { r: rgba >> 24 & 0xFF, g: rgba >> 16 & 0xFF, b: rgba >> 8 & 0xFF, a: rgba >> 0xFF }; }

  red (rgba) { return rgba >> 24 & 0xFF; }

  green (rgba) { return rgba >> 16 & 0xFF; }

  blue (rgba) { return rgba >> 8 & 0xFF; }

  alpha (rgba) { return rgba >> 0xFF; }

  RGBAToNum (r, g, b, a) { return r << 24 | g << 16 | b << 8 | a; }

  paletteRGBA (c, r, g, b, a) {
    var pi = this.palette + c * 4;
    if (r) {
      if (r && g && b) {
        this.RGBAToMem(_vm.mem, pi, r, g, b, a);
      }
      else {
        _vm.mem.writeUInt32LE(r, pi);
      }
    }
    return _vm.mem.readUInt32LE(pi);
  }

  RGBAToPalette (r, g, b, a) {
    var rgba = this.RGBAToNum(r, g, b, a);
    for (var c = 0; c < this.palette_count; c++) {
      if (this.paletteRGBA(c) === rgba) {
        return c;
      }
    }
    return -1;
  }

  RGBAToMem (mem, i, r, g, b, a) {
    if (r && !g) {
      g = r >> 16 & 0xFF;
      b = r >> 8 & 0xFF;
      a = r & 0xFF;
      r = r >> 24 & 0xFF;
    }
    mem[i] = r;
    mem[i + 1] = g;
    mem[i + 2] = b;
    mem[i + 3] = a;
  }

  pixel (i, c) {
    var pi = this.screen + i;
    if (c !== undefined && _vm.mem[pi] !== c) {
      _vm.mem[pi] = c;
    }
    return _vm.mem[pi];
  }

  scroll (x, y) {
    _vm.mem.copy(_vm.mem, this.screen, this.screen + y * this.width, (this.height - y) * this.width);
    this.refresh();
  }

  text_index (x, y) {
    return this.text_buffer + ((y - 1) * this.text_width + (x - 1)) * 3;
  }

  text_line (y) {
    var l = this.text_width * 3;
    return { start: this.text_buffer + y * l, end: this.text_buffer + (y + 1) * l - 3, length: l };
  }

  charAt (x, y) {
    var tidx = this.text_index(x, y);
    return { ch: _vm.mem[tidx], fg: _vm.mem[tidx + 1], bg: _vm.mem[tidx + 2] };
  }

  putChar (ch, fg = 1, bg = 0) {
    switch (ch.charCodeAt(0))
    {
      case 13:
      case 10:
        this.cr();
        return;
      case 8:
        this.bs();
        return;
    }
    var { x, y } = this.pos();

    var tidx = this.text_index(x, y);
    _vm.mem[tidx] = ch.charCodeAt(0);
    _vm.mem[tidx + 1] = fg;
    _vm.mem[tidx + 2] = bg;

    this.overlays.cursor.text.x++;
    if (this.overlays.cursor.text.x > this.text_width) {
      this.cr();
    }

    this.refreshText();
  }

  print (text, fg, bg) {
    for (var c of text) {
      this.putChar(c, fg, bg);
    }
    return this;
  }

  pos () { return { x: this.overlays.cursor.text.x, y: this.overlays.cursor.text.y }; }

  moveTo (x, y) {
    if (x > this.text_width) {
      x = this.text_width;
    }
    else if (x < 1) {
      x = 1;
    }
    if (y > this.text_height) {
      y = this.text_height;
    }
    else if (y < 1) {
      y = 1;
    }
    this.overlays.cursor.text.x = x;
    this.overlays.cursor.text.y = y;
    this.refresh();
  }

  moveBy (x, y) { return this.moveTo(this.overlays.cursor.text.x + x, this.overlays.cursor.text.y + y); }

  moveBol () { return this.moveTo(1, this.overlays.cursor.text.y); }

  moveEol () { return this.moveTo(this.text_width, this.overlays.cursor.text.y); }

  moveBos () { return this.moveTo(1, 1); }

  moveEos () { return this.moveTo(this.text_width, this.text_height); }

  bs () { this.left(); this.putChar(' '); return this.left(); }

  cr () { return this.moveTo(1, this.overlays.cursor.text.y + 1); }

  lf () { return this.moveTo(this.overlays.cursor.text.x, this.overlays.cursor.text.y + 1); }

  up () { return this.moveTo(this.overlays.cursor.text.x, this.overlays.cursor.text.y - 1); }

  left () { return this.moveTo(this.overlays.cursor.text.x - 1, this.overlays.cursor.text.y); }

  down () { return this.moveTo(this.overlays.cursor.text.x, this.overlays.cursor.text.y + 1); }

  right () { return this.moveTo(this.overlays.cursor.text.x + 1, this.overlays.cursor.text.y); }

  clr () {
    _vm.mem.fill(0, this.text_buffer, this.text_buffer + this.text_size);
  }

  cel () {
    var { x, y } = this.pos();
    _vm.mem.fill(0, this.text_index(x, y), this.text_index(this.text_width, y));
  }

  ces () {
    var { x, y } = this.pos();
    _vm.mem.fill(0, this.text_index(x, y), this.text_buffer + this.text_size);
  }

  cbl () {
    var { x, y } = this.pos();
    _vm.mem.fill(0, this.text_index(x, y), this.text_index(1, y));
  }

  cbs () {
    var { x, y } = this.pos();
    _vm.mem.fill(0, this.text_index(x, y), this.text_buffer);
  }

  copy_text_row (sy, ty) {
    var si = this.text_line(sy);
    var ti = this.text_line(ty);
    _vm.mem.copy(_vm.mem, ti.start, si.start, si.length);
  }

  copy_text_col (sx, tx) {
    for (var y = 0; y < this.text_height; y++) {
      var i = this.text_line(y);
      var si = i.start + sx * 3;
      var ti = i.start + tx * 3;
      _vm.mem.copy(_vm.mem, ti, si, 3);
    }
  }

  erase_text_row (y) {
    var i = this.text_line(y);
    _vm.mem.fill(0, i.start, i.end);
  }

  erase_text_col (x) {
    for (var y = 0; y < this.text_height; y++) {
      var i = this.text_line(y).start + x * 3;
      _vm.mem.fill(0, i, i + 3);
    }
  }

  scroll_text (dy) {
    var i;
    if (dy > 0) {
      i = this.text_line(dy + 1);
      _vm.mem.copy(_vm.mem, this.text_buffer, i.start, this.text_size - i);
      i = this.text_line(dy);
      _vm.mem.fill(0, this.text_buffer - i.start, this.text_buffer + this.text_size);
    }
    else if (dy < 0) {
      i = this.text_line(dy + 1);
      _vm.mem.copy(_vm.mem, this.text_buffer, i, this.text_size - i);
      i = this.text_line(dy + 1);
      _vm.mem.fill(0, this.text_buffer - dy * this.text_width * 3, this.text_buffer + this.text_size);
    }
  }

  _spr_find (id) {
    for (var s of this._sprites) {
      if (s.id === id) {
        return s;
      }
    }
    return null;
  }

  spr_add (id, sprite, x, y, z) {
    this._sprites.push({ id, sprite, x, y, z, index: this._sprite.length });
  }

  spr_del (id) {
    var s = this._spr_find(id);
    if (s) {
      this._sprites.splice(s.index, 1);
    }
  }

  spr_move (id, x, y, z) {
    var s = this._spr_find(id);
    if (s) {
      s.x = x;
      s.y = y;
      if (z) {
        s.z = z;
      }
      this.refresh();
    }
  }

  spr_move_by (id, x, y) {
    var s = this._spr_find(id);
    if (s) {
      s.x = x;
      s.y = y;
      this.refresh();
    }
  }

  draw_sprites () {
    var sw = this.sprite_width;
    var sh = this.sprite_height;
    var sl = this.sprites;
    var ss = this.sprite_size;

    for (var s of _.sortBy(this._sprites, 'z')) {
      var ptr = sl + s.sprite * ss;
      for (var by = 0; by < sh; by++) {
        var pi = (s.y + by) * this.width + s.x;
        for (var bx = 0; bx < sw; bx++) {
          this.pixel(pi++, _vm.mem[ptr++]);
        }
      }
    }
  }

}

export default Video;
