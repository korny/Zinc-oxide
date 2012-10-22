DS.gui = {
  stopped: false,
  
  initialize: function () {
    this.camera  = DS.camera;
    this.display = DS.display;
    
    this.setupMouseKeyboard(this.camera);
    this.setupControls();
    
    window.onresize = function () {
      DS.display.resize(window.innerWidth, window.innerHeight);
    };
  },
  
  setupMouseKeyboard: function (camera) {
    var gui = this;
    var mouseDown = false;
    
    document.body.addEventListener('mousemove', function (event) {
      if (mouseDown) {
        camera.offset.moveTo(event.clientX, event.clientY);
      }
      else {
        gui.selectionMouseMove(event);
      }
    }, false);
    
    document.body.addEventListener('mouseout', function (event) {
      gui.selectionMouseOut(event);
    }, false);
    gui.selectionMouseOut();  // FIXME: Why?
    
    document.body.addEventListener('mousedown', function (event) {
      mouseDown = true;
      camera.offset.startAt(event.clientX, event.clientY);
      gui.selectionClick(event);
    }, false);
    
    document.body.addEventListener('mouseup', function (event) {
      mouseDown = false;
      if (camera.offset.old.x !== camera.offset.x || camera.offset.old.y !== camera.offset.y) {
        gui.selectionFixed = false;
      }
    }, false);
    
    document.body.addEventListener('dblclick', function (event) {
      camera.reset();
    }, false);
    
    document.body.addEventListener(Browser.Gecko ? 'MozMousePixelScroll' : 'mousewheel', function (event) {
      gui.mousewheel(event);
    }, false);
    
    document.addEventListener('keydown', function (event) {
      gui.keyDown(event);
    }, false);
  },
  
  setupControls: function () {
    var gui = this;
    
    this.playButton = document.getElementById('play');
    if (this.playButton) {
      this.playButton.style.display = 'block';
      this.playButton.addEventListener('click', function () {
        gui.playPause();
      }, false);
    }
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
      // DS.app.benchmarkGrid();
      DS.app.drawTargets();
    }
  },
  
  mousewheel: function (event) {
    var scroll   = event.wheelDelta || -event.detail * 2,
        velocity = scroll / 2000;
    
    this.camera.zoomVelocityAtCoordinates(velocity, event.xyCoordinates());
  },
  
  selectionClick: function(event) {
    if (this.selectionFixed) {
      var clickedHexagon = this.camera.hexagonAtEventCoordinates(event);
      var selectedHexagon = this.selectedHexagon;
      if (selectedHexagon &&
          clickedHexagon.col === selectedHexagon.col &&
          clickedHexagon.row === selectedHexagon.row) {
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
    var hexagon = this.camera.hexagonAtEventCoordinates(event);
    var selectedHexagon = this.selectedHexagon;
    if (!selectedHexagon ||
        hexagon.col !== selectedHexagon.col ||
        hexagon.row !== selectedHexagon.row) {
      this.selectedHexagon = hexagon;
      this.display.selectionNeedsUpdate();
    }
  },
  
  selectionMouseOut: function(event) {
    if (this.selectionFixed) return;
    this.selectedHexagon = null;
    this.display.selectionNeedsUpdate();
  }
};
