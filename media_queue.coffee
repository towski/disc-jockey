class MediaQueue
  constructor: ->
    @songs = []
    @playback_started = false
    @currentSong = null
    @local_playback = false

  queueYoutube: (array) ->
    @songs = @songs.concat({type: 'youtube', vid: array.text, id: array.id})
    if @local_playback && !@playback_started
      @playNext()
  
  queueMP3: (array) ->
    song = {type: 'mp3', file: array.text, id: array.id}
    @songs = @songs.concat(song)
    if @local_playback && !@playback_started
      @playNext()
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
      setTimeout ->
        $('#song_list li:first-child').remove()
      , 0
      if song.type == 'youtube'
        @readyVideoPlayer(song)
      else if song.type == 'mp3'
        @playSong(song)
    else
      @playback_started = false
  
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
       
  #soundManager.onready(startSong)
    
  removeSongs: (id) ->
    songs = @songs.filter (obj) ->
      obj.id == id
    console.log(songs)
    console.log(id)
    for song in songs
      @songs.remove(@songs.indexOf(song))
    
window.MediaQueue = MediaQueue