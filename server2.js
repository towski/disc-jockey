(function() {
  var Channel, HOST, MESSAGE_BACKLOG, PORT, SESSION_TIMEOUT, channel, createSession, formidable, fs, http, mem, path, qs, sessions, starttime, sys, url;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  HOST = null;
  PORT = 9752;
  starttime = (new Date).getTime;
  /*
  var mem = process.memoryUsage()
  every 10 seconds poll for the memory.
  setInterval(function () {
    mem = process.memoryUsage()
  }, 10*1000)
  */
  mem = {
    rss: '100'
  };
  sys = require("sys");
  url = require("url");
  qs = require("querystring");
  formidable = require("formidable");
  http = require("http");
  path = require("path");
  fs = require("fs");
  MESSAGE_BACKLOG = 200;
  SESSION_TIMEOUT = 60 * 1000;
  Channel = (function() {
    function Channel() {
      var clearCallbacks;
      this.messages = [];
      this.callbacks = [];
      clearCallbacks = __bind(function() {
        var now, _results;
        now = new Date;
        _results = [];
        while (this.callbacks.length > 0 && now - this.callbacks[0].timestamp > 30 * 1000) {
          _results.push(this.callbacks.shift().callback([]));
        }
        return _results;
      }, this);
      setInterval(clearCallbacks, 3000);
    }
    Channel.prototype.appendMessage = function(nick, type, text) {
      var m, _results;
      m = {
        nick: nick,
        type: type,
        text: text,
        timestamp: (new Date).getTime()
      };
      switch (type) {
        case "msg":
          sys.puts("<" + nick + "> " + text);
          break;
        case "join":
          sys.puts(nick + " join");
          break;
        case "part":
          sys.puts(nick + " part");
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
  channel = new Channel;
  sessions = {};
  createSession = function(nick) {
    var session, _i, _len;
    if (nick.length > 50) {
      return null;
    }
    if (/[^\w_\-^!]/.exec(nick)) {
      return null;
    }
    for (_i = 0, _len = sessions.length; _i < _len; _i++) {
      session = sessions[_i];
      if (session && session.nick === nick) {
        return null;
      }
    }
    session = {
      nick: nick,
      id: Math.floor(Math.random() * 99999999999).toString(),
      timestamp: new Date,
      poke: function() {
        return session.timestamp = new Date;
      },
      destroy: function() {
        channel.appendMessage(session.nick, "part");
        return delete sessions[session.id];
      }
    };
    sessions[session.id] = session;
    return session;
  };
  setInterval(function() {
    var now, session, _i, _len, _results;
    now = new Date;
    _results = [];
    for (_i = 0, _len = sessions.length; _i < _len; _i++) {
      session = sessions[_i];
      _results.push(now - session.timestamp > SESSION_TIMEOUT ? session.destroy() : void 0);
    }
    return _results;
  }, 1000);
  http.createServer(function(req, res) {
    var filename, form, id, match, nick, nicks, pathname, result, session, since, text, uri, _i, _len;
    pathname = url.parse(req.url).pathname;
    res.simpleJSON = function(code, obj) {
      var body;
      body = new Buffer(JSON.stringify(obj));
      res.writeHead(code, {
        "Content-Type": "text/json",
        "Content-Length": body.length
      });
      return res.end(body);
    };
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        var result;
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        result = '<form action="/upload" enctype="multipart/form-data" method="post">\n<input type="text" name="title" style="float:left">\n<input type="file" name="upload" multiple="multiple" style="float:left">\n<input type="submit" value="Upload" style="float:left">\n</form>';
        res.end(result);
        fs.rename(files.upload.path, 'tmp/' + files.upload.name);
        return channel.appendMessage(null, "upload", files.upload.name);
      });
      return;
    }
    if (req.url === '/form') {
      res.writeHead(200, {
        'content-type': 'text/html'
      });
      result = '<form action="/upload" enctype="multipart/form-data" method="post">\
      <input type="text" name="title" style="float:left">\
      <input type="file" name="upload" multiple="multiple" style="float:left">\
      <input type="submit" value="Upload" style="float:left">\
      </form>';
      res.end(result);
    }
    if (pathname === "/send") {
      id = qs.parse(url.parse(req.url).query).id;
      text = qs.parse(url.parse(req.url).query).text;
      session = sessions[id];
      if (!session || !text) {
        res.simpleJSON(400, {
          error: "No such session id"
        });
        return;
      }
      session.poke();
      channel.appendMessage(session.nick, "msg", text);
      res.simpleJSON(200, {
        rss: mem.rss
      });
    }
    if (pathname === "/recv") {
      if (!qs.parse(url.parse(req.url).query).since) {
        res.simpleJSON(400, {
          error: "Must supply since parameter"
        });
        return;
      }
      id = qs.parse(url.parse(req.url).query).id;
      if (id && sessions[id]) {
        session = sessions[id];
        session.poke();
      }
      since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
      channel.query(since, function(messages) {
        if (session) {
          session.poke();
        }
        return res.simpleJSON(200, {
          messages: messages,
          rss: mem.rss
        });
      });
    }
    if (pathname === "/part") {
      id = qs.parse(url.parse(req.url).query).id;
      if (id && sessions[id]) {
        session = sessions[id];
        session.destroy();
      }
      res.simpleJSON(200, {
        rss: mem.rss
      });
    }
    if (pathname === "/join") {
      nick = qs.parse(url.parse(req.url).query).nick;
      if (nick === null || nick.length === 0) {
        res.simpleJSON(400, {
          error: "Bad nick."
        });
        return;
      }
      session = createSession(nick);
      if (session === null) {
        res.simpleJSON(400, {
          error: "Nick in use"
        });
        return;
      }
      channel.appendMessage(session.nick, "join");
      res.simpleJSON(200, {
        id: session.id,
        nick: session.nick,
        rss: mem.rss,
        starttime: starttime
      });
    }
    if (pathname === "/who") {
      nicks = [];
      for (_i = 0, _len = sessions.length; _i < _len; _i++) {
        session = sessions[_i];
        if (!sessions.hasOwnProperty(id)) {
          continue;
        }
        session = sessions[id];
        nicks.push(session.nick);
      }
      res.simpleJSON(200, {
        nicks: nicks,
        rss: mem.rss
      });
    }
    if (match = pathname.match(/\/tmp\/(.*)/)) {
      filename = match[1];
      fs.readFile("tmp/" + qs.unescape(filename), "binary", function(err, file) {
        if (err) {
          console.log(err);
          res.writeHead(404, {
            "Content-Type": "text/plain"
          });
          res.write(err + "\n");
          res.end();
          return;
        }
        res.writeHead(200);
        res.write(file, "binary");
        return res.end();
      });
    }
    if (req.url === "/" || req.url === "/style.css" || req.url === "/client.js" || req.url === "/jquery-1.2.6.min.js" || req.url === "/soundmanager2.js" || req.url === "/swf/soundmanager2.swf") {
      uri = url.parse(req.url).pathname;
      filename = path.join(process.cwd(), uri);
      if (req.url === "/") {
        filename = "index.html";
      }
      return fs.readFile(filename, "binary", function(err, file) {
        if (err) {
          res.writeHead(500, {
            "Content-Type": "text/plain"
          });
          res.write(err + "\n");
          res.close();
          return;
        }
        res.writeHead(200);
        res.write(file, "binary");
        return res.end();
      });
    }
  }).listen(Number(process.env.PORT || PORT), HOST);
}).call(this);
