DrawEngine = {};

(function (self) {
  var originalTitle = document.title;
  function setDocumentTitle(text) {
    document.title = originalTitle + (text ? ' — ' + text : '');
  }
  
  var loops = [];
  function updateTitle() {
    var text = '';
    for (var name in loops) {
      var loop = loops[name];
      text += name + ': ' + (loop.count - loop.skipped) + '/' + loop.count + ' fps, ';
      loop.count = 0;
      loop.skipped = 0;
    }
    text += 'Zoom: ' + Math.round(App.camera.zoom * 10) / 10;
    setDocumentTitle(text);
  }
  window.setInterval(updateTitle, 1000);
  
  self.addLoop = function (name, drawFrame) {
    var loop = {
      name:      name,
      drawFrame: drawFrame,
      maxFPS:    60,
      frame:     0,
      skipped:   0,
      count:     0,
      
      draw: function (time) {
        return loop.drawFrame(loop, time);
      },
      
      start: function () {
        var loop = this;
        
        function frame(time) {
          requestAnimationFrame(frame);
          loop.frame++;
          if (loop.draw(time) === 'skipped') loop.skipped++;
          loop.count++;
        }
        
        frame(+new Date());
        
        return this;
      },
      
      timepoint: function () {
        return this.frame / this.maxFPS;
      }
    };
    
    loops[name] = loop;
    
    return loop;
  };
})(DrawEngine);
