ZnO.camera = {
  ZOOM_MIN:      10,
  ZOOM_INITIAL:  30,
  ZOOM_MAX:     200,
  
  offset: {
    x: 0, y: 0
  },
  
  pan: {
    start: { x: 0, y: 0 },
    old:   { x: 0, y: 0 }
  },
  
  initialize: function (app) {
    this.display = app.display;
    this.grid    = app.grid;
    
    this.reset();
  },
  
  reset: function () {
    this.setZoom(+remember('camera.zoom') || this.ZOOM_INITIAL);
    
    var tile = this.grid.tileMeasurementsForSize(this.zoom);
    this.setOffset(+remember('camera.offset.x') || (window.innerWidth  - tile.side) / 2,
                   +remember('camera.offset.y') || (window.innerHeight - tile.row ) / 2);
  },
  
  zoomVelocityAtCoordinates: function (velocity, x, y) {
    var zoom = this.zoom * (1 + velocity);
    
    // keep zoom in bounds
    if (zoom < this.ZOOM_MIN) zoom = this.ZOOM_MIN;
    if (zoom > this.ZOOM_MAX) zoom = this.ZOOM_MAX;
    zoomFactor = zoom / this.zoom;
    
    this.setOffset(x - (x - this.offset.x) * zoomFactor,
                   y - (y - this.offset.y) * zoomFactor);
    
    this.setZoom(zoom);
  },
  
  setZoom: function (zoom) {
    this.zoom = remember('camera.zoom', zoom);
    
    this.display.updateTileMeasurements(this.grid.tileMeasurementsForSize(zoom));
    this.display.needsDisplay();
  },
  
  setOffset: function (x, y) {
    this.offset.x = remember('camera.offset.x', x);
    this.offset.y = remember('camera.offset.y', y);
    
    this.display.needsDisplay();
  },
  
  panStartAt: function(x, y) {
    this.pan.start.x = x;
    this.pan.start.y = y;
    this.pan.old.x = this.offset.x;
    this.pan.old.y = this.offset.y;
  },
  
  panMoveTo: function(x, y) {
    this.setOffset(this.pan.old.x + (x - this.pan.start.x),
                   this.pan.old.y + (y - this.pan.start.y));
  },
  
  tileAtCoordinates: function(x, y) {
    return this.grid.getTileCoordinates(this.zoom, x - this.offset.x, y - this.offset.y);
  }
};
