class MediaQueue
  constructor: ->
    @songs = []
    @playback_started = false
    @currentSong = null
    @local_playback = false
    @soundcloud_started = false
    @soundcloud_registered = false

  queueYoutube: (array) ->
    @songs = @songs.concat({type: 'youtube', vid: array.text, id: array.id})
    if @local_playback && !@playback_started
      @playNext()
      
  queueSoundCloud: (array) ->
    @songs = @songs.concat({type: 'soundcloud', url: array.text, id: array.id})
    if @local_playback && !@playback_started
      @playNext()
  
  queueMP3: (song) ->
    song.type = 'mp3'
    song.file = song.text
    @songs = @songs.concat(song)
    $('#song_list').append("<li>#{song.artist} - #{song.album} - #{song.title} <a href='#' onclick='window.media_queue.removeSongs(#{song.id}); $(this.parentElement).remove(); return false'>x</a></li>")
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
      else if @currentSong.type == "soundcloud"
        if @sound_cloud_registered
          soundcloud_player.api_stop()
        @soundcloud_song_loaded = false  
        $('#soundcloud').hide()
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
      else if song.type == 'soundcloud'
        @playSoundCloud(song)
    else
      @playback_started = false
  
  readyVideoPlayer: (song) ->
    @currentSong = song
    $("#youtube_mother").show()
  
  playCurrentVideo: ->   
    ytswf.loadVideoById(@currentSong.vid)
    
  loadCurrentSoundCloud: () ->
    if @soundcloud_song_loaded
      @soundcloud_song_loaded = true
      soundcloud_player.api_load(media_queue.currentSong.url)
    else
      soundcloud_player.api_play()
     
  playSoundCloud: (song) ->
    @currentSong = song
    if !@soundcloud_started
      @soundcloud_started = true
      startSoundCloud(song.url)
    else
      $('#soundcloud').show()
      
  playSong: (song) ->
    $('#current_song').html("#{song.artist} - #{song.album} - #{song.title}")
    @currentSong = soundManager.createSound({
      id: song.file,
      url:"/tmp/" + escape(song.file),
      onfinish: => 
        @clearCurrentSong()
        @playNext()
    })
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
    for song in songs
      @songs.remove(@songs.indexOf(song))
    
window.MediaQueue = MediaQueue