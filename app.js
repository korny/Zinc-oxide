Browser = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera:  navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
};

if (!window.console) console = { log: function () {} };

var DS = {
  offset: {
    x: 0, y: 0,
    start: { x: 0, y: 0 },
    old:   { x: 0, y: 0 },
    startAt: function(x, y) {
      this.start.x = x;
      this.start.y = y;
      this.old.x = this.x;
      this.old.y = this.y;
    },
    moveTo: function(x, y) {
      this.x = this.old.x + (x - this.start.x);
      this.y = this.old.y + (y - this.start.y);
      DS.needsDisplay();
    }
  },
  
  FPS: 30,
  
  ZOOM_MIN:       3,
  ZOOM_INITIAL:  30,
  ZOOM_MAX:     200,
  
  stopped: false,
  
  initialize: function () {
    DrawEngine.initialize();
    
    this.setupDisplay();
    this.setupMouseKeyboard();
    this.setupGUI();
    
    this.setZoom(this.ZOOM_INITIAL);
    this.offset.moveTo(
      Math.round(window.innerWidth  / 2) - this.hexagon.side / 2,
      Math.round(window.innerHeight / 2) - this.hexagon.row  / 2);
    this.resizeDisplay();
  },
  
  setZoom: function (zoom) {
    this.zoom = zoom;
    this.updateHexagonForZoom(zoom);
    this.needsDisplay();
  },
  
  setupMouseKeyboard: function () {
    var gui = this;
    var mouseDown = false;
    
    document.body.addEventListener('mousemove', function (event) {
      if (mouseDown) {
        gui.offset.moveTo(event.clientX, event.clientY);
      }
      else {
        gui.selectionMouseMove(event);
      }
    }, false);
    
    document.body.addEventListener('mouseout', function (event) {
      gui.selectionMouseOut(event);
    }, false);
    gui.selectionMouseOut();  // initialize
    
    document.body.addEventListener('mousedown', function (event) {
      mouseDown = true;
      gui.offset.startAt(event.clientX, event.clientY);
      gui.selectionClick(event);
    }, false);
    
    document.body.addEventListener('mouseup', function (event) {
      mouseDown = false;
      if (gui.offset.old.x !== gui.offset.x || gui.offset.old.y !== gui.offset.y) {
        gui.selection.selectionFixed = false;
      }
    }, false);
    
    document.body.addEventListener('dblclick', function (event) {
      gui.setZoom(gui.ZOOM_INITIAL);
      gui.offset.x = Math.round(window.innerWidth  / 2) - gui.hexagon.side / 2;
      gui.offset.y = Math.round(window.innerHeight / 2) - gui.hexagon.row  / 2;
      gui.resizeDisplay();
    }, false);
    
    document.body.addEventListener(Browser.Gecko ? 'MozMousePixelScroll' : 'mousewheel', function (event) {
      gui.mousewheel(event);
    }, false);
    
    document.addEventListener('keydown', function (event) {
      gui.keyDown(event);
    }, false);
  },
  
  setupGUI: function () {
    var gui = this;
    
    this.playButton = document.getElementById('play');
    if (this.playButton) {
      this.playButton.style.display = 'block';
      this.playButton.addEventListener('click', function () {
        gui.playPause();
      }, false);
    }
    
    window.onresize = function () {
      gui.resizeDisplay();
    };
  },
  
  playPause: function() {
    this.stopped              = !this.stopped;
    this.playButton.innerHTML = this.stopped ? 'Play' : 'Pause';
  },
  
  keyDown: function (event) {
    if (event.keyCode == 32) {
      this.playPause();
    }
    else if (event.keyCode == 13) {
      this.drawTargets();
    }
  },
  
  updateHexagonForZoom: function (size) {
    // If we assume size == 1 then:
    //            _    A_________B    _
    //           |     /(0,0)    \     |
    //           |    /           \    |  √3 / 2
    // row = √3  |  F/             \C _|
    //           |   \             /|
    //           |    \           / |
    //           |_    \_________/  |
    //                E|         |D |
    //                 |<-- 1 -->|  | = size
    //                 |<-- 1.5 --->| = col
    this.hexagon = {
      row:     size * Math.SQRT3,
      col:     size * 1.5,
      side:    size
    };
  },
  
  translateHexagonCoordinates: function (x, y) {
    if (x % 2) y += 0.5;
    
    return {
      x: x * this.hexagon.col + this.offset.x,
      y: y * this.hexagon.row + this.offset.y
    };
  },
  
  setupDisplay: function () {
    var gui = this;
    
    this.grid      = Shapes.initCanvas('grid');
    this.selection = Shapes.initCanvas('selection');
    this.targets   = Shapes.initCanvas('targets');
    
    this.displayLoop = DrawEngine.addLoop('selection', function (loop) {
      if (gui.selection.needsUpdate) gui.drawSelection(loop);
      if (gui.grid.needsUpdate) gui.drawHexagonPattern(loop);
    }, this.FPS).start();
    
    this.selectionPulseLoop = DrawEngine.addLoop('selection', function (loop) {
      gui.drawSelection(loop, true);
    }, this.FPS).start();
  },
  
  mousewheel: function (event) {
    var scroll = event.wheelDelta || -event.detail * 2;
    var cursor = this.eventCoordinates(event);
    
    var zoomFactor = (1 + scroll / 2000);
    var zoom       = this.zoom * zoomFactor;
    
    // keep zoom in bounds
    if (zoom < this.ZOOM_MIN) zoom = this.ZOOM_MIN;
    if (zoom > this.ZOOM_MAX) zoom = this.ZOOM_MAX;
    zoomFactor = zoom / this.zoom;
    
    this.offset.x = cursor.x - (cursor.x - this.offset.x) * zoomFactor;
    this.offset.y = cursor.y - (cursor.y - this.offset.y) * zoomFactor;
    
    this.setZoom(zoom);
  },
  
  eventCoordinates: function(event) {
    return {
      x: event.pageX,
      y: event.pageY
    };
  },
  
  hexagonAtEventCoordinates: function(event) {
    var pos = this.eventCoordinates(event);
    pos.x -= this.offset.x;
    pos.y -= this.offset.y;
    return this.getHexagonCoordinatesHocevar(pos.x, pos.y);
  },
  
  selectionMouseMove: function(event) {
    if (this.selection.selectionFixed) return;
    var hexagon = this.hexagonAtEventCoordinates(event);
    var selectedHexagon = this.selection.selectedHexagon;
    if (!selectedHexagon ||
        hexagon.col !== selectedHexagon.col ||
        hexagon.row !== selectedHexagon.row) {
      this.selection.selectedHexagon = hexagon;
      this.selection.needsUpdate = true;
    }
  },
  
  selectionMouseOut: function(event) {
    if (this.selection.selectionFixed) return;
    this.selection.selectedHexagon = null;
    this.selection.needsUpdate = true;
  },
  
  selectionClick: function(event) {
    if (this.selection.selectionFixed) {
      var clickedHexagon = this.hexagonAtEventCoordinates(event);
      var selectedHexagon = this.selection.selectedHexagon;
      if (selectedHexagon &&
          clickedHexagon.col === selectedHexagon.col &&
          clickedHexagon.row === selectedHexagon.row) {
        console.log('selectionClick off');
        this.selection.selectionFixed = false;
      }
      else {
        this.selection.selectionFixed = false;
        this.selectionMouseMove(event);
        this.selection.selectionFixed = true;
      }
    }
    else {
      this.selectionMouseMove(event);
      this.selection.selectionFixed = true;
    }
  },
  
  needsDisplay: function () {
    this.selection.needsUpdate = true;
    this.grid.needsUpdate      = true;
  },
  
  redrawDisplay: function() {
    this.drawHexagonPattern();
    this.selectionLoop.draw();
  },
  
  resizeDisplay: function() {
    var canvases = document.body.getElementsByTagName('canvas');
    for (var i = canvases.length; i--;) {
      var canvas = canvases.item(i);
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    this.needsDisplay();
  },
  
  getHexagonCoordinatesOld: function(col, row) {
    var hex_col = Math.floor(col / this.hexagon.col);  // column size factor
    if (hex_col & 1) row -= Math.floor(this.hexagon.row / 2);  // odd row offset
    var hex_row = Math.floor(row / this.hexagon.row);  // row size factor
    
    // rectangle to hexagon magic
    var x = col % Math.round(this.hexagon.col);   // x inside the rectangle, from left
    if (x < 0) x += Math.round(this.hexagon.col);
    var y = row % Math.round(this.hexagon.row);  // y inside the rectangle, from top
    if (y < 0) y += Math.round(this.hexagon.row);
    if (x >= this.hexagon.side) {
      x -= this.hexagon.side;
      var yfac = y / Math.SQRT3;
      if (x > yfac) {
        hex_col += 1;
        if (hex_col & 1) hex_row -= 1;
      }
      yfac = (this.hexagon.row - y) / Math.SQRT3;
      if (x >= yfac) {
        hex_col += 1;
        if ((hex_col & 1) == 0) hex_row += 1;
      }
    }
    
    return { col: hex_col, row: hex_row };
  },
  
  // Algorithm by Sam Hocevar, see http://gamedev.stackexchange.com/a/20753.
  // 
  // Here are the parameters of one hexagon. Its centre is in O, the largest width is 2a,
  // the height is 2b, and the length of the top edge is 2c.
  // 
  //          y ^
  //            |
  //      O*____|____
  //       /  b |   |\
  //      /     |   | \
  //     /      |   |  \
  // ---(-------+---+---)------>
  //     \     O|   c  / a      x
  //      \     |     /
  //       \____|____/
  //            |
  // 
  // This is the row/column layout, with the origin at the centre of the lower left hexagon.
  // 
  //  col 0
  //   | col 1
  //   |   | col 2
  //   |   |  |
  //   __  | __    __    __    __   
  //  /  \__/  \__/  \__/  \__/  \__
  //  \__/  \__/  \__/  \__/  \__/  \
  //  /  \__/  \__/  \__/  \__/  \__/
  //  \__/  \__/  \__/  \__/  \__/  \
  //  /  \__/  \__/  \__/  \__/  \__/_ _ line 2
  //  \__/  \__/  \__/  \__/  \__/  \ _ _ _ line 1
  //  / .\__/  \__/  \__/  \__/  \__/_ _ line 0
  //  \__/  \__/  \__/  \__/  \__/
  // 
  // static void GetHex(float x, float y, out int row, out int column)
  // {
  //   // Find out which major row and column we are on:
  //   row = (int)(y / b);
  //   column = (int)(x / (a + c));
  // 
  //   // Compute the offset into these row and column:
  //   float dy = y - (float)row * b;
  //   float dx = x - (float)column * (a + c);
  // 
  //   // Are we on the left of the hexagon edge, or on the right?
  //   if (((row ^ column) & 1) == 0)
  //       dy = b - dy;
  //   int right = dy * (a - c) < b * (dx - c) ? 1 : 0;
  // 
  //   // Now we have all the information we need, just fine-tune row and column.
  //   row += (column ^ row ^ right) & 1;
  //   column += right;
  // }
  getHexagonCoordinatesHocevar: function (x, y) {
    var a = this.hexagon.side;
    var b = this.hexagon.row / 2;
    var c = this.hexagon.side / 2;
    
    // In our world, the origin of the hexagon is O*.
    x -= c;
    y -= b;
    
    // Find out which major row and column we are on:
    var row    = Math.floor(y / b);
    var column = Math.floor(x / (a + c));
    
    // Compute the offset into these row and column:
    var dy = y - row * b;
    var dx = x - column * (a + c);
    
    // Are we on the left of the hexagon edge, or on the right?
    if (((row ^ column) & 1) == 0) dy = b - dy;
    var right = dy * (a - c) < b * (dx - c) ? 1 : 0;
    
    // Now we have all the information we need, just fine-tune row and column.
    row    += (column ^ row ^ right) & 1;
    column += right;
    
    return { col: column, row: Math.floor(row / 2) };
  },
    
  drawHexagonPattern: function() {
    var context = this.grid;
    if (!context.needsUpdate) return 'skipped';
    // console.log('drawHexagonPattern');
    context.clear();
    
    if (this.hexagon.side < 10) return;
    context.globalAlpha = 1;
    if (this.hexagon.side < 15) context.globalAlpha = 1 - (15 - this.hexagon.side) / (15 - 10);
    
    var sizeX   = Math.ceil(context.canvas.width  / this.hexagon.col);
    var sizeY   = Math.ceil(context.canvas.height / this.hexagon.row);
    var offsetX = Math.floor(this.offset.x        / this.hexagon.col);
    var offsetY = Math.floor(this.offset.y        / this.hexagon.row);
    
    context.strokeStyle = 'hsla(120,100%,50%,0.3)';
    context.lineCap     = this.hexagon.side > 70 ? 'round' : 'butt';
    context.lineWidth   = this.hexagon.side / 42;
    if (context.lineWidth < 0.7) context.lineWidth = 0.7;
    
    for (var x = -2; x < sizeX; x++) {
      context.strokeStyle = 'hsla(' + (240 - x * (120 / sizeX)) + ',100%,' + (70 - x * (30 / sizeX)) + '%,0.3)';
      // context.strokeStyle = 'hsla(120,100%,50%,0.3)';
      for (var y = -2; y < sizeY; y++) {
        var drawOffset = this.translateHexagonCoordinates(x - offsetX, y - offsetY);
        if (this.hexagon.side > 25) {
          context.save();
          context.globalAlpha = 0.3;
          if (this.hexagon.side < 35) context.globalAlpha *= (this.hexagon.side - 25) / 10;
          context.fillStyle = '#' + ((x - offsetX) & 1 ? 'ff' : '00') + ((y - offsetY) & 1 ? 'ff' : '00') + 'ff';
          context.drawHexagon(drawOffset.x, drawOffset.y, this.hexagon.side);
          context.strokeStyle = 'transparent';
          context.fill();
          context.restore();
        }
        context.save();
        context.drawHexagon(drawOffset.x, drawOffset.y, this.hexagon.side, 'half');
        context.restore();
      }
    }
    
    context.needsUpdate = false;
  },
  
  drawSelection: function(loop, pulse) {
    var context = this.selection;
    if (!context.needsUpdate && !(pulse && !(this.selection.selectionFixed && context.pulse === 1.5))) return 'skipped';  // no need to draw
    if (!context.oldSelectedHexagon && !context.selectedHexagon) return 'skipped';  // nothing to draw
    // console.log('drawSelection ' + (context.needsUpdate ? 'needsUpdate' : 'pulse'));
    if (context.needsUpdate) {
      if (context.selectedHexagon) {
        document.getElementById('coordinates').innerHTML = context.selectedHexagon.col + '/' + context.selectedHexagon.row;
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
      context.clearHexagon(drawOffset.x, drawOffset.y, this.hexagon.side);
      context.restore();
    }
    context.oldSelectedHexagon = null;
    
    if (context.selectedHexagon) {
      // draw selected hexagon
      if (context.selectionFixed) context.pulse = 1.5;
      else context.pulse = 1 + Math.sin(10 * loop.timepoint()) / 2;
      
      context.lineWidth = this.hexagon.side / 23;
      if (context.lineWidth < 0.7) context.lineWidth = 0.7;
      context.lineWidth *= context.pulse;
      
      context.fillStyle = 'hsla(240,100%,50%,0.1)';
      context.strokeStyle = 'hsl(240,100%,' + (30 + 20 * context.pulse) + '%)';
      context.lineCap = 'round';
      
      context.save();
      var drawOffset = this.translateHexagonCoordinates(context.selectedHexagon.col, context.selectedHexagon.row);
      context.drawHexagon(drawOffset.x, drawOffset.y, this.hexagon.side);
      context.restore();
      
      context.oldSelectedHexagon = context.selectedHexagon;
    }
    
    context.needsUpdate = false;
    return true;
  },
  
  drawTargets: function() {
    var context = this.targets;
    context.clear();
    
    context.globalAlpha = 0.3;
    
    for (var x = context.canvas.width; x >= 0; x--) {
      for (var y = context.canvas.height; y >= 0; y--) {
        var coordinates = this.getHexagonCoordinatesHocevar(x - this.offset.x, y - this.offset.y);
        context.fillStyle = '#' + (coordinates.col & 1 ? 'ff' : '00') + (coordinates.row & 1 ? 'ff' : '00') + '00';
        context.fillRect(x, y, 1, 1);
      }
    }
  }
};

jQuery(function ($) {
  DS.initialize();
});
