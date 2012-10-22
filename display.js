DS.display = {
  FPS: 30,
  
  initialize: function () {
    this.gui    = DS.gui;
    this.camera = DS.camera;
    
    this.setup();
    this.resize();
  },
  
  setup: function () {
    var display = this;
    
    this.grid      = Shapes.initCanvas('grid');
    this.selection = Shapes.initCanvas('selection');
    this.targets   = Shapes.initCanvas('targets');
    
    DrawEngine.initialize();
    
    this.displayLoop = DrawEngine.addLoop('selection', function (loop) {
      if (display.selection.needsUpdate) display.drawSelection(loop);
      if (display.grid.needsUpdate) display.drawHexagonPattern(loop);
    }, this.FPS).start();
    
    this.selectionPulseLoop = DrawEngine.addLoop('selection', function (loop) {
      display.drawSelection(loop, true);
    }, this.FPS).start();
  },
  
  resize: function (width, height) {
    var canvases = document.body.getElementsByTagName('canvas');
    for (var i = canvases.length; i--;) {
      var canvas = canvases.item(i);
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    this.needsDisplay();
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
  
  translateHexagonCoordinates: function (x, y) {
    if (x % 2) y += 0.5;
    
    return {
      x: x * this.camera.hexagon.col + this.camera.offset.x,
      y: y * this.camera.hexagon.row + this.camera.offset.y
    };
  },
  
  drawHexagonPattern: function () {
    var context = this.grid;
    if (!context.needsUpdate) return 'skipped';
    // console.log('drawHexagonPattern');
    context.clear();
    
    var sizeX   = Math.ceil(context.canvas.width  / this.camera.hexagon.col);
    var sizeY   = Math.ceil(context.canvas.height / this.camera.hexagon.row);
    var offsetX = Math.floor(this.camera.offset.x / this.camera.hexagon.col);
    var offsetY = Math.floor(this.camera.offset.y / this.camera.hexagon.row);
    
    context.strokeStyle = 'hsla(120,100%,50%,0.3)';
    context.lineCap     = this.camera.hexagon.side > 70 ? 'round' : 'butt';
    context.lineWidth   = this.camera.hexagon.side / 42;
    
    if (this.camera.zoom > 10) {
      context.save();
      context.globalAlpha = 0.3;
      if (this.camera.zoom < 15) context.globalAlpha *= (this.camera.zoom - 10) / (15 - 10);
      
      for (var x = -2; x < sizeX + 1; x++) {
        for (var y = -2; y < sizeY; y++) {
          context.beginPath();
          var drawOffset = this.translateHexagonCoordinates(x - offsetX, y - offsetY);
          context.hex(drawOffset.x, drawOffset.y, this.camera.hexagon.side);
          context.fillStyle = 'hsla(' + Math.abs(((x - offsetX) * 7319 + (y - offsetY) * 1641) % 360) + ',100%,50%,1)';
          context.fill();
        }
      }
      context.restore();
    }
    
    if (this.camera.zoom > 10) {
      context.save();
      context.globalAlpha = 1;
      if (this.camera.zoom < 15) context.globalAlpha *= (this.camera.zoom - 10) / (15 - 10);
      
      for (var x = -1; x < sizeX + 1; x++) {
        for (var y = -2; y < sizeY; y++) {
          context.beginPath();
          var drawOffset = this.translateHexagonCoordinates(x - offsetX, y - offsetY);
          context.hex(drawOffset.x, drawOffset.y, this.camera.hexagon.side, 'half');
          context.strokeStyle = 'gray';
          // context.strokeStyle = 'hsla(' + (240 - x * (120 / sizeX)) + ',100%,' + (70 - x * (30 / sizeX)) + '%,0.3)';
          context.stroke();
        }
      }
      context.restore();
    }
    
    context.needsUpdate = false;
  },
  
  drawSelection: function(loop, pulse) {
    var context = this.selection;
    if (!context.needsUpdate && !(pulse && !(this.gui.selectionFixed && context.pulse === 1.5))) return 'skipped';  // no need to draw
    if (!context.oldSelectedHexagon && !this.gui.selectedHexagon) return 'skipped';  // nothing to draw
    if (context.needsUpdate) {
      if (this.gui.selectedHexagon) {
        document.getElementById('coordinates').innerHTML = this.gui.selectedHexagon.col + '/' + this.gui.selectedHexagon.row;
        document.getElementById('info').innerHTML = 'empty space';
        document.getElementById('biginfo').innerHTML = '';
      }
      else {
        document.getElementById('info').innerHTML = '';
        document.getElementById('coordinates').innerHTML = '';
      }
      
      context.clear();
    }
    else if (context.oldSelectedHexagon) {
      // remove old hexagon
      context.save();
      var drawOffset = this.translateHexagonCoordinates(context.oldSelectedHexagon.col, context.oldSelectedHexagon.row);
      context.clearHexagon(drawOffset.x, drawOffset.y, this.camera.hexagon.side);
      context.restore();
    }
    context.oldSelectedHexagon = null;
    
    if (this.gui.selectedHexagon) {
      // draw selected hexagon
      if (this.gui.selectionFixed) context.pulse = 1.5;
      else context.pulse = 1 + Math.sin(10 * loop.timepoint()) / 2;
      
      context.lineWidth = this.camera.hexagon.side / 23;
      if (context.lineWidth < 0.7) context.lineWidth = 0.7;
      context.lineWidth *= context.pulse;
      
      context.fillStyle = 'hsla(240,100%,50%,0.2)';
      context.strokeStyle = 'hsl(240,100%,' + (30 + 20 * context.pulse) + '%)';
      context.lineCap = 'round';
      
      context.save();
      var drawOffset = this.translateHexagonCoordinates(this.gui.selectedHexagon.col, this.gui.selectedHexagon.row);
      context.drawHexagon(drawOffset.x, drawOffset.y, this.camera.hexagon.side);
      context.restore();
      
      context.oldSelectedHexagon = this.gui.selectedHexagon;
    }
    
    context.needsUpdate = false;
    return true;
  }
};
