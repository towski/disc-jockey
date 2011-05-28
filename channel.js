(function() {
  var Channel, MESSAGE_BACKLOG, sys;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  sys = require("sys");
  MESSAGE_BACKLOG = 200;
  exports.Channel = Channel = (function() {
    function Channel(db) {
      var clearCallbacks;
      this.db = db;
      this.index = 1;
      this.messages = [];
      this.callbacks = [];
      this.files = [".gitignore"];
      clearCallbacks = __bind(function() {
        var now, _results;
        now = new Date;
        _results = [];
        while (this.callbacks.length > 0 && now - this.callbacks[0].timestamp > 30 * 1000) {
          _results.push(this.callbacks.shift().callback([]));
        }
        return _results;
      }, this);
      this.clearCallbacksInterval = setInterval(clearCallbacks, 3000);
    }
    Channel.prototype.appendMessage = function(nick, type, text, options) {
      var key, m, value, _results;
      m = {
        nick: nick,
        type: type,
        text: text,
        timestamp: (new Date).getTime(),
        id: this.index
      };
      if (options) {
        for (key in options) {
          value = options[key];
          m[key] = value;
        }
      }
      this.db.collection('messages', function(error, collection) {
        return collection.insert(m);
      });
      this.index += 1;
      switch (type) {
        case "msg":
          sys.puts("<" + nick + "> " + text);
          break;
        case "join":
          sys.puts(nick + " join");
          break;
        case "part":
          sys.puts(nick + " part");
          break;
        case "upload":
          this.files.push(text);
      }
      this.messages.push(m);
      while (this.callbacks.length > 0) {
        this.callbacks.shift().callback([m]);
      }
      _results = [];
      while (this.messages.length > MESSAGE_BACKLOG) {
        _results.push(this.messages.shift());
      }
      return _results;
    };
    Channel.prototype.query = function(since, callback) {
      var matching, message, _i, _len, _ref;
      matching = [];
      _ref = this.messages;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        message = _ref[_i];
        if (message.timestamp > since) {
          matching.push(message);
        }
      }
      if (matching.length !== 0) {
        return callback(matching);
      } else {
        return this.callbacks.push({
          timestamp: new Date,
          callback: callback
        });
      }
    };
    return Channel;
  })();
}).call(this);
