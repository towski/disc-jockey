class MediaQueue
  constructor: ->
    @songs = []
    @playback_started = false
    @currentSong = null
    @local_playback = false

  queueYoutube: (array) ->
    @songs = @songs.concat({type: 'youtube', vid: array.text, id: array.id})
  
  queueMP3: (array) ->
    song = {type: 'mp3', file: array.text, id: array.id}
    @songs = @songs.concat(song)
    return song
  
  clearCurrentSong: ->
    if @currentSong
      if @currentSong.type == "mp3"
        @currentSong.stop()
        @currentSong.destruct()
        $('#current_song').html("")
      else if @currentSong.type == "youtube"
        console.log("hiding")
        $("#youtube_mother").hide()
      @currentSong = null
        
  playNext: () ->
    console.log("playing next")
    song = @songs[0]
    @songs = @songs.splice(1, @songs.length)
    if song
      $('#song_list li:first-child').remove()
      if song.type == 'youtube'
        @readyVideoPlayer(song)
      else if song.type == 'mp3'
        @playSong(song)
  
  readyVideoPlayer: (song) ->
    @currentSong = song
    $("#youtube_mother").show()
  
  playCurrentVideo: ->   
    ytswf.loadVideoById(@currentSong.vid)
      
  playSong: (song) ->
    $('#current_song').html(song.file)
    @currentSong = soundManager.createSound({
      id: song.file,
      url:"/tmp/" + escape(song.file),
      onfinish: => 
        @clearCurrentSong()
        @playNext()
    })
    console.log(@currentSong.type)
    @currentSong.type = "mp3"
    soundManager.play(song.file)
  
  stopLocalPlayback: ->
    if(@currentSong)
      if @currentSong.type == "mp3"
        @currentSong.stop()
        @local_playback = false
        @playback_started = false
        $("#toggle_playback").html("Play")

  enableLocalPlayback: ->
    @local_playback = true
    @playback_started = true
    if(@currentSong)
      @currentSong.play()
    else
      @playNext()

  skipCurrentSong: ->
    @clearCurrentSong()
    setTimeout(=> 
      @playNext()
    , 0)

  togglePlayback: ->
    if @local_playback
      @stopLocalPlayback() 
    else 
      @enableLocalPlayback()
      $("#toggle_playback").html("Stop")
       
  songFinishCallback: ->
    if(@currentSong)
      @currentSong.destruct()
      @currentSong = null
    if(@local_playback)
      song = @songs[0]
      @songs = @songs.splice(1, @songs.length)
      if(song)
        $('#song_list li:first-child').remove()
        $('#current_song').html(song.text)
        @currentSong = soundManager.createSound({
          id: song.text,
          url:"/tmp/" + escape(song.text),
          onfinish: @songFinishCallback
        })
        soundManager.play(song.text)
      else
        $('#current_song').html("")
        @playback_started = false

  startPlayback: (message) ->
    if(!@playback_started && @local_playback)
      @playback_started = true
      first_song = message
      startSong = () ->
        $('#song_list li:first-child').remove()
        $('#current_song').html(first_song.text)
        @currentSong = soundManager.createSound({
          id: first_song.text,
          url:"/tmp/" + escape(first_song.text),
          onfinish: @songFinishCallback
        })
        @currentSong.play(first_song.text)
      soundManager.onready(startSong)
    else
      @songs = @songs.concat(message)
    
  removeSongs: (id) ->
    songs = @songs.filter (obj) ->
      obj.id == id
    console.log(songs)
    console.log(id)
    for song in songs
      @songs.remove(@songs.indexOf(song))
    
window.MediaQueue = MediaQueue