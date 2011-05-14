sys = require("sys")
MESSAGE_BACKLOG = 200
exports.Channel = class Channel
  constructor: ->
    @index = 1
    @messages = []
    @callbacks = []
    @files = [".gitignore"]
    # clear old callbacks
    # they can hang around for at most 30 seconds.
    clearCallbacks = =>
      now = new Date
      while @callbacks.length > 0 && now - @callbacks[0].timestamp > 30*1000
        @callbacks.shift().callback []
      
    @clearCallbacksInterval = setInterval clearCallbacks, 3000

  appendMessage: (nick, type, text, options) ->
    m = { 
          nick: nick, 
          type: type, # "msg", "join", "part"
          text: text,
          timestamp: (new Date).getTime(),
          id:   @index
        }
    if options
      for key, value of options 
        m[key] = value
    
    @index += 1
    switch type
      when "msg" then sys.puts("<" + nick + "> " + text)
      when "join" then sys.puts(nick + " join")
      when "part" then sys.puts(nick + " part")
      when "upload" then @files.push text
    @messages.push( m )
    while (@callbacks.length > 0)
      @callbacks.shift().callback([m])
    while (@messages.length > MESSAGE_BACKLOG)
      @messages.shift()

  query: (since, callback) ->
    matching = []
    for message in @messages
      if (message.timestamp > since)
        matching.push(message)
    if matching.length != 0
      callback matching
    else
      @callbacks.push { timestamp: new Date, callback: callback }