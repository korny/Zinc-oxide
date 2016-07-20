ZnO.gui = {
  stopped: true,
  
  initialize: function (app) {
    this.app     = app;
    this.camera  = app.camera;
    this.display = app.display;
    
    this.setupMouseKeyboard(this.camera);
    this.setupControls();
    
    this.setSelectedTile(JSON.parse(remember('gui.selectedTile')));
    this.setSelectionFixed(JSON.parse(remember('gui.selectionFixed')) || false);
    this.selectionMouseOut();
    
    var gui = this;
    
    window.onresize = function () {
      gui.windowResized();
    };
  },
  
  setupMouseKeyboard: function (camera) {
    var gui = this;
    var mouseDown = false;
    
    $(document).on('mousemove touchmove touchleave', function (event) {
      if (event.originalEvent.touches) {
        event.preventDefault();
        event = event.originalEvent.touches[0];
      }
      if (mouseDown) {
        camera.panMoveTo(event.pageX, event.pageY);
        gui.display.needsDisplay();
      }
      else {
        gui.selectionMouseMove(event);
      }
    });
    
    $(document).on('mouseout touchcancel', function (event) {
      gui.selectionMouseOut(event);
    });
    
    $(document).on('mousedown touchstart', function (event) {
      if (event.originalEvent.touches) {
        // event.preventDefault();
        event = event.originalEvent.touches[0];
      }
      mouseDown = true;
      camera.panStartAt(event.pageX, event.pageY);
      gui.selectionClick(event);
    });
    
    $(document).on('mouseup touchend', function () {
      mouseDown = false;
      if (camera.pan.old.x !== camera.offset.x || camera.pan.old.y !== camera.offset.y) {
        gui.selectionFixed = false;
      }
    });
    
    $(document).on('MozMousePixelScroll mousewheel', function (event) {
      gui.mousewheel(event.originalEvent);
      return false;
    });
    
    $(document).on('keydown', function (event) {
      gui.keyDown(event);
    });
  },
  
  setupControls: function () {
    var gui = this;
    
    $('#play').on('click', function () {
      gui.playPause();
      return false;
    });
  },
  
  playPause: function() {
    this.stopped = !this.stopped;
    $('#play').html(this.stopped ? 'Play' : 'Pause');
  },
  
  keyDown: function (event) {
    switch (event.which) {
      case 32:  // space
        this.playPause();
        break;
      
      case 'C'.charCodeAt(0):
        this.camera.forget();
        this.camera.reset();
        break;
      
      default:
        this.app.handleKeyPress(event);
    }
  },
  
  mousewheel: function (event) {
    var scroll   = event.wheelDelta || -event.detail * 2,
        velocity = scroll / 2000;
    
    this.camera.zoomVelocityAtCoordinates(velocity, event.pageX, event.pageY);
  },
  
  selectionClick: function (event) {
    // console.log('selectionClick');
    this.clickedOnTile(this.tileAtMouseEvent(event));
  },
  
  selectionMouseMove: function (event) {
    // console.log('selectionMouseMove');
    if (!this.selectionFixed) {
      this.selectTile(this.tileAtMouseEvent(event));
    }
  },
  
  selectionMouseOut: function (event) {
    // console.log('selectionMouseOut');
    if (!this.selectionFixed) {
      this.setSelectedTile(null);
    }
  },
  
  tileAtMouseEvent: function (event) {
    return this.camera.tileAtCoordinates(event.pageX, event.pageY);
  },
  
  clickedOnTile: function (tile) {
    // console.log('clickedOnTile');
    this.setSelectionFixed(!(this.selectionFixed && this.sameTiles(tile, this.selectedTile)));
    this.selectTile(tile);
  },
  
  selectTile: function (tile) {
    // console.log('selectTile');
    if (this.sameTiles(tile, this.selectedTile)) return;
    
    this.setSelectedTile(tile);
  },
  
  windowResized: function () {
    this.display.resize();
  },
  
  setSelectedTile: function (tile) {
    // console.log('setSelectedTile:', tile);
    this.selectedTile = tile;
    
    remember('gui.selectedTile', JSON.stringify(tile));
    
    this.display.selectionNeedsUpdate();
  },
  
  setSelectionFixed: function (value) {
    // console.log('setSelectionFixed:', value);
    this.selectionFixed = value;
    
    remember('gui.selectionFixed', JSON.stringify(value));
    
    this.display.selectionNeedsUpdate();
  },
  
  sameTiles: function (tile1, tile2) {
    if (!tile1 || !tile2) return false;
    
    return tile1.col === tile2.col &&
           tile1.row === tile2.row;
  }
};
