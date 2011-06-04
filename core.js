Array.prototype.remove = function(from, to) {
  var rest;
  rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

Date.prototype.toRelativeTime = function(now_threshold) {
  var conversions, delta, key, units, _i, _len;
  delta = new Date() - this;
  now_threshold = parseInt(now_threshold, 10);
  if (isNaN(now_threshold)) {
    now_threshold = 0;
  }
  if (delta <= now_threshold) {
    return 'Just now';
  }
  units = null;
  conversions = {
    millisecond: 1,
    second: 1000,
    minute: 60,
    hour: 60,
    day: 24,
    month: 30,
    year: 12
  };
  for (_i = 0, _len = conversions.length; _i < _len; _i++) {
    key = conversions[_i];
    if (delta < conversions[key]) {
      break;
    } else {
      units = key;
      delta = delta / conversions[key];
    }
  }
  delta = Math.floor(delta);
  if (delta !== 1) {
    units += "s";
  }
  return [delta, units].join(" ");
};

Date.fromString = function(str) {
  return new Date(Date.parse(str));
};

String.prototype.hashCode = function(){
  var hash = 0;
  if (this.length == 0) return hash;
  for (i = 0; i < this.length; i++) {
      char = this.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

util = {
  urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
  toStaticHTML: function(inputHtml) {
    inputHtml = inputHtml.toString();
    return inputHtml.replace(/&/g, "&amp").replace(/</g, "&lt").replace(/>/g, "&gt");
  },
  zeroPad: function(digits, n) {
    n = n.toString();
    while (n.length < digits) {
      n = '0' + n;
    }
    return n;
  },
  timeString: function(date) {
    var hours, minutes;
    minutes = date.getMinutes().toString();
    hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },
  isBlank: function(text) {
    var blank;
    blank = /^\s*$/;
    return text.match(blank) !== null;
  }
};