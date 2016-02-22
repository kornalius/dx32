import _ from 'lodash';
import Port from '../port.js';
import { defaults } from '../globals.js';
import hexy from 'hexy';

var crtUrl = require('file?name=[path]/[name].[ext]!../../imgs/crt.png');

PIXI.Point.prototype.distance = (target) => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y))
}


class BDF {

  constructor () {
    this.meta = null;
    this.glyphs = null;
  }

  load (data) {
    this.meta = {};
    this.glyphs = {};

    var fontLines = data.split("\n");
    var declarationStack = [];
    var currentChar = null;

    for (var i = 0; i < fontLines.length; i++) {
      var line = fontLines[i];
      var data = line.split(/\s+/);
      var declaration = data[0];

      switch (declaration) {
        case "STARTFONT":
          declarationStack.push(declaration);
          this.meta.version = data[1];
          break;
        case "FONT":
          this.meta.name = data[1];
          break;
        case "SIZE":
          this.meta.size = {
            points: +data[1],
            resolutionX: +data[2],
            resolutionY: +data[3]
          };
          break;
        case "FONTBOUNDINGBOX":
          this.meta.boundingBox = {
            width: +data[1],
            height: +data[2],
            x: +data[3],
            y: +data[4]
          };
          break;
        case "STARTPROPERTIES":
          declarationStack.push(declaration);
          this.meta.properties = {};
          break;
        case "FONT_DESCENT":
          this.meta.properties.fontDescent = +data[1];
          break;
        case "FONT_ASCENT":
          this.meta.properties.fontAscent = +data[1];
          break;
        case "DEFAULT_CHAR":
          this.meta.properties.defaultChar = +data[1];
          break;
        case "ENDPROPERTIES":
          declarationStack.pop();
          break;
        case "CHARS":
          this.meta.totalChars = +data[1];
          break;
        case "STARTCHAR":
          declarationStack.push(declaration);
          currentChar = {
            name: data[1],
            bytes: [],
            bitmap: []
          };
          break;
        case "ENCODING":
          currentChar.code = +data[1];
          currentChar.char = String.fromCharCode(+data[1]);
          break;
        case "SWIDTH":
          currentChar.scalableWidthX = +data[1];
          currentChar.scalableWidthY = +data[2];
          break;
        case "DWIDTH":
          currentChar.deviceWidthX = +data[1];
          currentChar.deviceWidthY = +data[2];
          break;
        case "BBX":
          currentChar.boundingBox = {
            x: +data[3],
            y: +data[4],
            width: +data[1],
            height: +data[2]
          };
          break;
        case "BITMAP":
          for (var row = 0; row < currentChar.boundingBox.height; row++, i++) {
            var byte = parseInt(fontLines[i + 1], 16);
            currentChar.bytes.push(byte);
            currentChar.bitmap[row] = [];
            for (var bit = 7; bit >= 0; bit--) {
              currentChar.bitmap[row][7 - bit] = byte & (1 << bit) ? 1 : 0;
            }
          }
          break;
        case "ENDCHAR":
          declarationStack.pop();
          this.glyphs[currentChar.code] = currentChar;
          currentChar = null;
          break;
        case "ENDFONT":
          declarationStack.pop();
          break;
      }
    }

    if (declarationStack.length) {
      throw "Couldn't correctly parse font at: " + path;
    }
  }
}


class Video extends Port {

  constructor (vm, port_number) {
    super(vm, port_number);

    this.overlays = {};

    this.info = vm.mm.alloc(80);

    this.width = 384;
    this.height = 264;
    this.scale = 3;

    this.palette_count = 32;
    this.palette_size = this.palette_count * 4;
    this.palette = vm.mm.alloc(this.palette_size);

    this.sprite_count = 16;
    this.sprite_width = 16;
    this.sprite_height = 16;
    this.sprite_size = this.sprite_width * this.sprite_height;
    this.sprites_size = this.sprite_count * this.sprite_size;
    this.sprites = vm.mm.alloc(this.sprites_size);

    this._loadFont();

    this.screen_size = this.width * this.height;
    this.screen = vm.mm.alloc(this.screen_size);

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
    _vm.dword(this.char_count);
    _vm.dword(this.char_width);
    _vm.dword(this.char_height);
    _vm.dword(this.text_width);
    _vm.dword(this.text_height);
    _vm.dword(this.font_size);
    _vm.dword(this.fonts_size);

    _vm.endSequence();

    this.forceUpdate = false;
    this.forceFlip = false;

    this._lastMouse = new PIXI.Point();

    this.offset = new PIXI.Point(16, 16);

    this.stage = new PIXI.Container();

    this.renderer = new PIXI.autoDetectRenderer(this.width * this.scale + this.offset.x * 2, this.height * this.scale + this.offset.y * 2, null, { });
    this.renderer.view.style.position = "absolute";
    this.renderer.view.style.top = "0px";
    this.renderer.view.style.left = "0px";
    this._resize();
    document.body.appendChild(this.renderer.view);
    window.addEventListener("resize", this._resize.bind(this));

    this._setupPalette();

    this._overlay('scanline', this.renderer.width, 640);

    this._overlay('screen', this.width, this.height, this.scale);
    this.overlays.screen.sprite.x = this.offset.x;
    this.overlays.screen.sprite.y = this.offset.y;

    this._overlay('cursor', this.char_width * this.scale, this.char_height * this.scale);
    this.overlays.cursor.x = 11;
    this.overlays.cursor.y = 10;
    this._makeCursor();

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

    this.overlays.scanline.sprite.y = -this.overlays.scanline.sprite.height;
    var noises = this.overlays.noises;
    var noiseKeys = _.keys(noises);

    var lastCursor = 0;
    var lastNoises = 0;
    var lastScanline = 0;

    var that = this;
    PIXI.ticker.shared.add( (time) => {
      var t = performance.now();

      if (t - lastNoises >= 150) {
        var noise = noiseKeys[Math.trunc(Math.random() * noiseKeys.length)];
        for (var k in noises) {
          noises[k].sprite.visible = false;
        }
        noises[noise].sprite.visible = true;
        lastNoises = t;
        that.forceUpdate = true;
      }

      if (t - lastScanline >= 50) {
        that.overlays.scanline.sprite.y += 16;
        if (that.overlays.scanline.sprite.y > that.renderer.height) {
          that.overlays.scanline.sprite.y = -that.overlays.scanline.sprite.height;
        }
        lastScanline = t;
        that.forceUpdate = true;
      }

      if (t - lastCursor >= 500) {
        that.overlays.cursor.sprite.visible = !that.overlays.cursor.sprite.visible;
        lastCursor = t;
        that.forceUpdate = true;
      }

      if (that.forceUpdate) {
        that.forceUpdate = false;

        that.overlays.cursor.sprite.x = (that.overlays.cursor.x - 1) * that.overlays.cursor.sprite.width + that.offset.x;
        that.overlays.cursor.sprite.y = (that.overlays.cursor.y - 1) * that.overlays.cursor.sprite.height + that.offset.y;

        if (that.forceFlip) {
          that.flip();
          that.forceFlip = false;
        }

        that.renderer.render(that.stage);
      }
    });
  }

  _overlay (name, width, height, scale = 1.0) {
    var canvas = new PIXI.CanvasBuffer(width, height);
    var tex = PIXI.Texture.fromCanvas(canvas.canvas, PIXI.SCALE_MODES.NEAREST);
    tex.scaleMode = PIXI.SCALE_MODES.NEAREST;
    var sprite = new PIXI.Sprite(tex);
    sprite.scale.x = sprite.scale.y = scale;
    this.stage.addChild(sprite);
    var context = canvas.canvas.getContext('2d', { alpha: true, antialias: false });
    var o = { context, canvas, tex, sprite, width, height, scale };
    _.set(this.overlays, name, o);
    return o;
  }

  _makeCursor (style = 'block', color = 1) {
    var cursor = this.overlays.cursor;
    var data = cursor.context.getImageData(0, 0, cursor.sprite.width, cursor.sprite.height);
    var pixels = data.data;
    var sz = cursor.sprite.width * 4;
    var c = this.paletteRGBA(color);
    if (style === 'block') {
      for (var i = 0; i < pixels.length; i += 4) {
        this.RGBAToMem(pixels, i, c);
      }
    }
    else if (style === 'underline') {
      for (var i = pixels.length - (3 * sz); i < pixels.length; i += 4) {
        this.RGBAToMem(pixels, i, c);
      }
    }
    else if (style === 'line') {
      for (var y = 0; y < cursor.sprite.height; y++) {
        var i = y * sz;
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
    grd.addColorStop(0, 'rgba(255, 255, 255, ' +  inside_alpha + ')');
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
    var sz = rgb.width * 4;
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
      this.clear();

      _vm.fill(this.screen, 10, 1000);

      this.pixel(200, 0);
      this.pixel(400, 6);
      this.pixel(500, 8);
      this.pixel(600, 20);

      this.moveTo(10, 10);
      this.putChar('A', 29, 5);

      this.moveTo(10, 11);
      this.print('Welcome to DX32\nÉgalitée!', 2, 6);

      var chars = '';
      for (var i = 33; i < 256; i++) {
        chars += String.fromCharCode(i);
      }
      this.moveTo(1, 2);
      this.print(chars, 1, 0);

      this.moveTo(1, 24);
      this.print('0123456789012345678901234567890123456789012345678901234567890123', 1, 0);

      this.refresh();
    }

  }

  reset () {
    super.reset();
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

  _resize() {
    // var ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height);
    // this.stage.scale.x = this.stage.scale.y = ratio;
    // this.renderer._resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio));
    this.renderer.view.style.left = window.innerWidth * 0.5 - this.renderer.width * 0.5 + "px";
    this.renderer.view.style.top = window.innerHeight * 0.5 - this.renderer.height * 0.5 + "px";
    this.refresh();
  }

  _setupPalette () {
    this.paletteRGBA(0,  0x00000000);
    this.paletteRGBA(1,  0xffffffff);
    this.paletteRGBA(2,  0x120723ff);
    this.paletteRGBA(3,  0x080e41ff);
    this.paletteRGBA(4,  0x12237aff);
    this.paletteRGBA(5,  0x4927a1ff);
    this.paletteRGBA(6,  0x7f65d0ff);
    this.paletteRGBA(7,  0x60c8d0ff);
    this.paletteRGBA(8,  0xaad7dfff);
    this.paletteRGBA(9,  0x331a36ff);
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
    this.char_count = 256;
    this.char_width = 6;
    this.char_height = 11;
    this.char_offset_x = 0;
    this.char_offset_y = 1;
    this.text_width = Math.round(this.width / this.char_width);
    this.text_height = Math.round(this.height / this.char_height);
    this.font_size = this.char_width * this.char_height;
    this.fonts_size = this.char_count * this.font_size;
    this.fonts = _vm.mm.alloc(this.fonts_size);

    var b = new BDF();
    var f = require('raw!../../fonts/ctrld-fixed-10r.bdf');
    b.load(f);

    var points = b.meta.size.points;
    var fontAscent = b.meta.properties.fontAscent;
    var fontDescent = b.meta.properties.fontDescent;
    var baseline = fontAscent + this.char_offset_y;

    for (var k in b.glyphs) {
      var g = b.glyphs[k];
      var bb = g.boundingBox;
      var dsc = baseline - bb.height - bb.y;
      var ptr = this.fonts + (g.code * this.font_size);

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

  refresh (flip = true) {
    this.forceUpdate = true;
    this.forceFlip = flip;
  }

  clear () {
    _vm.fill(this.screen, 0, this.screen_size);
    this.refresh();
  }

  pixelToIndex (x, y) { return y * this.width + x }

  indexToPixel (i) {
    var y = Math.trunc(i / this.width);
    var x = i - y;
    return { x, y };
  }

  splitRGBA (rgba) { return { r: rgba >> 24 & 0xFF, g: rgba >> 16 & 0xFF, b: rgba >> 8 & 0xFF, a: rgba >> 0xFF } }

  red (rgba) { return rgba >> 24 & 0xFF }

  green (rgba) { return rgba >> 16 & 0xFF }

  blue (rgba) { return rgba >> 8 & 0xFF }

  alpha (rgba) { return rgba >> 0xFF }

  RGBAToNum (r, g, b, a) { return r << 24 | g << 16 | b << 8 | a }

  paletteRGBA (c, r, g, b, a) {
    var pi = this.palette + (c * 4);
    if (r) {
      if (r && g && b) {
        this.RGBAToMem(_vm.mem, pi, r, g, b, a);
      }
      else {
        _vm.mem.writeUInt32LE(r, pi)
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
    return - 1;
  }

  RGBAToMem (mem, i, r, g, b, a) {
    if (r && !g) {
      g = r >> 16 & 0xFF;
      b = r >> 8 & 0xFF;
      a = r & 0xFF;
      r = r >> 16 & 0xFF;
    }
    mem[i]     = r;
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

  putChar (ch, fg = 1, bg = 0) {
    switch(ch.charCodeAt(0)) {
      case 13:
      case 10:
        this.cr();
        return;
      case 8:
        this.bs();
        return;
    }
    var { x, y } = this.pos();
    var px = (x - 1) * this.char_width;
    var py = (y - 1) * this.char_height;
    var ptr = this.fonts + (ch.charCodeAt(0) * this.font_size);
    for (var by = 0; by < this.char_height; by++) {
      var i = (py + by) * this.width + px;
      for (var bx = 0; bx < this.char_width; bx++) {
        this.pixel(i++, _vm.mem[ptr++] ? fg : bg);
      }
    }
    this.overlays.cursor.x++;
    if (this.overlays.cursor.x > this.text_width) {
      this.cr();
    }
    return this;
  }

  print (text, fg, bg) {
    for (var c of text) {
      this.putChar(c, fg, bg);
    }
    return this;
  }

  pos () { return { x: this.overlays.cursor.x, y: this.overlays.cursor.y } }

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
    this.overlays.cursor.x = x;
    this.overlays.cursor.y = y;
    this.refresh();
  }

  moveBy (x, y) { return this.moveTo(this.overlays.cursor.x + x, this.overlays.cursor.y + y); }

  moveBol () { return this.moveTo(1, this.overlays.cursor.y); }

  moveEol () { return this.moveTo(this.text_width, this.overlays.cursor.y); }

  moveBos () { return this.moveTo(1, 1); }

  moveBos () { return this.moveTo(this.text_width, this.text_height); }

  bs () { this.left(); this.putChar(' '); return this.left(); }

  cr () { return this.moveTo(0, this.overlays.cursor.y + 1); }

  lf () { return this.moveTo(this.overlays.cursor.x, this.overlays.cursor.y + 1); }

  up () { return this.moveTo(this.overlays.cursor.x, this.overlays.cursor.y - 1); }

  left () { return this.moveTo(this.overlays.cursor.x - 1, this.overlays.cursor.y); }

  down () { return this.moveTo(this.overlays.cursor.x, this.overlays.cursor.y + 1); }

  right () { return this.moveTo(this.overlays.cursor.x + 1, this.overlays.cursor.y); }

  scroll (x, y) {
    _vm.mem.copy(this.mem, this.screen, this.screen + y * this.width, (this.height - y) * this.width);
    this.refresh();
  }

  cl () {

  }

  cel () {

  }

  ces () {

  }

  cbl () {

  }

  cbs () {

  }
}

export default Video
