CONFIG = { debug: false
             , nick: "#"   # set in onConnect
             , id: null    # set in onConnect
             , last_message_time: 1
             , focus: true #event listeners bound in onConnect
             , unread: 0 #updated in the message-processing loop
             }

nicks = []
exports = if exports
  exports
else
  this

window.generateColor = (string) ->
  color = Math.abs(string.hashCode()).toString(16)
  while color.length < 6
    color = "0" + color
  color.slice(0, 6)

#updates the users link to reflect the number of active users
updateUsersLink = () ->
  t = nicks.length.toString() + " user"
  if (nicks.length != 1) 
    t += "s"
  $("#usersLink").text(t)

#handles another person joining chat
userJoin = (joining, timestamp) ->
  #put it in the stream
  addMessage(joining, "joined", timestamp, "join")
  #if we already know about this user, ignore it
  for nick in nicks
    if (nick == joining) 
      return
  #otherwise, add the user to the list
  nicks.push(joining)
  #update the UI
  updateUsersLink()

#handles someone leaving
userPart = (parting, timestamp) ->
  #put it in the stream
  addMessage(parting, "left", timestamp, "part")
  #remove the user from the list
  for nick in nicks
    if (nick == parting)
      nicks.splice(_i,1)
      break
  #update the UI
  updateUsersLink()

#used to keep the most recent messages visible
exports.scrollDown = () ->
  $('#log').scrollTop(1000000)
  #window.scrollBy(0, 100000000000000000)
  $("#entry").focus()
  
#inserts an event into the stream for display
#the event may be a msg, join or part type
#from is the user, text is the body and time is the timestamp, defaulting to now
#_class is a css class to apply to the message, usefull for system events
addMessage = (from, text, time, _class) ->
  if (text == null)
    return

  if (time == null)
    # if the time is null or undefined, use the current time.
    time = new Date()
  else if ((time instanceof Date) == false) 
    # if its a timestamp, interpret it
    time = new Date(time)

  #every message you see is actually a table with 3 cols:
  #  the time,
  #  the person who caused the event,
  #  and the content
  messageElement = $(document.createElement("table"))

  messageElement.addClass("message")
  if (_class)
    messageElement.addClass(_class)

  # sanitize
  text = util.toStaticHTML(text)

  # If the current user said this, add a special css class
  nick_re = new RegExp(CONFIG.nick)
  if (nick_re.exec(text))
    messageElement.addClass("personal")

  # replace URLs with links
  text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>')

  content = """
    <tr>
       <td class="nick" title="#{ util.timeString(time) }">#{ util.toStaticHTML(from) }</td>
       <td class="msg-text">#{ text }</td>
    </tr>
  """
  
  messageElement.html(content)

  #the log is the stream that we view
  $("#log").append(messageElement)

  #always view the most recent message when it is added
  scrollDown()

updateUptime = () ->
  if (starttime)
    $("#uptime").text(starttime.toRelativeTime())

window.media_queue = new MediaQueue

transmission_errors = 0
first_poll = true

#process updates if we have any, request updates from the server,
# and call again with response. the last part is like recursion except the call
# is being made from the response handler, and not at some point during the
# functions execution
longPoll = (data) ->
  if (transmission_errors > 2)
    showConnect()
    return

  #process any updates we may have
  #data will be null on the first call of longPoll
  if (data && data.messages)
    for message in data.messages
      #track oldest message so we only request newer messages from server
      if (message.timestamp > CONFIG.last_message_time)
        CONFIG.last_message_time = message.timestamp

      #dispatch new messages to their appropriate handlers
      switch (message.type)
        when "msg"
          if(!CONFIG.focus)
            CONFIG.unread++
          addMessage(message.nick, message.text, message.timestamp)

        when "join" then userJoin(message.nick, message.timestamp)
        when "part" then userPart(message.nick, message.timestamp)
        when "youtube"
          addMessage(message.nick, "requested " + message.title, message.timestamp, "join")
          window.media_queue.queueYoutube(message)
        when "soundcloud"
          addMessage(message.nick, "requested a soundcloud link", message.timestamp, "join")
          window.media_queue.queueSoundCloud(message)
        when "upload"
          addMessage(message.nick, "uploaded " + message.title, message.timestamp, "join")
          song = window.media_queue.queueMP3(message)
        when "select"
          addMessage(message.nick, "selected " + message.title, message.timestamp, "join")
          song = window.media_queue.queueMP3(message)
    #update the document title to include unread message count if blurred
    updateTitle()

    #only after the first request for messages do we want to show who is here
    if (first_poll)
      first_poll = false
      who()

  #make another request
  $.ajax({ cache: false
         , type: "GET"
         , url: "/recv"
         , dataType: "json"
         , data: { since: CONFIG.last_message_time, id: CONFIG.id }
         , error: () ->
             addMessage("", "long poll error. trying again...", new Date(), "error")
             transmission_errors += 1
             #dont flood the servers on error, wait 10 seconds before retrying
             setTimeout(longPoll, 10*1000)
         , success: (data) ->
             transmission_errors = 0
             #if everything went well, begin another request immediately
             #the server will take a long time to respond
             #how long? well, it will wait until there is another message
             #and then it will return it to us and close the connection.
             #since the connection is closed when we get data, we longPoll again
             longPoll(data)
         })

#submit a new message to the server
send = (msg) ->
  if (CONFIG.debug == false)
    # XXX should be POST
    # XXX should add to messages immediately
    fun = ->
    jQuery.get("/send", {id: CONFIG.id, text: msg}, fun, "json")

#Transition the page to the state that prompts the user for a nickname
showConnect = () ->
  $("#connect").show()
  #$("#loading").hide()
  #$("#toolbar").hide()
  $("#nickInput").focus()

#transition the page to the loading screen
showLoad = () ->
  $("#connect").hide()
  $("#toolbar").hide()

#transition the page to the main chat view, putting the cursor in the textfield
exports.showChat = (nick) ->
  $("#toolbar").show()
  $("#entry").focus()
  $("#entry").show()
  $("#connect").hide()
  scrollDown()

#we want to show a count of unread messages when the window does not have focus
updateTitle = () ->
  if (CONFIG.unread)
    document.title = "(" + CONFIG.unread.toString() + ") dj the world"
  else
    document.title = "dj the world"
    
# daemon start time
starttime = null
ytswf = null

#handle the servers response to our nickname and join request
onConnect = (session) ->
  if (session.error)
    $('toolbar').show()
    return

  CONFIG.nick = session.nick
  CONFIG.id   = session.id
  starttime   = new Date(session.starttime)

  #update the UI to show the chat
  showChat(CONFIG.nick)

  #listen for browser events so we know to update the document title
  $(window).bind "blur", () ->
    CONFIG.focus = false
    updateTitle()

  $(window).bind "focus", () ->
    CONFIG.focus = true
    CONFIG.unread = 0
    updateTitle()

#add a list of present chat members to the stream
outputUsers = () ->
  nick_string = if nicks.length > 0
    nicks.join(", ") 
  else 
    "(none)"
  addMessage("users:", nick_string, new Date(), "notice")
  return false

#get a list of the users presently in the room, and add it to the stream
who = () ->
  jQuery.get("/who", {}, (data, status) ->
    if (status != "success") 
      return
    nicks = data.nicks
    outputUsers()
  , "json")

$(document).ready () ->
  #submit new messages when the user hits enter if the message isnt blank
  $("#entry").keypress (e) ->
    if (e.keyCode != 13) 
      return
    msg = $("#entry").attr("value").replace("\n", "")
    if (!util.isBlank(msg)) 
      send(msg)
    $("#entry").attr("value", "") # clear the entry field.

  $("#usersLink").click(outputUsers)

  #try joining the chat when the user clicks the connect button
  $("#connectButton").click () ->
    #lock the UI while waiting for a response
    showLoad()
    nick = $("#nickInput").attr("value")
    #dont bother the backend if we fail easy validations
    if (nick.length > 50)
      alert("Nick too long. 50 character max.")
      showConnect()
      return false
    #more validations
    if (/[^\w_\-^!]/.exec(nick))
      alert("Bad character in nick. Can only have letters, numbers, and '_', '-', '^', '!'")
      showConnect()
      return false
      #make the actual join request to the server
    ajax_params = { 
      cache: false, type: "GET", dataType: "json", url: "/join", data: { nick: nick }, 
      error: (response) ->
        alert(JSON.parse(response.response).error)
        $('#toolbar').show()
        $('#connect').show()
      , success: onConnect
    }
    $.ajax ajax_params
    return false
    
  $("#youtube_form").submit () ->
    try
      ajax_params = { 
        cache: false, type: "POST", dataType: "json", url: "/submit_youtube_link", data: $("#youtube_form").serialize(), 
        success: ->
      }
      $.ajax ajax_params
    catch error
      alert error
    return false
    
  $("#soundcloud_form").submit () ->
    try
      ajax_params = { 
        cache: false, type: "POST", dataType: "json", url: "/submit_soundcloud_link", data: $("#soundcloud_form").serialize(), 
        success: ->
      }
      $.ajax ajax_params
    catch error
      alert error
    return false
  
  ajax_params = { 
    cache: false, type: "get", dataType: "json", url: "/files", 
    success: (response) ->
      songs = response.files.sort (obj1, obj2) ->
        if obj1.artist == obj2.artist
          if obj1.album > obj2.album
            1
          else
            -1
        else if obj1.artist > obj2.artist
          1
        else
          -1
      for song in response.files
        $('#song_selection').append("<option value='#{escape(song.file)}'>#{song.artist} - #{song.album} - #{song.title}</option>")
  }
  $.ajax ajax_params
  
  $("#submit_song").submit () ->
    ajax_params = { 
      type: "post", dataType: "json", url: "/submit_file", data: $("#submit_song").serialize(), 
      success: (response) ->
        console.log(response)
    }
    $.ajax ajax_params
  
  params = { allowScriptAccess: "always" }
  atts = { id: "myytplayer" }
  swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&version=3", "ytapiplayer", "425", "356", "8", null, null, params, atts)

  if (CONFIG.debug)
    $("#connect").hide()
    scrollDown()
    return

  # remove fixtures
  $("#log table").remove()

  #begin listening for updates right away
  #interestingly, we dont need to join a room to get its updates
  #we just dont show the chat stream to the user until we create a session
  longPoll()

  showConnect()
  if(Cookie.get("session_id"))
    $.ajax({
      type: "get", dataType: "json", url: "/check_session",
      success: (response) ->
        if(response.success)
          showChat()
    })
  $('#youtube_toggle').click()
  $('#search_youtube_toggle').click()

#if we can, notify the server that were going away.
$(window).unload () ->
  jQuery.get("/part", {id: CONFIG.id}, ((data) ->), "json")

