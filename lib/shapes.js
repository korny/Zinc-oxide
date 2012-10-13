// A simple extension to the canvas API.
Shapes = {};

Math.SQRT3 = Math.sqrt(3);

(function (self) {
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
    drawHexagon: function (x, y, size, half) {
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
      var row = size * Math.SQRT3;
      var col = size * 1.5;
      
      if (x || y) {
        this.save();
        this.translate(x, y);
      }
      this.beginPath();
      this.moveTo(0,            0);        // A
      this.lineTo(size,         0);        // -> B
      this.lineTo(col,          row / 2);  // -> C
      this.lineTo(size,         row);      // -> D
      if (!half) {
        this.lineTo(0,          row);      // -> E
        this.lineTo(size - col, row / 2);  // -> F
        this.closePath();                  // -> A
      }
      if (x || y) this.restore();
      
      this.stroke();
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
    },
    
    drawSVGPath: function(path, fillStyle, strokeStyle, lineWidth) {
      // TODO: Replace with http://code.google.com/p/canvg/ or write a compiler.
      if (fillStyle) this.fillStyle = fillStyle;
      if (strokeStyle) this.strokeStyle = strokeStyle;
      if (lineWidth) this.lineWidth = lineWidth;
      var pat = /(\s+)|\w(?:(\s*,?\s*)\d+(?:\.\d+)?)+/ig;
      this.beginPath();
      var segment;
      while (segment = pat.exec(path)) {
        segment = segment[0];
        if (RegExp.$1) continue;  // skip whitespace
        var command = segment[0];
        var params = segment.match(/\d+(?:\.\d+)?/g);
        for (var i in params) params[i] = parseFloat(params[i]);
        switch (command) {
        case 'M':
          this.moveTo.apply(this, params);
          break;
        case 'L':
          this.lineTo.apply(this, params);
          break;
        case 'C':
          this.bezierCurveTo.apply(this, params);
          break;
        case 'A':
          break;  // not implemented
          this.arcTo(params[5], params[6], params[5], params[6], params[0]);
          break;
        case 'Z':
        case 'z':
          this.closePath();
          break;
        default:
          if (console) console.error("I don't know this path command: " + command +
            '(' + params.length + ' params)');
        }
      }
      if (this.fillStyle != 'transparent') this.fill();
      if (this.strokeStyle != 'transparent') this.stroke();
    },
    
    zoom: function(factor) {
      this.scale(factor, factor);
    },
    
    resizeCanvas: function(width, height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  };
  
  for (var method in methods) {
    CanvasRenderingContext2D.prototype[method] = methods[method];
  }
  
  function getContext(canvas) {
    if (!canvas.context) {
      canvas.context = canvas.getContext('2d');
    }
    
    return canvas.context;
  }
  
  Shapes.initCanvas = function (id, width, height, fillStyle) {
    var canvas = document.getElementById(id);
    if (!canvas) return;
    
    var context = getContext(canvas);
    
    if (width && height) context.resizeCanvas(width, height);
    if (fillStyle)       context.clear(fillStyle);
    
    return context;
  };
})(Shapes);
