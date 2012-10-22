Browser = {
  IE: !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  Opera:  navigator.userAgent.indexOf('Opera') > -1,
  WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
    navigator.userAgent.indexOf('KHTML') === -1,
  MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
};

if (!window.console) console = { log: function () {} };

Event.prototype.xyCoordinates = function () {
  return {
    x: event.pageX,
    y: event.pageY
  };
};
