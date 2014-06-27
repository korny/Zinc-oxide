var Random = (function() {
  // initialization is slow, cache this!
  var generator = new Alea(0);
  var random = {
    init: function(seed) {
      generator = new Alea(seed); // generator.setSeed(seed);
    },
    nextFraction: function() {
      return generator();
    },
    next: function(n) {
      if (n === undefined) n = 2;
      return Math.floor(this.nextFraction() * n);
    },
    nextInRange: function(min, max) {
      return min + this.nextFraction() * (max - min);
    },
    nextColor: function() {
      return 'rgb(' +
        this.next(256) + ',' +
        this.next(256) + ',' +
        this.next(256) + ')';
    },
    nextElement: function(array) {
      return array[this.next(array.length)];
    }
  };
  random.init(0);
  return random;
})();
