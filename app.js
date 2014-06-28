App = {
  initialize: function () {
    this.grid    = ZnO.hexGrid;
    this.gui     = ZnO.gui;
    this.camera  = ZnO.camera;
    this.display = ZnO.display;
    
    this.gui.initialize(this);
    this.camera.initialize(this);
    this.display.initialize(this);
    
    $('#play').show();
  },
  
  benchmarkGrid: function () {
    var milliseconds = 3000;
    var pixels       = window.innerWidth * window.innerHeight;
    
    var start = new Date();
    for (var frames = 0; new Date() - start < milliseconds && frames < milliseconds; frames++) {
      this.display.grid.needsUpdate = true;
      this.display.drawGrid(this.display.grid, this.camera.zoom, this.camera.offset);
    }
    milliseconds = new Date() - start;
    
    var fps    = frames / (milliseconds / 1000);
    var ms     = milliseconds / frames;
    var tiles  = Math.ceil(this.display.grid.canvas.width  / this.display.tile.col * this.display.grid.canvas.height  / this.display.tile.row);
    var mpix   = Math.round(fps * pixels / 100000) / 10;
    var ktiles = Math.round(fps * tiles / 100) / 10;
    
    alert(
      pixels + ' pixels\n' +
      tiles + ' tiles\n' +
      '\n' +
      fps.toPrecision(4) + ' FPS\n' +
      ms.toPrecision(3) + ' ms/frame\n' +
      '\n' +
      mpix + ' Mpixels per second\n' +
      ktiles + ' ktiles per second'
    );
  },
  
  drawTargets: function () {
    var context = $('#targets')[0].getContext('2d');
    context.clear();
    
    context.globalAlpha = 0.3;
    
    for (var x = context.canvas.width; x >= 0; x--) {
      for (var y = context.canvas.height; y >= 0; y--) {
        var coordinates = this.camera.tileAtCoordinates(x, y);
        context.fillStyle = '#' + (coordinates.col & 1 ? 'ff' : '00') + (coordinates.row & 1 ? 'ff' : '00') + '00';
        context.fillRect(x, y, 1, 1);
      }
    }
  },
  
  handleKeyPress: function (event) {
    switch (event.which) {
      case 13:
        this.benchmarkGrid();
        // this.drawTargets();
        break;
      
      default:
        // console.log('key: ', event.which);
    }
  }
};
