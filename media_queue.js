(function() {
  var MediaQueue, exports;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  exports = exports != null ? exports : this;
  exports.MediaQueue = MediaQueue = (function() {
    function MediaQueue() {
      this.songs = [];
      this.playback_started = false;
      this.currentSong = null;
      this.local_playback = false;
      this.soundcloud_started = false;
      this.soundcloud_registered = false;
      this.current_id = null;
    }
    MediaQueue.prototype.queueYoutube = function(video) {
      video.type = 'youtube';
      video.vid = video.text;
      this.songs = this.songs.concat(video);
      $('#song_list').prepend("<li id='song" + video.id + "'>youtube video <a href='" + video.url + "' target='_blank'>" + video.title + "</a> <a href='#' onclick='window.media_queue.removeSongs(" + video.id + "); $(this.parentElement).remove(); return false'>x</a></li>");
      if (this.local_playback && !this.playback_started) {
        return this.playNext();
      }
    };
    MediaQueue.prototype.queueSoundCloud = function(array) {
      this.songs = this.songs.concat({
        type: 'soundcloud',
        url: array.text,
        id: array.id
      });
      $('#song_list').prepend("<li id='song" + array.id + "'>soundcloud url " + array.text + " <a href='#' onclick='window.media_queue.removeSongs(" + array.id + "); $(this.parentElement).remove(); return false'>x</a></li>");
      if (this.local_playback && !this.playback_started) {
        return this.playNext();
      }
    };
    MediaQueue.prototype.queueMP3 = function(song) {
      song.type = 'mp3';
      song.file = song.text;
      this.songs = this.songs.concat(song);
      $('#song_list').prepend("<li id='song" + song.id + "'>" + song.artist + " - " + song.album + " - " + song.title + " <a href='#' onclick='window.media_queue.removeSongs(" + song.id + "); $(this.parentElement).remove(); return false'>x</a></li>");
      if (this.local_playback && !this.playback_started) {
        this.playNext();
      }
      return song;
    };
    MediaQueue.prototype.clearCurrentSong = function() {
      if (this.currentSong) {
        if (this.currentSong.type === "mp3") {
          this.currentSong.stop();
          this.currentSong.destruct();
          $('#current_song').html("");
        } else if (this.currentSong.type === "youtube") {
          $("#youtube_mother").hide();
        } else if (this.currentSong.type === "soundcloud") {
          if (this.sound_cloud_registered) {
            soundcloud_player.api_stop();
          }
          this.soundcloud_song_loaded = false;
          $('#myPlayer')[0].width = "1px";
          $('#myPlayer')[0].height = "1px";
        }
        return this.currentSong = null;
      }
    };
    MediaQueue.prototype.playNext = function() {
      var song;
      song = this.songs[0];
      this.songs = this.songs.splice(1, this.songs.length);
      $("#song" + this.current_id).removeClass('current');
      if (song) {
        $("#song" + song.id).addClass('current');
        this.current_id = song.id;
        Cookie.set('current_id', this.current_id);
        this.playback_started = true;
        if (song.type === 'youtube') {
          return this.readyVideoPlayer(song);
        } else if (song.type === 'mp3') {
          return this.playSong(song);
        } else if (song.type === 'soundcloud') {
          return this.playSoundCloud(song);
        }
      } else {
        return this.playback_started = false;
      }
    };
    MediaQueue.prototype.readyVideoPlayer = function(song) {
      this.currentSong = song;
      return $("#youtube_mother").show();
    };
    MediaQueue.prototype.playCurrentVideo = function() {
      return ytswf.loadVideoById(this.currentSong.vid);
    };
    MediaQueue.prototype.loadCurrentSoundCloud = function() {
      if (!this.soundcloud_song_loaded) {
        this.soundcloud_song_loaded = true;
        $('#myPlayer')[0].width = "100%";
        $('#myPlayer')[0].height = "61px";
        return soundcloud_player.api_load(this.currentSong.url);
      } else {
        return soundcloud_player.api_play();
      }
    };
    MediaQueue.prototype.playSoundCloud = function(song) {
      this.currentSong = song;
      if (!this.soundcloud_started) {
        this.soundcloud_started = true;
        return startSoundCloud(song.url);
      } else {
        return this.loadCurrentSoundCloud();
      }
    };
    MediaQueue.prototype.playSong = function(song) {
      $('#current_song').html("" + song.artist + " - " + song.album + " - " + song.title);
      this.currentSong = soundManager.createSound({
        id: song.file,
        url: "/tmp/" + escape(song.file),
        onfinish: __bind(function() {
          this.clearCurrentSong();
          return this.playNext();
        }, this)
      });
      this.currentSong.type = "mp3";
      return soundManager.play(song.file);
    };
    MediaQueue.prototype.stopLocalPlayback = function() {
      if (this.currentSong) {
        if (this.currentSong.type === "mp3") {
          this.currentSong.stop();
          this.local_playback = false;
          this.playback_started = false;
          return $("#toggle_playback").html("Play");
        }
      }
    };
    MediaQueue.prototype.enableLocalPlayback = function() {
      this.local_playback = true;
      if (this.currentSong) {
        return this.currentSong.play();
      } else {
        return this.playNext();
      }
    };
    MediaQueue.prototype.skipCurrentSong = function() {
      window.youtubePlaying = false;
      this.clearCurrentSong();
      return setTimeout(__bind(function() {
        return this.playNext();
      }, this), 0);
    };
    MediaQueue.prototype.togglePlayback = function() {
      if (this.local_playback) {
        return this.stopLocalPlayback();
      } else {
        this.enableLocalPlayback();
        return $("#toggle_playback").html("Stop");
      }
    };
    MediaQueue.prototype.removeSongs = function(id) {
      var song, songs, _i, _len, _results;
      songs = this.songs.filter(function(obj) {
        return obj.id === id;
      });
      _results = [];
      for (_i = 0, _len = songs.length; _i < _len; _i++) {
        song = songs[_i];
        _results.push(this.songs.remove(this.songs.indexOf(song)));
      }
      return _results;
    };
    return MediaQueue;
  })();
}).call(this);
