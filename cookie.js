var Cookie = {
  set: function(name, value, daysToExpire, path) {
    var write = (encodeURIComponent(name) + '=' + encodeURIComponent(value || ''));
    if (daysToExpire !== undefined) {
      var d = new Date();
      d.setTime(d.getTime() + (86400000 * parseFloat(daysToExpire)));
      write += '; expires=' + d.toGMTString();
    }
    if (path) { write += '; path=' + path; }
    return (document.cookie = write);
  },
  get: function(name) {
    var cookie = document.cookie.match(new RegExp('(^|;)\\s*' + encodeURIComponent(name) + '=([^;\\s]*)'));
    return (cookie ? decodeURIComponent(cookie[2].replace(/\+/, ' ')) : null);
  },
  // NOTE: pass '/' as path to this if deleting a root level cookie!
  erase: function(name,path) {
    path = path || '/'
    var cookie = Cookie.get(name) || true;
    Cookie.set(name, '', -1, path);
    return cookie;
  },
  accept: function() {
    if (typeof navigator.cookieEnabled == 'boolean') {
      return navigator.cookieEnabled;
    }
    Cookie.set('_test', '1');
    return (Cookie.erase('_test') === '1');
  }
};
