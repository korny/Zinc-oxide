ZnO.display = {
  FPS: 60,
  
  initialize: function (app) {
    this.gui    = app.gui;
    this.camera = app.camera;
    
    this.setup();
    this.resize();
  },
  
  setup: function () {
    var display = this;
    
    this.grid      = $('#grid')[0].getContext('2d');
    this.selection = $('#selection')[0].getContext('2d');
    
    this.tileCache = [];
    
    this.displayLoop = DrawEngine.addLoop('display', function (loop) {
      var skipped = !display.selection.needsUpdate && !display.grid.needsUpdate;
      if (display.selection.needsUpdate) display.redrawSelection(loop);
      if (display.grid.needsUpdate)      display.redrawGrid();
      return skipped && 'skipped';
    }, this.FPS).start();
    
    this.selectionPulseLoop = DrawEngine.addLoop('selection pulse', function (loop) {
      return display.drawSelection(loop, true);
    }, this.FPS).start();
  },
  
  resize: function () {
    $('canvas.fullscreen').each(function() {
      var width  = window.innerWidth;
      var height = window.innerHeight;
      var ratio  = window.devicePixelRatio || 1;
      
      this.width  = width  * ratio;
      this.height = height * ratio;
      
      if (ratio > 1) {
        this.style.width  = width  + "px";
        this.style.height = height + "px";
        this.getContext('2d').scale(ratio, ratio);
      }
    });
    
    this.needsDisplay();
    this.redraw();
  },
  
  redrawGrid: function () {
    this.drawGrid(this.grid, this.camera.zoom, this.camera.offset);
  },
  
  redrawSelection: function(loop) {
    this.drawSelection(this.selectionPulseLoop);
  },
  
  redraw: function () {
    this.redrawGrid();
    this.redrawSelection();
  },
  
  updateTileMeasurements: function (tileMeasurements) {
    this.tile = tileMeasurements;
  },
  
  selectionNeedsUpdate: function () {
    if (this.selection) this.selection.needsUpdate = true;
  },
  
  gridNeedsUpdate: function () {
    if (this.grid) this.grid.needsUpdate = true;
  },
  
  needsDisplay: function () {
    this.selectionNeedsUpdate();
    this.gridNeedsUpdate();
  },
  
  translateTileCoordinates: function (x, y) {
    if (x % 2) y += 0.5;
    
    return {
      x: x * this.tile.col + this.camera.offset.x,
      y: y * this.tile.row + this.camera.offset.y
    };
  },
  
  hueForTileAt: function (x, y) {
    return Math.abs((x * 7 + y * 19) % 5) * 60;
  },
  
  initRandomForTileAt: function (x, y) {
    Random.init(x * 100000 + y);
  },
  
  keyForTileAt: function (x, y) {
    return 'display.tiles[' + x + ',' + y + ']';
  },
  
  colorForTileAt: function (x, y) {
    var key = this.keyForTileAt(x, y) + '.color',
        kind = remember(key) || null;
    
    if (kind === null) {
      this.initRandomForTileAt(x, y);
      kind = remember(key, Random.next(3000));
    }
    else kind = +kind;
    
         if ((kind -= 100) < 0) return 'green';
    else if ((kind -= 100) < 0) return 'gold';
    else if ((kind -= 100) < 0) return 'teal';
    else if ((kind -=  30) < 0) return 'white';
    else if ((kind -=  10) < 0) return 'cyan';
    else if ((kind -=   5) < 0) return 'magenta';
    else                        return null;
  },
  
  sizeForTileAt: function (x, y) {
    var key = this.keyForTileAt(x, y) + '.size',
        size = remember(key) || null;
    
    if (size === null) {
      this.initRandomForTileAt(x, y);
      size = remember(key, Random.next(1000) % 10);
    }
    else size = +size;
    
    return size + 4;
  },
  
  moonsForTileAt: function (x, y) {
    var key = this.keyForTileAt(x, y) + '.moons[]',
        moons = null;
    
    if (moons === null) {
      this.initRandomForTileAt(x, y);
      number = Random.next(10000) % 6;
      moons = [];
      for (var i = 0; i < number; i++) {
        kind = Random.next(400);
             if ((kind -= 100) < 0) moons[i] = 'green';
        else if ((kind -= 100) < 0) moons[i] = 'gold';
        else if ((kind -= 100) < 0) moons[i] = 'teal';
        else if ((kind -=  60) < 0) moons[i] = 'white';
        else if ((kind -=  30) < 0) moons[i] = 'cyan';
        else if ((kind -=  10) < 0) moons[i] = 'magenta';
        else                        moons[i] = null;
      }
      // remember(key, JSON.stringify(moons));
    }
    else moons = JSON.parse(moons);
    
    return moons;
  },
  
  tileAt: function (x, y) {
    if (!this.tileCache[x]) this.tileCache[x] = [];
    var tile = this.tileCache[x][y];
    
    if (!tile) {
      this.tileCache[x][y] = tile = {
        color: this.colorForTileAt(x, y),
        size: this.sizeForTileAt(x, y),
        moons: this.moonsForTileAt(x, y)
      };
    }
    
    return tile;
  },
  
  drawGrid: function (context, zoom, offset) {
    if (!context.needsUpdate) return 'skipped';
    context.clear();
    
    var cols    = Math.ceil(context.canvas.width  / this.tile.col);
    var rows    = Math.ceil(context.canvas.height / this.tile.row);
    var offsetX = Math.floor(offset.x / this.tile.col);
    var offsetY = Math.floor(offset.y / this.tile.row);
    var x, y, tile, drawOffset;
    
    context.lineCap     = this.tile.side > 70 ? 'round' : 'butt';
    context.lineWidth   = this.tile.side / 42;
    
    if (zoom > 5) {
      var sn1 = new SimplexNoise(new Alea(42));
      var sn2 = new SimplexNoise(new Alea(23));
      
      context.save();
      context.globalAlpha = 1;
      if (zoom < 15) context.globalAlpha *= (zoom - 5) / 10;
      
      context.font         = zoom / 2 + 'px "Trebuchet MS"';
      context.textAlign    = 'center';
      context.textBaseline = 'middle';
      for (x = -2 - offsetX; x < cols - offsetX + 1; x++) {
        for (y = -2 - offsetY; y < rows - offsetY; y++) {
          drawOffset = this.translateTileCoordinates(x, y);
          
          context.globalAlpha = 1;
          var small = sn1.noise2D(x/6, y/6);
          var big   = sn2.noise2D(x/60, y/60);
          var gray  = Math.floor((small + big * 3 + 4) / 8 * 100);
          context.beginPath();
          context.fillStyle = 'hsla(0,0%,' + gray + '%,0.2)';
          context.hex(drawOffset.x, drawOffset.y, this.tile.side);
          context.fill();
          
          tile = this.tileAt(x, y);
          if (!tile.color) continue;
          
          context.globalAlpha = 1;
          if (zoom < 15) context.globalAlpha *= (zoom - 5) / 10;
          
          context.beginPath();
          context.drawCircle(drawOffset.x + this.tile.side / 2, drawOffset.y + this.tile.row / 2, this.tile.side / 40 * tile.size, tile.color, 'transparent');
          
          // context.beginPath();
          // context.fillStyle = tile.color;
          // context.arc(drawOffset.x + this.tile.side / 2, drawOffset.y + this.tile.row / 2, this.tile.side / 40 * tile.size, 0, Math.PI * 2);
          // context.fill();
          
          if (zoom > 15 && tile.moons.length) {
            context.globalAlpha = 1;
            if (zoom < 25) context.globalAlpha *= (zoom - 15) / 10;
            for (var moon = tile.moons.length; --moon;) {
              context.drawCircle(drawOffset.x + this.tile.side * 0.9, drawOffset.y + this.tile.row * (0.3 + 0.1 * moon), this.tile.side / 40, tile.moons[moon], 'transparent');
            }
            // context.fillStyle = 'white';
            // context.fillText(tile.moons.length, drawOffset.x + this.tile.side * 0.7 + this.tile.side / 40 * tile.size, drawOffset.y + this.tile.row / 2);
          }
        }
      }
      
      context.restore();
    }
    
    if (zoom >= 10) {
      // context.strokeStyle = 'hsla(120,100%,50%,0.5)';
      context.strokeStyle = '#444';
      // context.save();
      context.globalAlpha = 1;
      if (zoom < 15) context.globalAlpha *= (zoom - 10) / 5;
      
      for (x = -1 - offsetX; x < cols - offsetX + 1; x++) {
        context.beginPath();
        // rainbow blue -> green
        // var hueX = (x + offsetX) / cols;
        // context.strokeStyle = 'hsla(' + (240 - 120 * hueX) + ',100%,' + (70 - 30 * hueX) + '%,0.3)';
        for (y = -2 - offsetY; y < rows - offsetY; y++) {
          drawOffset = this.translateTileCoordinates(x, y);
          context.hex(drawOffset.x, drawOffset.y, this.tile.side, 'half');
        }
        context.stroke();
      }
      context.restore();
    }
    
    context.needsUpdate = false;
  },
  
  drawSelection: function (loop, pulse) {
    var context = this.selection;
    var drawOffset;
    // context.needsUpdate = false;
    // return 'skipped';
    
    if (!context.needsUpdate && !(pulse && !(this.gui.selectionFixed && context.pulse === 1.5))) return 'skipped';  // no need to draw
    if (!context.oldSelectedTile && !this.gui.selectedTile) return 'skipped';  // nothing to draw
    if (context.needsUpdate) {
      if (this.gui.selectedTile) {
        $('#coordinates').html(this.gui.selectedTile.col + '/' + this.gui.selectedTile.row);
        $('#info').html('empty space');
        $('#biginfo').html('');
      }
      else {
        $('#info').html('');
        $('#coordinates').html('');
      }
      
      context.clear();
    }
    else if (context.oldSelectedTile) {
      // remove old selection
      context.save();
      drawOffset = this.translateTileCoordinates(context.oldSelectedTile.col, context.oldSelectedTile.row);
      context.clearHexagon(drawOffset.x, drawOffset.y, this.tile.side);
      context.restore();
    }
    context.oldSelectedTile = null;
    
    if (this.gui.selectedTile) {
      // draw selected title
      if (this.gui.selectionFixed) context.pulse = 1.5;
      else context.pulse = 1 + Math.sin(10 * loop.timepoint()) / 2;
      
      context.lineWidth = this.tile.side / 23;
      if (context.lineWidth < 0.7) context.lineWidth = 0.7;
      context.lineWidth *= context.pulse;
      
      context.fillStyle = 'hsla(240,100%,50%,0.0)';
      context.strokeStyle = 'hsl(240,100%,' + (30 + 20 * context.pulse) + '%)';
      context.lineCap = 'round';
      
      context.save();
      drawOffset = this.translateTileCoordinates(this.gui.selectedTile.col, this.gui.selectedTile.row);
      context.drawHexagon(drawOffset.x, drawOffset.y, this.tile.side);
      context.restore();
      
      context.oldSelectedTile = this.gui.selectedTile;
    }
    
    context.needsUpdate = false;
    return true;
  }
};
