DS.camera = {
  ZOOM_MIN:      15,
  ZOOM_INITIAL:  30,
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
      DS.display.needsDisplay();
    }
  },
  
  initialize: function () {
    this.display = DS.display;
    this.grid    = DS.grid;
    
    this.reset();
  },
  
  reset: function () {
    this.setZoom(this.ZOOM_INITIAL);
    this.offset.x = Math.round(window.innerWidth  / 2) - this.hexagon.side / 2;
    this.offset.y = Math.round(window.innerHeight / 2) - this.hexagon.row  / 2;
    this.display.resize(window.innerWidth, window.innerHeight);
  },
  
  zoomVelocityAtCoordinates: function (velocity, coordinates) {
    var zoom = this.zoom * (1 + velocity);
    
    // keep zoom in bounds
    if (zoom < this.ZOOM_MIN) zoom = this.ZOOM_MIN;
    if (zoom > this.ZOOM_MAX) zoom = this.ZOOM_MAX;
    zoomFactor = zoom / this.zoom;
    
    this.offset.x = coordinates.x - (coordinates.x - this.offset.x) * zoomFactor;
    this.offset.y = coordinates.y - (coordinates.y - this.offset.y) * zoomFactor;
    
    this.setZoom(zoom);
  },
  
  setZoom: function (zoom) {
    this.zoom = zoom;
    this.updateHexagonForZoom(zoom);
    this.display.needsDisplay();
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
  
  hexagonAtEventCoordinates: function(event) {
    var pos = event.xyCoordinates();
    pos.x -= this.offset.x;
    pos.y -= this.offset.y;
    return this.grid.getHexagonCoordinatesHocevar(this.zoom, pos.x, pos.y);
  }
};
