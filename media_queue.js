(function() {
  var MediaQueue;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  MediaQueue = (function() {
    function MediaQueue() {
      this.songs = [];
      this.playback_started = false;
      this.currentSong = null;
      this.local_playback = false;
    }
    MediaQueue.prototype.queueYoutube = function(array) {
      return this.songs = this.songs.concat({
        type: 'youtube',
        vid: array.text,
        id: array.id
      });
    };
    MediaQueue.prototype.queueMP3 = function(array) {
      var song;
      song = {
        type: 'mp3',
        file: array.text,
        id: array.id
      };
      this.songs = this.songs.concat(song);
      return song;
    };
    MediaQueue.prototype.clearCurrentSong = function() {
      if (this.currentSong) {
        if (this.currentSong.type === "mp3") {
          this.currentSong.stop();
          this.currentSong.destruct();
          $('#current_song').html("");
        } else if (this.currentSong.type === "youtube") {
          console.log("hiding");
          $("#youtube_mother").hide();
        }
        return this.currentSong = null;
      }
    };
    MediaQueue.prototype.playNext = function() {
      var song;
      console.log("playing next");
      song = this.songs[0];
      this.songs = this.songs.splice(1, this.songs.length);
      if (song) {
        $('#song_list li:first-child').remove();
        if (song.type === 'youtube') {
          return this.readyVideoPlayer(song);
        } else if (song.type === 'mp3') {
          return this.playSong(song);
        }
      }
    };
    MediaQueue.prototype.readyVideoPlayer = function(song) {
      this.currentSong = song;
      return $("#youtube_mother").show();
    };
    MediaQueue.prototype.playCurrentVideo = function() {
      return ytswf.loadVideoById(this.currentSong.vid);
    };
    MediaQueue.prototype.playSong = function(song) {
      $('#current_song').html(song.file);
      this.currentSong = soundManager.createSound({
        id: song.file,
        url: "/tmp/" + escape(song.file),
        onfinish: __bind(function() {
          this.clearCurrentSong();
          return this.playNext();
        }, this)
      });
      console.log(this.currentSong.type);
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
      this.playback_started = true;
      if (this.currentSong) {
        return this.currentSong.play();
      } else {
        return this.playNext();
      }
    };
    MediaQueue.prototype.skipCurrentSong = function() {
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
    MediaQueue.prototype.songFinishCallback = function() {
      var song;
      if (this.currentSong) {
        this.currentSong.destruct();
        this.currentSong = null;
      }
      if (this.local_playback) {
        song = this.songs[0];
        this.songs = this.songs.splice(1, this.songs.length);
        if (song) {
          $('#song_list li:first-child').remove();
          $('#current_song').html(song.text);
          this.currentSong = soundManager.createSound({
            id: song.text,
            url: "/tmp/" + escape(song.text),
            onfinish: this.songFinishCallback
          });
          return soundManager.play(song.text);
        } else {
          $('#current_song').html("");
          return this.playback_started = false;
        }
      }
    };
    MediaQueue.prototype.startPlayback = function(message) {
      var first_song, startSong;
      if (!this.playback_started && this.local_playback) {
        this.playback_started = true;
        first_song = message;
        startSong = function() {
          $('#song_list li:first-child').remove();
          $('#current_song').html(first_song.text);
          this.currentSong = soundManager.createSound({
            id: first_song.text,
            url: "/tmp/" + escape(first_song.text),
            onfinish: this.songFinishCallback
          });
          return this.currentSong.play(first_song.text);
        };
        return soundManager.onready(startSong);
      } else {
        return this.songs = this.songs.concat(message);
      }
    };
    MediaQueue.prototype.removeSongs = function(id) {
      var song, songs, _i, _len, _results;
      songs = this.songs.filter(function(obj) {
        return obj.id === id;
      });
      console.log(songs);
      console.log(id);
      _results = [];
      for (_i = 0, _len = songs.length; _i < _len; _i++) {
        song = songs[_i];
        _results.push(this.songs.remove(this.songs.indexOf(song)));
      }
      return _results;
    };
    return MediaQueue;
  })();
  window.MediaQueue = MediaQueue;
}).call(this);
