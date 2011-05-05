HOST = null; // localhost
//PORT = 8003;
PORT = 9817;

// when the daemon started
var starttime = (new Date()).getTime();

//var mem = process.memoryUsage();
//// every 10 seconds poll for the memory.
//setInterval(function () {
//  mem = process.memoryUsage();
//}, 10*1000);
var mem = {rss:'100'}


var sys = require("sys"),
    url = require("url"),
    qs = require("querystring"),
    formidable = require("formidable"),
    http = require("http"), 
    path = require("path"),  
    fs = require("fs");

var MESSAGE_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000;

var channel = new function () {
  var messages = [],
      callbacks = [];

  this.appendMessage = function (nick, type, text) {
    var m = { nick: nick
            , type: type // "msg", "join", "part"
            , text: text
            , timestamp: (new Date()).getTime()
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
        break;
    }

    messages.push( m );

    while (callbacks.length > 0) {
      callbacks.shift().callback([m]);
    }

    while (messages.length > MESSAGE_BACKLOG)
      messages.shift();
  };

  this.query = function (since, callback) {
    var matching = [];
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (message.timestamp > since)
        matching.push(message)
    }

    if (matching.length != 0) {
      callback(matching);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };

  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 3000);
};

var sessions = {};

function createSession (nick) {
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

  for (var i in sessions) {
    var session = sessions[i];
    if (session && session.nick === nick) return null;
  }

  var session = { 
    nick: nick, 
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),

    poke: function () {
      session.timestamp = new Date();
    },

    destroy: function () {
      channel.appendMessage(session.nick, "part");
      delete sessions[session.id];
    }
  };

  sessions[session.id] = session;
  return session;
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);

http.createServer(function(req, res) {
  var pathname = url.parse(req.url).pathname;
  
  res.simpleJSON = function (code, obj) {
    var body = new Buffer(JSON.stringify(obj));
    res.writeHead(code, { "Content-Type": "text/json"
                        , "Content-Length": body.length
                        });
    res.end(body);
  };
  
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/html'});
      res.end
        ( '<form action="/upload" enctype="multipart/form-data" method="post">'
        + '<input type="text" name="title" style="float:left">'
        + '<input type="file" name="upload" multiple="multiple" style="float:left">'
        + '<input type="submit" value="Upload" style="float:left">'
        + '</form>'
        );
      if(files.upload.name.match(/mp3/i)){
        fs.rename(files.upload.path, 'tmp/' + files.upload.name)
        channel.appendMessage(null, "upload", files.upload.name)
      }
    });
    return;
  }

  if (req.url == '/form'){
    // show a file upload form
    res.writeHead(200, {'content-type': 'text/html'});
    res.end
      ( '<form action="/upload" enctype="multipart/form-data" method="post">'
      + '<input type="text" name="title" style="float:left">'
      + '<input type="file" name="upload" multiple="multiple" style="float:left">'
      + '<input type="submit" value="Upload" style="float:left">'
      + '</form>'
      );
  }
    
  if (pathname == "/send"){
    var id = qs.parse(url.parse(req.url).query).id;
    var text = qs.parse(url.parse(req.url).query).text;
  
    var session = sessions[id];
    if (!session || !text) {
      res.simpleJSON(400, { error: "No such session id" });
      return;
    }
  
    session.poke();
  
    channel.appendMessage(session.nick, "msg", text);
    res.simpleJSON(200, { rss: mem.rss });
  }
  
  if (pathname == "/recv"){
    if (!qs.parse(url.parse(req.url).query).since) {
      res.simpleJSON(400, { error: "Must supply since parameter" });
      return;
    }
    var id = qs.parse(url.parse(req.url).query).id;
    var session;
    if (id && sessions[id]) {
      session = sessions[id];
      session.poke();
    }
  
    var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);
  
    channel.query(since, function (messages) {
      if (session) session.poke();
      res.simpleJSON(200, { messages: messages, rss: mem.rss });
    });
  }
  
  if (pathname == "/part"){
    var id = qs.parse(url.parse(req.url).query).id;
    var session;
    if (id && sessions[id]) {
      session = sessions[id];
      session.destroy();
    }
    res.simpleJSON(200, { rss: mem.rss });
  }
  
  if (pathname == "/join") {
    var nick = qs.parse(url.parse(req.url).query).nick;
    if (nick == null || nick.length == 0) {
      res.simpleJSON(400, {error: "Bad nick."});
      return;
    }
    var session = createSession(nick);
    if (session == null) {
      res.simpleJSON(400, {error: "Nick in use"});
      return;
    }
  
    //sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);
  
    channel.appendMessage(session.nick, "join");
    res.simpleJSON(200, { id: session.id
                        , nick: session.nick
                        , rss: mem.rss
                        , starttime: starttime
                        });
  }
  
  if (pathname == "/who"){
    var nicks = [];
    for (var id in sessions) {
      if (!sessions.hasOwnProperty(id)) continue;
      var session = sessions[id];
      nicks.push(session.nick);
    }
    res.simpleJSON(200, { nicks: nicks
                        , rss: mem.rss
                        });
  }
  
  if (match = pathname.match(/\/tmp\/(.*)/)){
    var filename = match[1]
    fs.readFile("tmp/" + qs.unescape(filename), "binary", function(err, file) {  
      if(err) { 
        console.log(err);
        res.writeHead(404, {"Content-Type": "text/plain"});  
        res.write(err + "\n");  
        res.end();  
        return;  
      }  
      
      res.writeHead(200);  
      res.write(file, "binary");  
      res.end();  
    });
  }
  
  if (req.url == "/files"){
    fs.readdir('./tmp', function(err, files){
      res.simpleJSON(200, { files: files });
      return;
    })
  }
  
  if (req.url == "/" || req.url == "/style.css" || req.url == "/client.js" || req.url == "/jquery-1.2.6.min.js" || req.url == "/soundmanager2.js" || req.url == "/swf/soundmanager2.swf"){
    var uri = url.parse(req.url).pathname;  
    var filename = path.join(process.cwd(), uri);
    if (req.url == "/")
      filename = "index.html"
    
    fs.readFile(filename, "binary", function(err, file) {  
      if(err) {  
        res.writeHead(500, {"Content-Type": "text/plain"});  
        res.write(err + "\n");  
        res.close();  
        return;  
      }  
      
      res.writeHead(200);  
      res.write(file, "binary");  
      res.end();  
    });
  }
}).listen(Number(process.env.PORT || PORT), HOST);
