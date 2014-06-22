// Geometrical forms extensions to the canvas API.
(function () {
  Math.SQRT3 = Math.sqrt(3);
  
  if (!CanvasRenderingContext2D) return;
  
  var methods = {
    clear: function(fillStyle) {
      if (fillStyle) {
        this.save();
          this.fillStyle = fillStyle;
          this.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.restore();
      }
      else {
        this.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },
    
    drawLine: function(x, y, w, h, strokeStyle, lineWidth, lineCap) {
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth) this.lineWidth = lineWidth;
      if (lineCap) this.lineCap = lineCap;
      this.beginPath();
      this.moveTo(x, y);
      this.lineTo(x + w, y + h);
      if (this.strokeStyle != 'transparent') this.stroke();
    },
    
    drawRect: function(x, y, w, h, fillStyle, strokeStyle, lineWidth) {
      if (fillStyle) this.fillStyle = fillStyle;
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth) this.lineWidth = lineWidth;
      this.fillRect(x, y, w, h);
      if (this.strokeStyle != 'transparent') this.strokeRect(x, y, w, h);
    },
    
    drawSquare: function(x, y, w, fillStyle, strokeStyle, lineWidth) {
      this.drawRect(x, y, w, w, fillStyle, strokeStyle, lineWidth);
    },
    
    drawCircle: function(x, y, radius, fillStyle, strokeStyle, lineWidth, startAngle, endAngle, anticlockwise) {
      if (anticlockwise === undefined) anticlockwise = true;
      if (startAngle === undefined) startAngle = 0;
      if (endAngle === undefined) endAngle = Math.PI * 2;
      if (fillStyle)   this.fillStyle = fillStyle;
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth)   this.lineWidth = lineWidth;
      this.beginPath();
      this.arc(x, y, radius, startAngle, endAngle, anticlockwise);
      if (this.fillStyle   != 'transparent') this.fill();
      if (this.strokeStyle != 'transparent') this.stroke();
    },
    
    // Draw a perfect hexagon where the inner angles are 120°.
    // "size" is the length of each side.
    // set "half" to draw only the sides A-D (for grids).
    drawHexagon: function (x, y, size, half, fillStyle, strokeStyle, lineWidth) {
      if (fillStyle)   this.fillStyle = fillStyle;
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth)   this.lineWidth = lineWidth;
      this.beginPath();
      this.hex(x, y, size, half);
      if (this.fillStyle   != 'transparent') this.fill();
      if (this.strokeStyle != 'transparent') this.stroke();
    },
    
    // Path a perfect hexagon where the inner angles are 120°.
    // "size" is the length of each side.
    // set "half" to draw only the sides A-D (for grids).
    hex: function (x, y, size, half) {
      // If we assume size == 1 then:
      //            _    A_________B    _
      //           |     /(x,y)    \     |
      //           |    /           \    |  √3 / 2
      // row = √3  |  F/             \C _|
      //           |   \             /|
      //           |    \           / |
      //           |_    \_________/  |
      //                E|         |D |
      //                 |<-- 1 -->|  | = size
      //                 |<-- 1.5 --->| = col
      var h = size * Math.SQRT3;
      
      this.moveTo(x,                y);          // A
      this.lineTo(x + size,         y);          // -> B
      this.lineTo(x + size * 1.5,   y + h / 2);  // -> C
      this.lineTo(x + size,         y + h);      // -> D
      if (!half) {
        this.lineTo(x,              y + h);      // -> E
        this.lineTo(x - size * 0.5, y + h / 2);  // -> F
        this.lineTo(x,              y);          // -> A
      }
    },
    
    clearHexagon: function (x, y, size, rough) {
      var row = size * Math.SQRT3;
      var col = size * 1.5;
      var l = size / 42;
      if (l < 1) l = 1;
      
      if (x || y) {
        this.save();
        this.translate(x, y);
      }
      if (!rough) {
        this.beginPath();
        this.moveTo(-l,                   -Math.SQRT3 * l);
        this.lineTo(size + l,             -Math.SQRT3 * l);
        this.lineTo(col  + 2 * l,         row / 2);
        this.lineTo(size + l,             row + Math.SQRT3 * l);
        this.lineTo(-l,                   row + Math.SQRT3 * l);
        this.lineTo(size - (col + 2 * l), row / 2);
        this.clip();
      }
      this.clearRect(
        -size / 2 - 2*l,           -Math.SQRT3 * l,
         size * 2 + 4*l,  row + 2 * Math.SQRT3 * l);
      if (x || y) this.restore();
    },
    
    drawTextCentered: function(text, x, y, fillStyle, strokeStyle, lineWidth, font) {
      // x -= this.measureText(text).width / 2;
      this.drawText(text, x, y, fillStyle, strokeStyle, lineWidth, font, 'center', 'middle');
    },
    
    drawText: function(text, x, y, fillStyle, strokeStyle, lineWidth, font, textAlign, textBaseline) {
      if (fillStyle) this.fillStyle = fillStyle;
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth) this.lineWidth = lineWidth;
      if (font) this.font = font;
      if (textAlign) this.textAlign = textAlign;
      if (textBaseline) this.textBaseline = textBaseline;
      this.fillText(text, x, y);
      if (this.strokeStyle != 'transparent') this.strokeText(text, x, y);
    }
  };
  
  for (var method in methods) {
    CanvasRenderingContext2D.prototype[method] = methods[method];
  }
})();
