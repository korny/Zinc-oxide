DS.app = {
  initialize: function () {
    this.grid    = DS.grid;
    this.gui     = DS.gui;
    this.camera  = DS.camera;
    this.display = DS.display;
    
    this.gui.initialize();
    this.camera.initialize();
    this.display.initialize();
  },
  
  benchmarkGrid: function () {
    var start = new Date();
    for (var fps = 0; new Date() - start < 1000 && fps < 300; fps++) {
      this.grid.needsUpdate = true;
      this.display.drawHexagonPattern();
    }
    this.gui.playButton.innerHTML = fps;
  },
  
  drawTargets: function () {
    var context = this.display.targets;
    context.clear();
    
    context.globalAlpha = 0.3;
    
    for (var x = context.canvas.width; x >= 0; x--) {
      for (var y = context.canvas.height; y >= 0; y--) {
        var coordinates = DS.grid.getHexagonCoordinatesHocevar(this.camera.hexagon.side, x - this.camera.offset.x, y - this.camera.offset.y);
        context.fillStyle = '#' + (coordinates.col & 1 ? 'ff' : '00') + (coordinates.row & 1 ? 'ff' : '00') + '00';
        context.fillRect(x, y, 1, 1);
      }
    }
  }
};
