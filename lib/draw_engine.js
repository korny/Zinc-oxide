DrawEngine = {};

(function (self) {
  var originalTitle = document.title;
  function setDocumentTitle(text) {
    document.title = originalTitle + (text ? ' — ' + text : '');
  };
  
  var loops = [];
  self.initialize = function () {
    function updateTitle() {
      var text = '';
      for (var name in loops) {
        var loop = loops[name];
        text += name + ': ' + (loop.count - loop.skipped) + '/' + loop.count + ' fps ';
        loop.count = 0;
        loop.skipped = 0;
      }
      setDocumentTitle(text);
    };
    
    setInterval(updateTitle, 1000);
  };
  
  self.addLoop = function (name, drawFrame, maxFPS) {
    var loop = {
      name:      name,
      drawFrame: drawFrame,
      maxFPS:    maxFPS || 30,
      frame:     0,
      skipped:   0,
      count:     0,
      
      draw: function () {
        return loop.drawFrame(loop);
      },
      
      start: function () {
        var loop = this;
        setInterval(function () {
          loop.frame++;
          if (loop.draw() === 'skipped') loop.skipped++;
          loop.count++;
        }, 1000 / maxFPS);
        
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
