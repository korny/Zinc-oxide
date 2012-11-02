ZnO.camera = {
  ZOOM_MIN:      10,
  ZOOM_INITIAL:  25,
  ZOOM_MAX:     200,
  
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
    }
  },
  
  initialize: function (app) {
    this.display = app.display;
    this.grid    = app.grid;
    
    this.reset();
  },
  
  reset: function () {
    this.setZoom(this.ZOOM_INITIAL);
    
    var tile = this.grid.tileMeasurementsForSize(this.zoom);
    this.offset.x = (window.innerWidth  - tile.side) / 2;
    this.offset.y = (window.innerHeight - tile.row ) / 2;
  },
  
  zoomVelocityAtCoordinates: function (velocity, x, y) {
    var zoom = this.zoom * (1 + velocity);
    
    // keep zoom in bounds
    if (zoom < this.ZOOM_MIN) zoom = this.ZOOM_MIN;
    if (zoom > this.ZOOM_MAX) zoom = this.ZOOM_MAX;
    zoomFactor = zoom / this.zoom;
    
    this.offset.x = x - (x - this.offset.x) * zoomFactor;
    this.offset.y = y - (y - this.offset.y) * zoomFactor;
    
    this.setZoom(zoom);
  },
  
  setZoom: function (zoom) {
    this.zoom = zoom;
    this.display.updateTileMeasurements(this.grid.tileMeasurementsForSize(zoom));
    this.display.needsDisplay();
  },
  
  tileAtCoordinates: function(x, y) {
    return this.grid.getTileCoordinates(this.zoom, x - this.offset.x, y - this.offset.y);
  }
};
