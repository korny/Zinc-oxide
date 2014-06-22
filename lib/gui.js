ZnO.gui = {
  stopped: true,
  
  initialize: function (app) {
    this.app     = app;
    this.camera  = app.camera;
    this.display = app.display;
    
    this.setupMouseKeyboard(this.camera);
    this.selectionMouseOut();  // FIXME: Why?
    this.setupControls();
    
    var gui = this;
    window.onresize = function () {
      gui.display.resize();
      gui.display.needsDisplay();
      gui.display.redraw();
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
        camera.offset.moveTo(event.pageX, event.pageY);
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
      camera.offset.startAt(event.pageX, event.pageY);
      gui.selectionClick(event);
    });
    
    $(document).on('mouseup touchend', function () {
      mouseDown = false;
      if (camera.offset.old.x !== camera.offset.x || camera.offset.old.y !== camera.offset.y) {
        gui.selectionFixed = false;
      }
    });
    
    $(document).on($.browser.mozilla ? 'MozMousePixelScroll' : 'mousewheel', function (event) {
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
      case 32:
        this.playPause();
        break;
        
      case 'C'.charCodeAt(0):
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
  
  selectionClick: function(event) {
    if (this.selectionFixed) {
      var clickedTile = this.camera.tileAtCoordinates(event.pageX, event.pageY);
      var selectedTile = this.selectedTile;
      if (selectedTile &&
          clickedTile.col === selectedTile.col &&
          clickedTile.row === selectedTile.row) {
        this.selectionFixed = false;
      }
      else {
        this.selectionFixed = false;
        this.selectionMouseMove(event);
        this.selectionFixed = true;
      }
    }
    else {
      this.selectionMouseMove(event);
      this.selectionFixed = true;
    }
  },
  
  selectionMouseMove: function(event) {
    if (this.selectionFixed) return;
    var tile = this.camera.tileAtCoordinates(event.pageX, event.pageY);
    var selectedTile = this.selectedTile;
    if (!selectedTile ||
        tile.col !== selectedTile.col ||
        tile.row !== selectedTile.row) {
      this.selectedTile = tile;
      this.display.selectionNeedsUpdate();
    }
  },
  
  selectionMouseOut: function(event) {
    if (this.selectionFixed) return;
    this.selectedTile = null;
    this.display.selectionNeedsUpdate();
  }
};
