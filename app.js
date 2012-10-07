Browser = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera:  navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
};

if (!window.console) console = { log: function () {} };

var DS = {
  WIDTH: window.innerWidth,
  HEIGHT: window.innerHeight,
  offset: {
    x: 0, y: 0,
    start: {}, old: {},
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
  HEXAGON_SIZE: 20,  // length of a hexagon edge
  
  REDRAW_DELAY: 50,  // in milliseconds
  FRAMES_PER_TICK: 40,  // smaller values for more parallel subticks
  FPS: 30,
  
  MIN_HEXAGON_SIZE: 3,
  MAX_HEXAGON_SIZE: 200,
  stopped: false,
  
  initialize: function (name) {
    DrawEngine.initialize();
    
    this.setupBackgroundCanvas();
    this.setupFireCanvas();
    this.setupUnitsCanvas();
    this.setupGridCanvas();
    this.setupSelectionCanvas();
    // this.setupOSDCanvas();
    
    this.setupMouseKeyboard();
    this.setupImageCanvas();
    
    this.setupHexagon();
    
    this.deluxe = true;
    this.offset.x = Math.round(this.WIDTH / 2) - this.col_width / 3;
    this.offset.y = Math.round(this.HEIGHT / 2) - this.row_height / 2;
    
    this.initMap();
    
    this.loadBattleLog(name);
    
    this.startDrawLoops();
    this.setupDisplay();
    this.setupBattleMap();
  },
  
  setupBackgroundCanvas: function() {
    this.background = Shapes.initCanvas('background', this.WIDTH, this.HEIGHT, 'black');
  },
  
  setupFireCanvas: function() {
    this.fire = Shapes.initCanvas('fire', this.WIDTH, this.HEIGHT, 'transparent');
  },
  
  setupGridCanvas: function() {
    this.grid = Shapes.initCanvas('grid', this.WIDTH, this.HEIGHT, 'transparent');
  },
  
  setupUnitsCanvas: function() {
    this.units = Shapes.initCanvas('units', this.WIDTH, this.HEIGHT, 'transparent');
  },
  
  setupSelectionCanvas: function() {
    this.selection = Shapes.initCanvas('selection', this.WIDTH, this.HEIGHT);
  },
  
  setupOSDCanvas: function() {
    this.osd = Shapes.initCanvas('osd', this.WIDTH, this.HEIGHT);
  },
  
  setupMouseKeyboard: function() {
    var gui = this;
    document.body.addEventListener('mousemove', function (event) {
      if (gui.mouseDown) {
        gui.offset.moveTo(event.clientX, event.clientY);
        gui.redrawDisplay();
      }
      else {
        gui.selectionMouseMove(event);
      }
    }, false);
    document.body.addEventListener('mouseout', function (event) {
      gui.selectionMouseOut(event);
    }, false);
    gui.selectionMouseOut();  // initialize
    
    gui.mouseDown = false;
    document.body.addEventListener('mousedown', function (event) {
      gui.mouseDown = true;
      gui.offset.startAt(event.clientX, event.clientY);
      gui.selectionClick(event);
    }, false);
    document.body.addEventListener('mouseup', function (event) {
      gui.mouseDown = false;
      if (gui.offset.old.x !== gui.offset.x || gui.offset.old.y !== gui.offset.y) {
        gui.selection.selectionFixed = false;
      }
    }, false);
    
    document.body.addEventListener('dblclick', function (event) {
      gui.offset.x = gui.offset.y = 0;
      gui.redrawDisplay();
    }, false);
    
    document.body.addEventListener(Browser.Gecko ? 'MozMousePixelScroll' : 'mousewheel', function (event) { gui.mousewheel(event); }, false);
    
    document.addEventListener('keydown', function (event) { gui.keyDown(event); }, false);
  },
  
  setupImageCanvas: function() {
    this.imageCanvas = Shapes.initCanvas(null, this.WIDTH, this.HEIGHT);
  },
  
  setupHexagon: function() {
    this.PERFECT_HEXAGON = Math.sqrt(3) / 2;
    this.row_height = this.HEXAGON_SIZE * Math.sqrt(3);  // configure this!
    this.col_width = Math.round(this.row_height * this.PERFECT_HEXAGON);
    this.w = Math.ceil(this.col_width * 2 / 3);
    this.fac = (this.row_height / 2) / (this.col_width - this.w);
  },
  
  initMap: function () {
    var selection = this.selection;
    
    this.map = {
      units: { length: 0 },
      map: {},
      coords: [],
      unitsCanvas: this.units,
      fireCanvas: this.fire,
      animate: false,
      attacks: [],
      epic2evil: function(epicX, epicY) {
        var evilX = epicX - epicY;
        var evilY = Math.floor(-(epicX + epicY) / 2);
        return { x: evilX, y: evilY };
      },
      evil2epic: function(evilX, evilY) {
        var epicX = -evilY + Math.floor(evilX / 2);
        var epicY = -evilY + Math.floor(-evilX / 2);
        return { x: epicX, y: epicY };
      },
      coord: function(x, y) {
        var row = this.coords[x];
        if (!row) row = this.coords[x] = [];
        var coord = row[y];
        if (!coord) coord = row[y] = x + '/' + y;
        return coord;
      },
      addUnit: function(unit) {
        this.units[unit.id] = unit;
        this.units.length++;
      },
      destroyUnit: function(unitID) {
        var unit = this.units[unitID];
        if (unit) {
          delete this.units[unitID];
          this.units.length--;
          this.setUnitAt(unit.position.x, unit.position.y, null);
          this.attacks.push({
            type: 'explosion',
            position: unit.position,
            might: unit.type.hull
          });
          if (unit.id == this.selectedUnitID) {
            selection.selectedHexagon = { col: unit.position.x, row: unit.position.y };
            selection.selectionFixed = null;
            selection.needsUpdate = true;
          }
        }
      },
      setUnitAt: function(x, y, unitID) {
        var unit = unitID ? this.units[unitID] : null;
        if (unit && unit.position) {
          this.map[this.coord(unit.position.x, unit.position.y)] = null;
          if (this.animate) this.unitsCanvas.clearHexagon(unit.position.x, unit.position.y, 'fine');
        }
        this.map[this.coord(x, y)] = unit;
        if (unit) {
          if (this.animate) this.unitsCanvas.drawUnitAt(x, y, true);
          if (unit.id == this.selectedUnitID && selection.selectionFixed) {
            selection.selectedHexagon = { col: x, row: y };
            selection.needsUpdate = true;
          }
          unit.position = { x: x, y: y };
        }
        else {
          if (this.animate) this.unitsCanvas.clearHexagon(x, y, 'fine');
        }
      },
      setUnitAtEpicCoordinates: function(epicX, epicY, unitID) {
        var evilPos = this.epic2evil(epicX, epicY);
        this.setUnitAt(evilPos.x, evilPos.y, unitID);
      },
      unitAt: function(x, y) {
        return this.map[this.coord(x, y)];
      },
      colorForTeam: function(team) {
        return (team == 'one') ? 'red' : 'blue';
      },
      highlightUnit: function(unitID, color) {
        var unit = this.units[unitID];
        if (unit) {
          switch (color) {  // convert color name to hue value
          case 'red': color = '0'; break;
          case 'orange': color = '30'; break;
          case 'yellow': color = '60'; break;
          case 'green': color = '120'; break;
          case 'cyan': color = '180'; break;
          case 'blue': color = '240'; break;
          case 'magenta': color = '300'; break;
          default: if (console) console.error('invalid color: ' + color); break;
          }
          unit.highlight = color;
          this.unitsCanvas.drawUnitAt(unit.position.x, unit.position.y);
        }
      },
      setInfo: function(unitID, message) {
        var unit = this.units[unitID];
        if (unit) {
          unit.info = message;
        }
      },
      appendInfo: function(unitID, message) {
        var unit = this.units[unitID];
        if (unit) {
          if (!unit.info)
            unit.info = message;
          else if (unit.info instanceof Array)
            unit.info.push(message);
          else if (typeof unit.info === 'string')
            unit.info += message;
          else
            if (console) console.error('cannot append to ' + unit.info);
        }
      },
      addTargetMarker: function(unitID, targetID) {
        this.addAttack(unitID, targetID, 'target');
      },
      addAttack: function(unitID, targetID, damage, impacts) {
        var source = this.units[unitID];
        var target = this.units[targetID];
        this.attacks.push({
          type: 'laser',
          source: { x: source.position.x, y: source.position.y,
            teamColor: this.colorForTeam(source.team) },
          target: { x: target.position.x, y: target.position.y,
            teamColor: this.colorForTeam(target.team) },
          damage: damage,
          impacts: impacts
        });
        if (target && impacts) {
          for (var i in impacts) {
            var impact = impacts[i];
            if (impact.type === 'impact') {
              target.damage += impact.damage;
              this.unitsCanvas.clearHexagon(target.position.x, target.position.y, 'fine');
              this.unitsCanvas.drawUnitAt(target.position.x, target.position.y);
            }
          }
        }
        if (this.animate) this.fireCanvas.needsUpdate = true;
      },
      clearAttacks: function() {
        this.attacks = [];
        if (this.animate) this.fireCanvas.needsUpdate = true;
      }
    };
  },
  
  subtick: function(action) {
    if (!action) return false;
    switch (action.type) {
    case 'spawn':
      action.data.team = action.team;
      this.map.addUnit(action.data);
      break;
    case 'move':
      this.map.setUnitAtEpicCoordinates(action.position.x, action.position.y, action.unit);
      break;
    case 'attack':
      this.map.addAttack(action.unit, action.target, action.damage, action.partials);
      break;
    case 'target':
      this.map.addTargetMarker(action.unit, action.target);
      break;
    case 'destroyed':
      var unit = this.map.destroyUnit(action.unit);
      break;
    case 'highlight':
      this.map.highlightUnit(action.unit, action.color);
      break;
    case 'pause':
      return false;
      break;
    case 'info':
      if (action.mode == 'set')
        this.map.setInfo(action.unit, action.message);
      else if (action.mode == 'append')
        this.map.appendInfo(action.unit, action.message);
      else
        if (console) console.error('Invalid info mode: ' + action.mode);
      break;
    case 'log':
      if (console) console.log('[EPIC] ' + action.message);
      break;
    default:
      if (console) console.error('Unknown action: ' + action.type);
      return false;
    }
    // if (console) console.log(action.type);
    return true;
  },
  
  nextSubticks: function() {
    var actions = this.battleLog.ticks[this.battleLog.index];
    if (!actions) {
      window.clearInterval(this.playPause.subtickInterval);
      return;
    }
    for (var i = this.PARALLEL_SUBTICKS; i--;) {
      var action = actions[this.subtickIndex++];
      if (action) {
        if (!this.subtick(action)) {
          this.stopped = false;
          this.playPause();
          break;
        }
      }
      else {  // tick finished
        window.clearInterval(this.playPause.subtickInterval);
        if (this.battleLog.ticks[++this.battleLog.index]) {  // next tick
          this.subtickIndex = 0;
          that = this;
          this.playPause.subtickInterval = window.setInterval(function () { that.nextSubticks(); }, this.REDRAW_DELAY);
        }
        else {
          this.playButton.style.display = 'none';
        }
        break;
      }
    }
  },
  
  setupBattleMap: function() {
    this.subtickIndex = 0;
    var actions = this.battleLog.ticks[this.battleLog.index++];
    for (var i in actions) this.subtick(actions[i]);
    this.PARALLEL_SUBTICKS = Math.ceil(this.map.units.length / this.FRAMES_PER_TICK);
    this.playButton = document.getElementById('play');
    this.map.animate = true;
    if (this.playButton) {
      this.playButton.style.display = 'block';
      this.playButton.addEventListener('click', function() {
        this.playPause();
      }, false);
    }
    this.playPause();
    this.drawUnits();
  },
  
  loadBattleLog: function(name) {
    this.battleLog = {
      ticks: null,
      index: 0
    };
    if (console) console.log('Loading battle log ' + name + '...');
    this.battleLog.ticks = logs[name];
  },
  
  setupDisplay: function() {
    var that = this;
    this.initHexagonPattern();
    this.drawHexagonPattern();
    this.drawOSD();
    
    // viewport resized
    window.onresize = function() {
      that.resizeDisplay();
    };
  },
  
  startDrawLoops: function () {
    var gui = this;
    
    this.selectionLoop = DrawEngine.addLoop('selection', function (loop) { gui.drawSelection(loop); }, this.FPS).start();
    this.fireLoop      = DrawEngine.addLoop('fire',      function (loop) { gui.drawFire(loop); },      this.FPS).start();
    this.unitsLoop     = DrawEngine.addLoop('units',     function (loop) { gui.drawUnits(loop); },     this.FPS).start();
  },
  
  playPause: function() {
    if (this.stopped) {
      this.stopped = false;
      if (console) console.log('Play!');
      this.playButton.innerHTML = 'Pause';
      var that = this;
      this.playPause.subtickInterval = window.setInterval(function () { that.nextSubticks(); }, this.REDRAW_DELAY);
    }
    else {
      this.stopped = true;
      window.clearInterval(this.playPause.subtickInterval);
      if (console) {
        if (this.battleLog.ticks[this.battleLog.index])
          console.log('Stopped at tick ' + this.battleLog.index + '.');
        else
          console.log('Finished after ' + this.battleLog.index + ' ticks.');
      }
      this.playButton.innerHTML = 'Play';
    }
  },
  
  keyDown: function (event) {
    if (event.keyCode == 32) {
      this.playPause();
    }
  },
  
  mousewheel: function (event) {
    var zoomFactor = (1 + (event.wheelDelta || -event.detail) * 0.0005);
    var newHexagonSize = this.HEXAGON_SIZE * zoomFactor;
    if (newHexagonSize < this.MIN_HEXAGON_SIZE) newHexagonSize = this.MIN_HEXAGON_SIZE;
    else if (newHexagonSize > this.MAX_HEXAGON_SIZE) newHexagonSize = this.MAX_HEXAGON_SIZE;
    zoomFactor = newHexagonSize / this.HEXAGON_SIZE;
    this.HEXAGON_SIZE = newHexagonSize;
    var cursor = this.eventCoordinates(event);
    var offset = this.offset;
    offset.x = cursor.x - (cursor.x - offset.x) * zoomFactor;
    offset.y = cursor.y - (cursor.y - offset.y) * zoomFactor;
    this.setupHexagon();
    this.initHexagonPattern();
    this.redrawDisplay();
  },
  
  eventCoordinates: function(event) {
    return {
      x: event.offsetX || event.layerX,
      y: event.offsetY || event.layerY
    };
  },
  
  hexagonAtEventCoordinates: function(event) {
    var pos = this.eventCoordinates(event);
    pos.x -= this.offset.x;
    pos.y -= this.offset.y;
    return this.getHexagonCoordinates(pos.x, pos.y);
  },
  
  selectionMouseMove: function(event) {
    if (this.selection.selectionFixed) return;
    var hexagon = this.hexagonAtEventCoordinates(event);
    var selectedHexagon = this.selection.selectedHexagon;
    if (!selectedHexagon ||
        hexagon.col !== selectedHexagon.col ||
        hexagon.row !== selectedHexagon.row) {
      this.selection.selectedHexagon = hexagon;
      this.selection.needsUpdate = true;
    }
  },
  
  selectionMouseOut: function(event) {
    if (this.selection.selectionFixed) return;
    this.selection.selectedHexagon = null;
    this.selection.needsUpdate = true;
  },
  
  selectionClick: function(event) {
    if (this.selection.selectionFixed) {
      var clickedHexagon = this.hexagonAtEventCoordinates(event);
      var selectedHexagon = this.selection.selectedHexagon;
      if (selectedHexagon &&
          clickedHexagon.col === selectedHexagon.col &&
          clickedHexagon.row === selectedHexagon.row) {
        this.selection.selectionFixed = false;
        return;
      }
      this.selection.selectionFixed = false;
      this.selectionMouseMove(event);
      this.selection.selectionFixed = true;
    }
    else {
      this.selectionMouseMove(event);
      this.selection.selectionFixed = true;
    }
  },
  
  redrawDisplay: function() {
    this.drawHexagonPattern();
    this.drawUnits();
    this.drawOSD();
    this.selection.clear();
    this.fire.clear();
    this.selection.needsUpdate = true;
    this.selectionLoop.draw();
  },
  
  resizeDisplay: function() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    var canvases = document.body.getElementsByTagName('canvas');
    for (var i = canvases.length; i--;) {
      var canvas = canvases.item(i);
      canvas.width = this.WIDTH;
      canvas.height = this.HEIGHT;
    }
    this.redrawDisplay();
  },
  
  getHexagonCoordinates: function(col, row) {
    var hex_col = Math.floor(col / this.col_width);  // column size factor
    if (hex_col & 1) row -= Math.floor(this.row_height / 2);  // odd row offset
    var hex_row = Math.floor(row / this.row_height);  // row size factor
    
    // rectangle to hexagon magic
    var x = col % this.col_width;   // x inside the rectangle, from left
    if (x < 0) x += this.col_width;
    var y = row % this.row_height;  // y inside the rectangle, from top
    if (y < 0) y += this.row_height;
    if (x >= this.w) {
      x -= this.w;
      var yfac = y / this.fac;
      if (x > yfac) {
        hex_col += 1;
        if (hex_col & 1) hex_row -= 1;
      }
      yfac = (this.row_height - y) / this.fac;
      if (x >= yfac) {
        hex_col += 1;
        if ((hex_col & 1) == 0) hex_row += 1;
      }
    }
    
    return { col: hex_col, row: hex_row };
  },
    
  initHexagonPattern: function() {
    var hexSize = this.HEXAGON_SIZE;
    var colSize = hexSize * 1.5;
    var rowSize = hexSize * Math.sqrt(3);
    var halfRowSize = rowSize / 2;
    
    var gui = this;
    
    this.grid.drawHexagon =
      function drawHexagon(x, y, full) {
        this.save();
        if (x % 2)
          this.translate(x * colSize + gui.offset.x, y * rowSize + gui.offset.y + halfRowSize);
        else
          this.translate(x * colSize + gui.offset.x, y * rowSize + gui.offset.y);
        this.beginPath();
        this.moveTo(0, 0);
        this.lineTo(hexSize, 0);
        this.lineTo(colSize, halfRowSize);
        this.lineTo(hexSize, rowSize);
        if (full) {
          this.lineTo(0, rowSize);
          this.lineTo(hexSize - colSize, halfRowSize);
          this.closePath();
        }
        this.stroke();
        if (full) this.fill();
        this.restore();
      };
    this.selection.drawHexagon = this.grid.drawHexagon;
    this.units.drawHexagon = function drawHexagon(size) {
      var hexSize = size;
      var colSize = hexSize * 1.5;
      var rowSize = hexSize * Math.sqrt(3);
      var halfRowSize = rowSize / 2;
      this.beginPath();
      this.moveTo(0, 0);
      this.lineTo(hexSize, 0);
      this.lineTo(colSize, halfRowSize);
      this.lineTo(hexSize, rowSize);
      this.lineTo(0, rowSize);
      this.lineTo(hexSize - colSize, halfRowSize);
      this.closePath();
      this.stroke();
      this.fill();
    };
    
    var sqrt3 = Math.sqrt(3);
    this.selection.clearHexagon =
      function(x, y, fine) {
        this.save();
        this.translate(x * colSize + gui.offset.x, y * rowSize + gui.offset.y);
        if (x % 2) this.translate(0, halfRowSize);
        var l = gui.HEXAGON_SIZE / 42;
        if (l < 1) l = 1;
        if (fine || true) {
          this.beginPath();
          this.moveTo(-l, -sqrt3*l);
          this.lineTo(hexSize + l, -sqrt3*l);
          this.lineTo(colSize + 2*l, halfRowSize);
          this.lineTo(hexSize + l, rowSize + sqrt3*l);
          this.lineTo(-l, rowSize + sqrt3*l);
          this.lineTo(hexSize - colSize - 2*l, halfRowSize);
          this.closePath();
          this.clip();
        }
        this.clearRect(
          -hexSize / 2 - 2*l, -sqrt3*l,
          hexSize * 2 + 4*l, rowSize + 2*sqrt3*l);
        this.restore();
      };
    this.units.clearHexagon = this.selection.clearHexagon;
    this.grid.clearHexagon = this.selection.clearHexagon;
    
    this.fire.drawLaser = function(attack) {
      var source = attack.source;
      var target = attack.target;
      this.beginPath();
      this.save();
        this.translate(source.x * colSize + gui.offset.x, source.y * rowSize + gui.offset.y);
        if (source.x % 2) this.translate(0, halfRowSize);
        this.moveTo(colSize / 3, halfRowSize);
      this.restore();
      this.save();
        this.translate(target.x * colSize + gui.offset.x, target.y * rowSize + gui.offset.y);
        if (target.x % 2) this.translate(0, halfRowSize);
        this.lineTo(colSize / 3, halfRowSize);
      this.restore();
      if (attack.damage == 'target') {
        this.save();
          this.lineCap = 'butt';
          this.strokeStyle = 'white';
          this.lineWidth = gui.HEXAGON_SIZE / 42;
          this.stroke();
        this.restore();
        this.save();
          this.translate(target.x * colSize + gui.offset.x + colSize / 3, target.y * rowSize + gui.offset.y + halfRowSize);
          if (target.x % 2) this.translate(0, halfRowSize);
          this.drawCircle(0, 0, gui.HEXAGON_SIZE * 0.8, 'black', source.teamColor, gui.HEXAGON_SIZE / 42);
          this.globalAlpha = 0.5;
          this.drawCircle(0, 0, gui.HEXAGON_SIZE * 0.7, 'black', source.teamColor, gui.HEXAGON_SIZE / 42);
          this.globalAlpha = 1.0;
          this.drawLine(-gui.HEXAGON_SIZE * 0.8, 0, gui.HEXAGON_SIZE * 0.2, 0, source.teamColor);
          this.drawLine(gui.HEXAGON_SIZE * 0.8, 0, -gui.HEXAGON_SIZE * 0.2, 0, source.teamColor);
          this.drawLine(0, -gui.HEXAGON_SIZE * 0.8, 0, gui.HEXAGON_SIZE * 0.2, source.teamColor);
          this.drawLine(0, gui.HEXAGON_SIZE * 0.8, 0, -gui.HEXAGON_SIZE * 0.2, source.teamColor);
        this.restore();
      }
      else {
        this.strokeStyle = source.teamColor;
        var might = attack.damage;
        if (might > 30) might = 30;
        this.lineCap = 'round';
        this.lineWidth = might * (gui.HEXAGON_SIZE / 120);
        this.stroke();
      }
      for (var i in attack.impacts) {
        var impact = attack.impacts[i];
        if (impact.type === 'shield_impact') {
          this.save();
            this.translate(target.x * colSize + gui.offset.x, target.y * rowSize + gui.offset.y);
            if (target.x % 2) this.translate(0, halfRowSize);
            var size = gui.HEXAGON_SIZE * gui.PERFECT_HEXAGON * 0.9;
            this.strokeStyle = 'hsla(180,60%,30%,0.5)';
            this.fillStyle = 'hsla(180,60%,10%,1)';
            this.lineWidth = gui.HEXAGON_SIZE / 40;
            this.drawCircle(colSize / 3, halfRowSize, size);
          this.restore();
        }
      }
    };
    
    this.fire.drawExplosion = function(explosion) {
      var position = explosion.position;
      this.save();
        this.translate(position.x * colSize + gui.offset.x, position.y * rowSize + gui.offset.y);
        if (position.x % 2) this.translate(0, halfRowSize);
        var size = gui.HEXAGON_SIZE * (Math.sqrt(explosion.might / 70));
        this.strokeStyle = 'hsla(20,100%,50%,0.8)';
        this.fillStyle = 'hsla(20,100%,50%,0.5)';
        this.lineWidth = gui.HEXAGON_SIZE / 10;
        this.drawCircle(colSize / 3, halfRowSize, size);
      this.restore();
    };
    
    this.units.drawUnitAt = function(x, y, drawEmptyField) {
      var unit = gui.map.unitAt(x, y);
      if (!unit) return;
      this.save();
      this.translate(x * colSize + gui.offset.x, y * rowSize + gui.offset.y);
      if (x % 2) this.translate(0, halfRowSize);
      this.drawUnit(unit);
      this.restore();
    };
    this.units.drawUnit = function(unit) {
      if (!unit) return;
      var l = gui.HEXAGON_SIZE / 10;
      var color = gui.map.colorForTeam(unit.team);
      if (unit.highlight) {
        var highlightColor = 'hsla(' + unit.highlight + ',100%,50%,';
        this.save();
        if (gui.HEXAGON_SIZE > 40) {
          var gradient = this.createRadialGradient(
            colSize / 3 * 0.9, halfRowSize * 0.9, 0,
            colSize / 3 * 0.9, halfRowSize * 0.9, gui.HEXAGON_SIZE);
          var attenuation = Math.min(0.2, (gui.HEXAGON_SIZE - 40) / 300);
          gradient.addColorStop(0.0, highlightColor + (0.3 + attenuation) + ')');
          gradient.addColorStop(0.6, highlightColor + (0.3) + ')');
          gradient.addColorStop(0.8, highlightColor + (0.3 - attenuation) + ')');
          gradient.addColorStop(1.0, highlightColor + (0.3 - attenuation * 2.9) + ')');
          this.fillStyle = gradient;
          this.lineWidth = gui.HEXAGON_SIZE / 84;
          this.strokeStyle = highlightColor + (attenuation * 2) + ')';
        }
        else {
          this.fillStyle = highlightColor + '0.3)';
        }
        this.translate(colSize / 3 * 0.1, halfRowSize * 0.1);
        this.drawHexagon(gui.HEXAGON_SIZE * 0.9);
        this.restore();
      }
      this.save();
      this.translate(colSize / 3, halfRowSize);
      switch (unit.type.name) {
      case 'Fighter L':
        if (gui.HEXAGON_SIZE < 20 || !unit.team) {
          this.drawCircle(0, 0, 2*l, color, 'transparent');
        }
        else {
          this.save();
            this.rotate(-gui.unitsLoop.timepoint());
            var image = document.getElementById('fighter-l-' + unit.team);
            var width = gui.HEXAGON_SIZE * 0.7;
            var height = image.height * (width / image.width);
            this.drawImage(image, -(width/2), -(height/2), width, height);
          this.restore();
        }
        break;
      case 'Fighter H':
        this.drawCircle(0, 0, 2*l, color, 'transparent');
        this.drawCircle(0, 0, 3*l, 'transparent', color, l/2);
        break;
      case 'Frigate L':
        this.drawCircle(0, 0, 6*l, 'transparent', color, l/2);
        this.rotate(Math.PI / 4);
        this.drawSquare(-4*l, -4*l, 8*l, color, 'transparent');
        break;
      case 'Mothership':
        l = 4 * l;
        this.drawSquare(-l, -l, l+l, color, 'transparent');
        this.rotate(Math.PI / 4);
        this.drawSquare(-l, -l, l+l, color, 'transparent');
        break;
      default:
        this.drawTextCentered(unit.type.name.substring(0, 2), 0, 0, color, 'transparent', 0, gui.HEXAGON_SIZE + 'px bold Verdana, Arial, sans-serif');
        break;
      }
      this.restore();
      if (gui.HEXAGON_SIZE > 15) {
        var lp = unit.type.hull - unit.damage;
        var text, size;
        if (lp <= 0) {
          text = 'DEAD';
          size = l;
          color = 'red';
        }
        else {
          if (gui.HEXAGON_SIZE < 20) this.globalAlpha = (gui.HEXAGON_SIZE - 15) / 5;
          this.fillStyle = 'hsla(' + (120 * (1 - unit.damage / unit.type.hull)) + ',100%,50%,0.5)';
          this.fillRect(l, rowSize - 2*l, gui.HEXAGON_SIZE - 2*l, l);
          text = (unit.type.hull - unit.damage) + '/' + unit.type.hull;
          size = l;
        }
        if (gui.HEXAGON_SIZE > 40) {
          this.save();
          if (gui.HEXAGON_SIZE < 50) this.globalAlpha = (gui.HEXAGON_SIZE - 40) / 10;
          this.drawText(unit.type.name, colSize / 3, l, color, 'transparent',
            0, (1.5 * size) + 'px monospace', 'center', 'top');
          this.drawText(text, colSize / 3, rowSize - 1.5*l, 'lime', 'transparent',
            0, (2 * size) + 'px monospace', 'center', 'middle');
          this.restore();
        }
      }
    };
  },
  
  drawHexagonPattern: function() {
    var context = this.grid;
    context.clear();
    
    var hexSize = this.HEXAGON_SIZE;
    if (hexSize < 10) return;
    context.globalAlpha = 1;
    if (hexSize < 15) context.globalAlpha = 1 - (15 - hexSize) / (15 - 10);
    var colSize = hexSize * 1.5;
    var rowSize = 2 * hexSize * Math.sin(Math.PI / 3);
    
    // grid
    var sizeX = Math.ceil(context.canvas.width / colSize);
    var sizeY = Math.ceil(context.canvas.height / rowSize);
    var offsetX = Math.floor(this.offset.x / colSize);
    var offsetY = Math.floor(this.offset.y / rowSize);
    context.save();
    context.strokeStyle = 'hsla(120,100%,50%,0.3)';
    context.lineCap = hexSize > 70 ? 'round' : 'butt';
    context.lineWidth = this.HEXAGON_SIZE / 42;
    if (context.lineWidth < 0.7) context.lineWidth = 0.7;
    for (var x = -2; x < sizeX; x++) {
      context.strokeStyle = 'hsla(' + (240 - x * (120 / sizeX)) + ',100%,' + (70 - x * (30 / sizeX)) + '%,0.3)';
      // context.strokeStyle = 'hsla(120,100%,50%,0.3)';
      for (var y = -2; y < sizeY; y++) {
        context.drawHexagon(x - offsetX, y - offsetY);
      }
    }
    context.restore();
  },
  
  drawUnits: function() {
    var context = this.units;
    context.clear();
    
    var hexSize = this.HEXAGON_SIZE;
    var colSize = hexSize * 1.5;
    var rowSize = 2 * hexSize * Math.sin(Math.PI / 3);
    
    // grid
    var sizeX = Math.ceil(context.canvas.width / colSize);
    var sizeY = Math.ceil(context.canvas.height / rowSize);
    var offsetX = Math.floor(this.offset.x / colSize);
    var offsetY = Math.floor(this.offset.y / rowSize);
    for (var x = -2; x < sizeX; x++) {
      for (var y = -2; y < sizeY; y++) {
        context.drawUnitAt(x - offsetX, y - offsetY);
      }
    }
  },
  
  drawSelection: function(loop) {
    if (!this.selection) return null;
    var context = this.selection;
    if (!context.needsUpdate) return 'skipped';
    if (!context.oldSelectedHexagon && !context.selectedHexagon) return 'skipped';
    
    // remove old hexagon
    var oldSelectedHexagon = context.oldSelectedHexagon;
    if (oldSelectedHexagon) {
      context.clearHexagon(oldSelectedHexagon.col, oldSelectedHexagon.row);
      context.oldSelectedHexagon = null;
    }
    
    // draw selected hexagon
    var selectedHexagon = context.selectedHexagon;
    if (selectedHexagon) {
      var pulse = 1;
      if (this.deluxe) pulse += Math.sin(Math.PI * 3 * (loop.timepoint())) / 2;
      if (context.selectionFixed) pulse = 1.5;
      context.lineWidth = this.HEXAGON_SIZE / 23;
      if (context.lineWidth < 0.7) context.lineWidth = 0.7;
      context.lineWidth *= pulse;
      context.fillStyle = 'hsla(240,100%,50%,0.1)';
      context.strokeStyle = 'hsl(240,100%,' + (30 + 20 * pulse) + '%)';
      context.lineCap = 'round';
      context.drawHexagon(selectedHexagon.col, selectedHexagon.row, true);
      context.oldSelectedHexagon = selectedHexagon;
      var epicPos = this.map.evil2epic(selectedHexagon.col, selectedHexagon.row);
      if (context.needsUpdate) {
        document.getElementById('coordinates').innerHTML =
          'EVIL: ' + selectedHexagon.col + '/' + selectedHexagon.row + ' • ' +
          'EPIC: ' + epicPos.x + '/' + epicPos.y;
        var unit = this.map.unitAt(selectedHexagon.col, selectedHexagon.row);
        if (unit) {
          this.map.selectedUnitID = unit.id;
          document.getElementById('info').innerHTML =
            unit.type.name + ' of ' + unit.team +
            ' (' + (unit.type.hull - unit.damage) + '/' + unit.type.hull + ')';
          if (unit.info) {
            document.getElementById('biginfo').innerHTML =
              (typeof unit.info === 'string') ? unit.info : JSON.stringify(unit.info);
          }
          else
            document.getElementById('biginfo').innerHTML = '';
        }
        else {
          this.map.selectedUnitID = null;
          context.selectionFixed = false;
          document.getElementById('info').innerHTML = 'empty space';
          document.getElementById('biginfo').innerHTML = '';
        }
      }
    }
    else {
      this.map.selectedUnitID = null;
      document.getElementById('info').innerHTML = '';
      document.getElementById('coordinates').innerHTML = '';
    }
    
    if (!this.deluxe) context.needsUpdate = false;
    return true;
  },
  
  drawFire: function() {
    if (!this.fire) return null;
    var context = this.fire;
    if (!context.needsUpdate) return 'skipped';
    
    if (Browser.MobileSafari) {
      context.clear();
    }
    else {
      context.fillStyle = 'hsla(0,0%,0%,0.1)';
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }
    
    var attacks = this.map.attacks;
    if (attacks.length) {
      for (var i in attacks) {
        var attack = attacks[i];
        switch (attack.type) {
        case 'laser':
          context.drawLaser(attack);
          break;
        case 'explosion':
          context.drawExplosion(attack);
          break;
        default:
          if (console) console.error('Unkown attack type: ' + attack.type);
        }
      }
      this.map.clearAttacks();
    }
    if (typeof context.needsUpdate == 'number') {
      context.needsUpdate--;
    }
    else {
      context.needsUpdate = 60;
    }
    return true;
  },
  
  drawOSD: function() {
    if (!this.osd) return;
    var context = this.osd;
    context.clear();
    
    if (!context.drawPanels) {
      
      // generic panel
      var titleHeight = 15;
      context.drawPanel = function(title, x, y, w, h) {
        if (h < titleHeight) return;
        this.save();
        this.globalAlpha = 0.7;
        this.fillRect(x, y, w, titleHeight);
        this.globalAlpha = 0.5;
        this.fillRect(x, y, w, h);
        this.globalAlpha = 1;
        this.strokeStyle = 'white';
        this.strokeRect(x+0.5, y+0.5, w, titleHeight);
        this.strokeRect(x+0.5, y+0.5, w, h);
        if (this.fillText) {
          this.font = titleHeight * 0.8 + 'px monospace';
          this.fillStyle = 'black';
          this.fillText(title, x + w/2 - this.measureText(title).width/2, y + titleHeight * 0.8);
        }
        this.restore();
      };
      
      context.drawPanels = function() {
        this.save();
        this.fillStyle = 'white';
        this.drawPanel('Demo / Hexgrid', 5, 5, this.canvas.width - 11, 55);
        this.fillStyle = '#4f4';
        this.drawPanel('Sidebar', 5, 65, 145, this.canvas.height - 70);
        this.fillStyle = '#ff8';
        this.drawPanel('Incoming...', this.canvas.width - 381, 65, 225, 120);
        this.fillStyle = '#8ff';
        this.drawPanel('Tools', this.canvas.width - 151, 65, 145, 285);
        this.fillStyle = '#f8f';
        this.drawPanel('Tactics', this.canvas.width - 151, 355, 145, this.canvas.height - 455);
        this.fillStyle = '#88f';
        this.drawPanel('Status report', 155, this.canvas.height - 95, this.canvas.width - 161, 90);
        this.restore();
      };
      
    }
    
    context.drawPanels();
  }
};