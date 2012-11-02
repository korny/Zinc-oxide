ZnO.display = {
  FPS: 60,
  
  initialize: function (app) {
    this.gui    = app.gui;
    this.camera = app.camera;
    
    this.setup();
    this.resize();
    this.needsDisplay();
  },
  
  setup: function () {
    var display = this;
    
    this.grid      = $('#grid')[0].getContext('2d');
    this.selection = $('#selection')[0].getContext('2d');
    this.targets   = $('#targets')[0].getContext('2d');
    
    this.displayLoop = DrawEngine.addLoop('display', function (loop) {
      var skipped = !display.selection.needsUpdate && !display.grid.needsUpdate;
      if (display.selection.needsUpdate) display.drawSelection(loop);
      if (display.grid.needsUpdate)      display.drawGrid(loop);
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
  
  drawGrid: function () {
    var context = this.grid;
    if (!context.needsUpdate) return 'skipped';
    context.clear();
    
    var sizeX   = Math.ceil(context.canvas.width  / this.tile.col);
    var sizeY   = Math.ceil(context.canvas.height / this.tile.row);
    var offsetX = Math.floor(this.camera.offset.x / this.tile.col);
    var offsetY = Math.floor(this.camera.offset.y / this.tile.row);
    
    context.strokeStyle = 'hsla(120,100%,50%,0.5)';
    context.lineCap     = this.tile.side > 70 ? 'round' : 'butt';
    context.lineWidth   = this.tile.side / 42;
    
    if (this.camera.zoom > 20) {
      context.save();
      context.globalAlpha = 1;
      if (this.camera.zoom < 25) context.globalAlpha *= (this.camera.zoom - 20) / 5;
      
      context.font         = this.camera.zoom / 2 + 'px "Trebuchet MS"';
      context.textAlign    = 'center';
      context.textBaseline = 'middle';
      for (var x = -2; x < sizeX + 1; x++) {
        for (var y = -2; y < sizeY; y++) {
          var hue = Math.abs(((x - offsetX) * 7319 + (y - offsetY) * 1641) % 360);
          context.beginPath();
          var drawOffset = this.translateTileCoordinates(x - offsetX, y - offsetY);
          // context.globalAlpha = 0.4;
          context.fillStyle = 'hsla(' + hue + ',100%,50%,0.4)';
          context.hex(drawOffset.x, drawOffset.y, this.tile.side);
          context.fill();
          // context.globalAlpha = 1;
          context.fillStyle = 'hsl(' + hue + ',100%,50%)';
          context.fillText(hue, drawOffset.x + this.tile.side / 2, drawOffset.y + this.tile.row / 2);
        }
      }
      
      context.restore();
    }
    
    if (this.camera.zoom >= 10) {
      context.save();
      context.globalAlpha = 1;
      if (this.camera.zoom < 15) context.globalAlpha *= (this.camera.zoom - 10) / 5;
      
      context.strokeStyle = 'gray';
      context.beginPath();
      for (var x = -1; x < sizeX + 1; x++) {
        for (var y = -2; y < sizeY; y++) {
          var drawOffset = this.translateTileCoordinates(x - offsetX, y - offsetY);
          context.hex(drawOffset.x, drawOffset.y, this.tile.side, 'half');
          // rainbow blue -> green
          // context.strokeStyle = 'hsla(' + (240 - x * (120 / sizeX)) + ',100%,' + (70 - x * (30 / sizeX)) + '%,0.3)';
        }
      }
      context.stroke();
      context.restore();
    }
    
    context.needsUpdate = false;
  },
  
  drawSelection: function (loop, pulse) {
    var context = this.selection;
    context.needsUpdate = false;
    return 'skipped';
    
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
      var drawOffset = this.translateTileCoordinates(context.oldSelectedTile.col, context.oldSelectedTile.row);
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
      
      context.fillStyle = 'hsla(240,100%,50%,0.2)';
      context.strokeStyle = 'hsl(240,100%,' + (30 + 20 * context.pulse) + '%)';
      context.lineCap = 'round';
      
      context.save();
      var drawOffset = this.translateTileCoordinates(this.gui.selectedTile.col, this.gui.selectedTile.row);
      context.drawHexagon(drawOffset.x, drawOffset.y, this.tile.side);
      context.restore();
      
      context.oldSelectedTile = this.gui.selectedTile;
    }
    
    context.needsUpdate = false;
    return true;
  }
};
