(function() {
  var Channel, ID3, MESSAGE_BACKLOG, SESSION_TIMEOUT, channel, createSession, formidable, fs, http, index, mem, path, qs, sessionTimeout, sessions, starttime, static_files, sys, url, util;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  starttime = (new Date).getTime();
  static_files = ["/", "/style.css", "/client.js", "/cookie.js", "/jquery-1.2.6.min.js", "/soundmanager2.js", "/swf/soundmanager2.swf", "/swfobject.js", "/media_queue.js", "/soundcloud.player.api.js", "/swf/player.swf"];
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
  index = 1;
  sys = require("sys");
  url = require("url");
  qs = require("querystring");
  formidable = require("formidable");
  http = require("http");
  path = require("path");
  fs = require("fs");
  util = require("util");
  ID3 = require("id3");
  MESSAGE_BACKLOG = 200;
  SESSION_TIMEOUT = 60 * 1000;
  Channel = (function() {
    function Channel() {
      var clearCallbacks;
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
        id: index
      };
      if (options) {
        for (key in options) {
          value = options[key];
          m[key] = value;
        }
      }
      index += 1;
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
  sessionTimeout = setInterval(function() {
    var now, session, _i, _len, _results;
    now = new Date;
    _results = [];
    for (_i = 0, _len = sessions.length; _i < _len; _i++) {
      session = sessions[_i];
      _results.push(now - session.timestamp > SESSION_TIMEOUT ? session.destroy() : void 0);
    }
    return _results;
  }, 1000);
  exports.server = http.createServer(function(req, res) {
    var filename, form, id, match, nick, nicks, pathname, response_json, result, session, session_id, since, text, uri, _ref;
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
    res.tag_file = function(filename, callback) {
      return fs.readFile("tmp/" + filename, function(err, data) {
        var id3_3v2, id3_tags;
        if (err) {
          throw err;
        }
        id3_3v2 = new ID3(data);
        id3_3v2.parse();
        id3_tags = {
          title: id3_3v2.get('title'),
          album: id3_3v2.get('album'),
          artist: id3_3v2.get('artist')
        };
        callback(id3_tags);
        return fs.open("tags/" + filename, "w+", 0666, function(err, fd) {
          var buffer;
          buffer = new Buffer(JSON.stringify(id3_tags));
          return fs.write(fd, buffer, 0, buffer.length);
        });
      });
    };
    if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
      form = new formidable.IncomingForm();
      return form.parse(req, function(err, fields, files) {
        var result;
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        result = '<h3>Upload a Song (mp3)</h3>\n<form action="/upload" enctype="multipart/form-data" method="post">\n<input type="text" name="title" style="float:left">\n<input type="file" name="upload" multiple="multiple" style="float:left">\n<input type="submit" value="Upload" style="float:left">\n</form>';
        res.end(result);
        if (files.upload && files.upload.name.match(/mp3/i)) {
          sys.puts("file upload " + files.upload.name);
          return fs.rename(files.upload.path, "tmp/" + files.upload.name, function() {
            return res.tag_file(files.upload.name, function(id3_tags) {
              return channel.appendMessage(null, "upload", files.upload.name, id3_tags);
            });
          });
        }
      });
    } else if (req.url === '/form') {
      res.writeHead(200, {
        'content-type': 'text/html'
      });
      result = '<h3>Upload a Song (mp3)</h3>\
      <form action="/upload" enctype="multipart/form-data" method="post">\
      <input type="text" name="title" style="float:left">\
      <input type="file" name="upload" multiple="multiple" style="float:left">\
      <input type="submit" value="Upload" style="float:left">\
      </form>';
      return res.end(result);
    } else if (req.url === '/submit_youtube_link' && req.method.toLowerCase() === 'post') {
      form = new formidable.IncomingForm();
      return form.parse(req, function(err, fields, files) {
        var match;
        match = fields.youtube_link.match(/^(http:\/\/www.youtube.com\/watch\?v=([^&]*))/);
        if (match) {
          sys.puts("submitted youtube link " + match[2]);
          channel.appendMessage(null, "youtube", match[2]);
        }
        return res.end("ok");
      });
    } else if (req.url === '/submit_soundcloud_link' && req.method.toLowerCase() === 'post') {
      form = new formidable.IncomingForm();
      return form.parse(req, function(err, fields, files) {
        channel.appendMessage(null, "soundcloud", fields.soundcloud_link);
        return res.end("ok");
      });
    } else if (pathname === "/send") {
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
      return res.simpleJSON(200, {
        rss: mem.rss
      });
    } else if (req.url === '/cleanup_bad_files') {
      return fs.readdir('./tmp', function(err, files) {
        var file, _i, _len;
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          if (!file.match(/^.gitignore$|\.mp3$/)) {
            fs.unlink('./tmp/' + file);
          }
        }
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        return res.end("OK");
      });
    } else if (req.url === '/tag_all_files') {
      return fs.readdir('./tmp', function(err, files) {
        var file, _i, _len;
        files.splice(files.indexOf(".gitignore"), 1);
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          res.tag_file(file, function() {});
        }
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        return res.end("OK");
      });
    } else if (req.url.match(/^\/files/)) {
      return fs.readdir('./tags', function(err, files) {
        var data, file, file_data, _i, _len;
        files.splice(files.indexOf(".gitignore"), 1);
        file_data = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          data = fs.readFileSync("tags/" + file);
          try {
            data = JSON.parse(data);
            data.file = file;
            file_data = file_data.concat(data);
          } catch (error) {

          }
        }
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        return res.end(new Buffer(JSON.stringify({
          files: file_data
        })));
      });
    } else if (req.url === "/submit_file") {
      form = new formidable.IncomingForm();
      return form.parse(req, function(err, fields, files) {
        var song_file;
        song_file = unescape(fields.song_selection);
        fs.readFile("tags/" + song_file, null, function(err, data) {
          return channel.appendMessage(null, "upload", song_file, JSON.parse(data));
        });
        res.writeHead(200, {
          'content-type': 'text/html'
        });
        return res.end("OK");
      });
    } else if (pathname === "/recv") {
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
      return channel.query(since, function(messages) {
        if (session) {
          session.poke();
        }
        return res.simpleJSON(200, {
          messages: messages,
          rss: mem.rss
        });
      });
    } else if (pathname === "/part") {
      id = qs.parse(url.parse(req.url).query).id;
      if (id && sessions[id]) {
        session = sessions[id];
        session.destroy();
      }
      return res.simpleJSON(200, {
        rss: mem.rss
      });
    } else if (pathname === "/join") {
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
      response_json = {
        id: session.id,
        nick: session.nick,
        rss: mem.rss,
        starttime: starttime
      };
      return res.simpleJSON(200, response_json);
    } else if (pathname === "/who") {
      nicks = [];
      for (session_id in sessions) {
        session = sessions[session_id];
        if (!session.hasOwnProperty('id')) {
          continue;
        }
        nicks.push(session.nick);
      }
      return res.simpleJSON(200, {
        nicks: nicks,
        rss: mem.rss
      });
    } else if (match = pathname.match(/\/tmp\/(.*)/)) {
      filename = match[1];
      return fs.readFile("tmp/" + qs.unescape(filename), "binary", function(err, file) {
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
    } else if ((_ref = req.url, __indexOf.call(static_files, _ref) >= 0)) {
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
    } else {
      res.writeHead(404, {
        "Content-Type": "text/plain"
      });
      res.write("bad request" + req.url);
      sys.puts("bad request" + req.url);
      return res.end();
    }
  });
  exports.server.addListener('close', function() {
    clearInterval(sessionTimeout);
    return clearInterval(channel.clearCallbacksInterval);
  });
}).call(this);
