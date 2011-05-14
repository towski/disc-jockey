# when the daemon started
starttime = (new Date).getTime()
static_files = ["/", "/style.css", "/client.js", "/cookie.js", "/jquery-1.2.6.min.js", "/soundmanager2.js", "/swf/soundmanager2.swf", "/swfobject.js", "/media_queue.js", "/soundcloud.player.api.js", "/swf/player.swf"]

sys = require("sys")
url = require("url")
qs = require("querystring")
formidable = require("formidable")
http = require("http")
path = require("path")
fs = require("fs")
util = require("util")
chan = require("./channel")
ID3 = require("id3")

SESSION_TIMEOUT = 60 * 1000

channel = new chan.Channel
sessions = {}

createSession = (nick) ->
  if nick.length > 50 
    return null
  if (/[^\w_\-^!]/.exec(nick)) 
    return null

  for session in sessions
    if (session && session.nick == nick) 
      return null

  session = { 
    nick: nick, 
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date,

    poke: ->
      session.timestamp = new Date

    destroy: ->
      channel.appendMessage(session.nick, "part")
      delete sessions[session.id]
  }

  sessions[session.id] = session;
  session
  
# interval to kill off old sessions
sessionTimeout = setInterval () ->
  now = new Date
  for session in sessions
    if (now - session.timestamp > SESSION_TIMEOUT)
      session.destroy()
, 1000

exports.server = http.createServer (req, res) ->
  pathname = url.parse(req.url).pathname
  
  res.simpleJSON = (code, obj) ->
    body = new Buffer(JSON.stringify(obj))
    res.writeHead(code, { "Content-Type": "text/json", "Content-Length": body.length})
    res.end(body)
    
  res.tag_file = (filename, callback) ->
    fs.readFile "tmp/#{filename}", (err, data) ->
      if err
        throw err
      id3_3v2 = new ID3(data)
      id3_3v2.parse();
      id3_tags = {
        title: id3_3v2.get('title'),
        album: id3_3v2.get('album'),
        artist: id3_3v2.get('artist')
      }
      callback(id3_tags)
      fs.open "tags/#{filename}", "w+", 0666, (err, fd) ->
        buffer = new Buffer(JSON.stringify(id3_tags))
        fs.write fd, buffer, 0, buffer.length
  
  if req.url == '/upload' && req.method.toLowerCase() == 'post'
    # parse a file upload
    form = new formidable.IncomingForm()
    form.parse req, (err, fields, files) ->
      res.writeHead(200, {'content-type': 'text/html'})
      result = '''
        <h3>Upload a Song (mp3)</h3>
        <form action="/upload" enctype="multipart/form-data" method="post">
        <input type="file" name="upload" multiple="multiple" style="float:left">
        <input type="submit" value="Upload" style="float:left">
        </form>
      '''
      res.end result
      for filename, data of files
        if data.name.match(/mp3/i)
          sys.puts("file upload " + data.name)
          do (filename) ->
            new_filename = data.name
            fs.rename data.path, "tmp/#{new_filename}", ->
              res.tag_file new_filename, (id3_tags) ->
                channel.appendMessage(null, "upload", new_filename, id3_tags)

  else if (req.url == '/form')
    # show a file upload form
    res.writeHead(200, {'content-type': 'text/html'})
    result = '<h3>Upload a Song (mp3)</h3>
      <form action="/upload" enctype="multipart/form-data" method="post">
      <input type="file" name="upload" multiple="multiple" style="float:left">
      <input type="submit" value="Upload" style="float:left">
      </form>'
    res.end result
    
  else if req.url == '/submit_youtube_link' && req.method.toLowerCase() == 'post'
    form = new formidable.IncomingForm()
    form.parse req, (err, fields, files) ->
      match = fields.youtube_link.match /// ^ (
        http://www.youtube.com/watch\?v=([^&]*)
      ) ///
      if match
        channel.appendMessage(null, "youtube", match[2])
      res.end "ok"
      
  else if req.url == '/submit_soundcloud_link' && req.method.toLowerCase() == 'post'
    form = new formidable.IncomingForm()
    form.parse req, (err, fields, files) ->
      channel.appendMessage(null, "soundcloud", fields.soundcloud_link)
      res.end "ok"
    
  else if (pathname == "/send")
    id = qs.parse(url.parse(req.url).query).id
    text = qs.parse(url.parse(req.url).query).text
    session = sessions[id]
    if (!session || !text)
      res.simpleJSON(400, { error: "No such session id" })
      return
    session.poke()
    channel.appendMessage(session.nick, "msg", text)
    res.simpleJSON(200, {})

  else if req.url == '/cleanup_bad_files'
    fs.readdir './tmp', (err, files) ->
      for file in files
        if !file.match(/^.gitignore$|\.mp3$/)
          fs.unlink './tmp/' + file
      res.writeHead(200, {'content-type': 'text/html'})
      res.end "OK"
      
  else if req.url == '/tag_all_files'
    fs.readdir './tmp', (err, files) ->
      files.splice(files.indexOf(".gitignore"), 1)
      for file in files
        res.tag_file file, ->
      res.writeHead(200, {'content-type': 'text/html'})
      res.end "OK"
    
  else if req.url.match(/^\/files/)
    fs.readdir './tags', (err, files) ->
      files.splice(files.indexOf(".gitignore"), 1)
      file_data = []
      for file in files
        data = fs.readFileSync("tags/#{file}")
        try
          data = JSON.parse(data)
          data.file = file
          file_data = file_data.concat data
        catch error
      res.writeHead(200, {'content-type': 'text/html'})
      res.end(new Buffer(JSON.stringify({files: file_data})))
  
  else if req.url == "/submit_file"
    form = new formidable.IncomingForm()
    form.parse req, (err, fields, files) ->
      song_file = unescape(fields.song_selection)
      fs.readFile "tags/#{song_file}", null, (err, data) ->
        if err == null
          channel.appendMessage null, "upload", song_file, JSON.parse(data)
        res.writeHead(200, {'content-type': 'text/html'})
        res.end "OK"
  
  else if pathname == "/recv"
    if !qs.parse(url.parse(req.url).query).since
      res.simpleJSON(400, { error: "Must supply since parameter" })
      return
    id = qs.parse(url.parse(req.url).query).id
    if id && sessions[id]
      session = sessions[id]
      session.poke()
    since = parseInt qs.parse(url.parse(req.url).query).since, 10
    channel.query since, (messages) ->
      if (session) 
        session.poke()
      res.simpleJSON(200, { messages: messages })
  
  else if (pathname == "/part")
    id = qs.parse(url.parse(req.url).query).id
    if (id && sessions[id])
      session = sessions[id]
      session.destroy()
    res.simpleJSON(200, {})
  
  else if (pathname == "/join")
    nick = qs.parse(url.parse(req.url).query).nick
    if (nick == null || nick.length == 0)
      res.simpleJSON(400, {error: "Bad nick."})
      return
    session = createSession(nick)
    if session == null
      res.simpleJSON(400, {error: "Nick in use"})
      return
    channel.appendMessage(session.nick, "join")
    response_json = { id: session.id, nick: session.nick, starttime: starttime }
    res.simpleJSON(200, response_json)
  
  else if pathname == "/who"
    nicks = []
    for session_id, session of sessions
      if (!session.hasOwnProperty('id')) 
        continue
      nicks.push(session.nick)
    res.simpleJSON(200, { nicks: nicks })
  
  else if match = pathname.match(/\/tmp\/(.*)/)
    filename = match[1]
    fs.readFile "tmp/" + qs.unescape(filename), "binary", (err, file) ->
      if(err)
        console.log(err)
        res.writeHead(404, {"Content-Type": "text/plain"})  
        res.write(err + "\n")  
        res.end()  
        return  
      res.writeHead(200)  
      res.write(file, "binary")  
      res.end()  
  
  else if (req.url in static_files)
    uri = url.parse(req.url).pathname  
    filename = path.join(process.cwd(), uri)
    if (req.url == "/")
      filename = "index.html"
    fs.readFile filename, "binary", (err, file) ->
      if(err)
        res.writeHead(500, {"Content-Type": "text/plain"})  
        res.write(err + "\n")  
        res.close()  
        return  
      res.writeHead(200)  
      res.write(file, "binary")  
      res.end()
  
  else
    res.writeHead(404, {"Content-Type": "text/plain"})  
    res.write("bad request" + req.url)  
    sys.puts("bad request" + req.url)
    res.end()
.addListener 'close', ->
  clearInterval sessionTimeout 
  clearInterval channel.clearCallbacksInterval
  
exports.server.channel = channel