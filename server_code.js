(function() {
  var ID3, SESSION_TIMEOUT, Server, chan, formidable, fs, http, mongodb, path, qs, starttime, static_files, sys, url, util, xml2js;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  starttime = (new Date).getTime();
  static_files = ["/", "/style.css", "/client.js", "/cookie.js", "/jquery-1.2.6.min.js", "/soundmanager2.js", "/swf/soundmanager2.swf", "/swfobject.js", "/media_queue.js", "/soundcloud.player.api.js", "/swf/player.swf", "/background-white.png", "/roundedcornr_br.png", "/roundedcornr_tr.png", "/roundedcornr_bl.png", "/roundedcornr_tl.png", "/osx.css", "/osx.js", "/jquery.simplemodal.js"];
  sys = require("sys");
  url = require("url");
  qs = require("querystring");
  formidable = require("formidable");
  http = require("http");
  path = require("path");
  fs = require("fs");
  util = require("util");
  chan = require("./channel");
  mongodb = require('mongodb');
  ID3 = require("id3");
  xml2js = require('xml2js');
  SESSION_TIMEOUT = 60 * 1000;
  exports.Server = Server = (function() {
    function Server(db) {
      this.db = db;
      this.channel = new chan.Channel(this.db);
      this.sessions = {};
      this.sessionTimeout = setInterval(__bind(function() {
        var now, session, session_id, _ref, _results;
        now = new Date;
        _ref = this.sessions;
        _results = [];
        for (session_id in _ref) {
          session = _ref[session_id];
          _results.push(now - session.timestamp > SESSION_TIMEOUT ? session.destroy(this.channel, this.sessions) : void 0);
        }
        return _results;
      }, this), 1000);
      this.server = http.createServer(__bind(function(req, res) {
        var body, cookie, cookies, filename, form, id, match, nick, nicks, parts, pathname, result, session, session_id, since, text, uri, _i, _len, _ref, _ref2, _ref3;
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
        params = qs.parse(url.parse(req.url).query);
        cookies = {};
        if (req.headers.cookie) {
          _ref = req.headers.cookie.split(';');
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cookie = _ref[_i];
            parts = cookie.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
          }
        }
        id = qs.parse(url.parse(req.url).query).id;
        if (cookies.session_id && this.sessions[cookies.session_id]) {
          session = this.sessions[cookies.session_id];
          session.poke();
        } else if (id && this.sessions[id]) {
          session = this.sessions[id];
          session.poke();
        } else {
          session = {
            nick: "guest"
          };
        }
        if (req.url === '/upload' && req.method.toLowerCase() === 'post') {
          form = new formidable.IncomingForm();
          return form.parse(req, __bind(function(err, fields, files) {
            var data, filename, result, _results;
            res.writeHead(200, {
              'content-type': 'text/html'
            });
            result = '<h3>Upload Songs (mp3)</h3>\n<link rel="stylesheet" href="style.css" type="text/css"/>\n<form action="/upload" enctype="multipart/form-data" method="post">\n<input type="file" name="upload" multiple="multiple" style="float:left">\n<input type="submit" value="Upload" style="float:left">\n</form>';
            res.end(result);
            _results = [];
            for (filename in files) {
              data = files[filename];
              _results.push(data.name.match(/mp3/i) ? (sys.puts("file upload " + data.name), __bind(function(filename) {
                var new_filename;
                new_filename = data.name;
                return fs.rename(data.path, "tmp/" + new_filename, __bind(function() {
                  return res.tag_file(new_filename, __bind(function(id3_tags) {
                    new mongodb.Collection(this.db, 'tags').insert(id3_tags, {
                      safe: true
                    });
                    return this.channel.appendMessage(session.nick, "upload", new_filename, id3_tags);
                  }, this));
                }, this));
              }, this)(filename)) : void 0);
            }
            return _results;
          }, this));
        } else if (req.url === '/form') {
          res.writeHead(200, {
            'content-type': 'text/html'
          });
          result = '<h3>Upload Songs (mp3)</h3>\
          <link rel="stylesheet" href="style.css" type="text/css"/>\
          <form action="/upload" enctype="multipart/form-data" method="post">\
          <input type="file" name="upload" multiple="multiple" style="float:left">\
          <input type="submit" value="Upload" style="float:left">\
          </form>';
          return res.end(result);
        } else if (req.url === '/submit_youtube_link' && req.method.toLowerCase() === 'post') {
          form = new formidable.IncomingForm();
          return form.parse(req, __bind(function(err, fields, files) {
            var match, options;
            match = fields.youtube_link.match(/^(http:\/\/www.youtube.com\/watch\?v=([^&]*))/);
            if (match) {
              options = {
                host: 'gdata.youtube.com',
                port: 80,
                path: "/feeds/api/videos?q=" + match[2] + "&max-results=1&v=2"
              };
              return http.get(options, __bind(function(youtube_response) {
                var data;
                data = '';
                youtube_response.on('data', function(chunk) {
                  return data += chunk;
                });
                return youtube_response.on('end', __bind(function() {
                  var parser;
                  parser = new xml2js.Parser();
                  parser.addListener('end', __bind(function(result) {
                    var title;
                    if (result.entry) {
                      title = result.entry.title;
                    } else {
                      title = match[2];
                    }
                    this.channel.appendMessage(session.nick, "youtube", match[2], {
                      title: title,
                      url: fields.youtube_link
                    });
                    res.end("ok");
                    return data = '';
                  }, this));
                  return parser.parseString(data);
                }, this));
              }, this)).on('error', function(e) {
                return console.log("Got error: " + e.message);
              });
            } else {
              return res.simpleJSON(200, {
                error: "url not correct"
              });
            }
          }, this));
        } else if (req.url === '/submit_soundcloud_link' && req.method.toLowerCase() === 'post') {
          form = new formidable.IncomingForm();
          return form.parse(req, __bind(function(err, fields, files) {
            this.channel.appendMessage(session.nick, "soundcloud", fields.soundcloud_link);
            return res.end("ok");
          }, this));
        } else if (pathname === "/send") {
          text = qs.parse(url.parse(req.url).query).text;
          if (!session || !text) {
            res.simpleJSON(400, {
              error: "No such session id"
            });
            return;
          }
          this.channel.appendMessage(session.nick, "msg", text);
          return res.simpleJSON(200, {});
        } else if (req.url === '/cleanup_bad_files') {
          return fs.readdir('./tmp', function(err, files) {
            var file, _j, _len2;
            for (_j = 0, _len2 = files.length; _j < _len2; _j++) {
              file = files[_j];
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
            var file, _j, _len2;
            files.splice(files.indexOf(".gitignore"), 1);
            for (_j = 0, _len2 = files.length; _j < _len2; _j++) {
              file = files[_j];
              res.tag_file(file, function() {});
            }
            res.writeHead(200, {
              'content-type': 'text/html'
            });
            return res.end("OK");
          });
        } else if (req.url.match(/^\/files/)) {
          return fs.readdir('./tags', function(err, files) {
            var data, file, file_data, _j, _len2;
            files.splice(files.indexOf(".gitignore"), 1);
            file_data = [];
            for (_j = 0, _len2 = files.length; _j < _len2; _j++) {
              file = files[_j];
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
          return form.parse(req, __bind(function(err, fields, files) {
            var song_file;
            song_file = unescape(fields.song_selection);
            return fs.readFile("tags/" + song_file, null, __bind(function(err, data) {
              if (err === null) {
                this.channel.appendMessage(session.nick, "select", song_file, JSON.parse(data));
              }
              res.writeHead(200, {
                'content-type': 'text/html'
              });
              return res.end("OK");
            }, this));
          }, this));
        } else if (pathname === "/recv") {
          if (!qs.parse(url.parse(req.url).query).since) {
            res.simpleJSON(400, {
              error: "Must supply since parameter"
            });
            return;
          }
          since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
          return this.channel.query(since, __bind(function(messages) {
            var current_ids, session, session_id, _ref2;
            current_ids = {};
            _ref2 = this.sessions;
            for (session_id in _ref2) {
              session = _ref2[session_id];
              current_ids[session.nick] = session.current_id;
            }
            return res.simpleJSON(200, {
              messages: messages,
              current_ids: current_ids
            });
          }, this));
        } else if (pathname === "/part") {
          id = qs.parse(url.parse(req.url).query).id;
          if (id && this.sessions[id]) {
            session = this.sessions[id];
            session.destroy(this.channel, this.sessions);
          }
          return res.simpleJSON(200, {});
        } else if (pathname === "/check_session") {
          id = cookies.session_id;
          if (id && this.sessions[id]) {
            return res.simpleJSON(200, {
              success: true
            });
          } else {
            return res.simpleJSON(200, {
              success: false
            });
          }
        } else if (pathname === "/join") {
          nick = qs.parse(url.parse(req.url).query).nick;
          if (nick === null || nick.length === 0) {
            res.simpleJSON(400, {
              error: "Bad nick."
            });
            return;
          }
          session = this.createSession(nick);
          if (session === null) {
            res.simpleJSON(400, {
              error: "Nick in use"
            });
            return;
          }
          this.channel.appendMessage(session.nick, "join");
          body = new Buffer(JSON.stringify({
            id: session.id,
            nick: session.nick,
            starttime: starttime
          }));
          res.writeHead(200, {
            "Content-Type": "text/json",
            'Set-Cookie': "session_id=" + session.id,
            "Content-Length": body.length
          });
          return res.end(body);
        } else if (pathname === "/who") {
          nicks = [];
          _ref2 = this.sessions;
          for (session_id in _ref2) {
            session = _ref2[session_id];
            if (!session.hasOwnProperty('id')) {
              continue;
            }
            nicks.push(session.nick);
          }
          return res.simpleJSON(200, {
            nicks: nicks
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
        } else if ((_ref3 = req.url, __indexOf.call(static_files, _ref3) >= 0)) {
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
      }, this)).addListener('close', function() {
        clearInterval(this.sessionTimeout);
        clearInterval(this.channel.clearCallbacksInterval);
        return this.db.close();
      });
    }
    Server.prototype.listen = function(host, port) {
      return this.server.listen(host, port);
    };
    Server.prototype.createSession = function(nick) {
      var session, session_id, user, _ref;
      if (nick.length > 50) {
        return null;
      }
      if (/[^\w_\-^!]/.exec(nick)) {
        return null;
      }
      _ref = this.sessions;
      for (session_id in _ref) {
        user = _ref[session_id];
        if (user && user.nick === nick) {
          return null;
        }
      }
      session = {
        nick: nick,
        id: Math.floor(Math.random() * 99999999999).toString(),
        timestamp: new Date,
        current_id: null,
        poke: function(current_id) {
          this.current_id = current_id;
          return session.timestamp = new Date;
        },
        destroy: function(channel, sessions) {
          channel.appendMessage(session.nick, "part");
          return delete sessions[session.id];
        }
      };
      this.sessions[session.id] = session;
      return session;
    };
    return Server;
  })();
}).call(this);
