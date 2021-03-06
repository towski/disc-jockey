exports = exports ? this  

exports.MediaQueue = class MediaQueue
  constructor: ->
    @songs = []
    @playback_started = false
    @currentSong = null
    @local_playback = false
    @soundcloud_started = false
    @soundcloud_registered = false
    @current_id = null

  queueYoutube: (video) ->
    video.type = 'youtube'
    video.vid = video.text
    @songs = @songs.concat(video)
    $('#song_list').prepend("<li id='song#{video.id}'>youtube video <a href='#{video.url}' target='_blank'>#{video.title}</a> <a href='#' onclick='window.media_queue.removeSongs(#{video.id}); $(this.parentElement).remove(); return false'>x</a></li>")
    if @local_playback && !@playback_started
      @playNext()
      
  queueSoundCloud: (array) ->
    @songs = @songs.concat({type: 'soundcloud', url: array.text, id: array.id})
    $('#song_list').prepend("<li id='song#{array.id}'>soundcloud url #{array.text} <a href='#' onclick='window.media_queue.removeSongs(#{array.id}); $(this.parentElement).remove(); return false'>x</a></li>")
    if @local_playback && !@playback_started
      @playNext()
  
  queueMP3: (song) ->
    song.type = 'mp3'
    song.file = song.text
    @songs = @songs.concat(song)
    $('#song_list').prepend("<li id='song#{song.id}'>#{song.artist} - #{song.album} - #{song.title} <a href='#' onclick='window.media_queue.removeSongs(#{song.id}); $(this.parentElement).remove(); return false'>x</a></li>")
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
        $("#youtube_mother").hide()
      else if @currentSong.type == "soundcloud"
        if @sound_cloud_registered
          soundcloud_player.api_stop()
        @soundcloud_song_loaded = false
        $('#myPlayer')[0].width = "1px"
        $('#myPlayer')[0].height = "1px"
      @currentSong = null
        
  playNext: () ->
    song = @songs[0]
    @songs = @songs.splice(1, @songs.length)
    $("#song#{@current_id}").removeClass(CONFIG.nick)
    if song
      $("#song#{song.id}").addClass(CONFIG.nick)
      @current_id = song.id
      Cookie.set('current_id', @current_id)
      @playback_started = true
      $('.header').html("&nbsp;")
      $("##{song.type}-header").html(song.type)
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
    if !@soundcloud_song_loaded
      @soundcloud_song_loaded = true
      $('#myPlayer')[0].width = "100%"
      $('#myPlayer')[0].height = "61px"
      soundcloud_player.api_load(@currentSong.url)
    else
      soundcloud_player.api_play()
     
  playSoundCloud: (song) ->
    @currentSong = song
    if !@soundcloud_started
      @soundcloud_started = true
      startSoundCloud(song.url)
    else
      @loadCurrentSoundCloud()
      
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
    if(@currentSong)
      @currentSong.play()
    else
      @playNext()

  skipCurrentSong: ->
    window.youtubePlaying = false
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