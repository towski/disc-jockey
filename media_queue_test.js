var fs, jsdom, media_queue, window;
soundManager = {
  createSound: function(){ return {}; },
  play: function(){}
}
startSoundCloud = function(){
  $('body').append('<div id="myPlayer"></div>');
  soundcloud_player = {
    api_load: function(){},
    api_play: function(){}
  }
}
media_queue = require('./media_queue');
fs = require('fs');
jsdom = require('jsdom');
jsdom.defaultDocumentFeatures.ProcessExternalResources  = false
jsdom.defaultDocumentFeatures.FetchExternalResources = false
var assert = require('assert')
var testCase = require('nodeunit').testCase;
window = jsdom.jsdom().createWindow();
window.document.write(fs.readFileSync('index.html').toString())

setTimeout = function(callback, time){
  callback();
}

module.exports = testCase({
  setUp: function (callback) {
    jsdom.jQueryify(window, './jquery-1.2.6.min.js', function() {
      $ = window.$;
      callback();
    });
  },

  testWaitingYoutube: function(test){
    var queue = new media_queue.MediaQueue;
    queue.enableLocalPlayback();
    queue.queueYoutube({ text: 123, id: 1 });
    test.equal(0, queue.songs.length)
    test.equal("youtube", queue.currentSong.type)
    test.ok(queue.playback_started)
    test.done()
  },
  
  testStartedWithYoutube: function(test){
    var queue = new media_queue.MediaQueue;
    queue.queueYoutube({ text: 123, id: 1 });
    test.equal(1, queue.songs.length)
    test.equal(null, queue.currentSong)
    test.ok(!queue.playback_started)
    queue.enableLocalPlayback();
    test.equal(0, queue.songs.length)
    test.equal("youtube", queue.currentSong.type)
    test.ok(queue.playback_started)
    test.done()
  },
  
  testWaitingMP3: function(test){
    var queue = new media_queue.MediaQueue;
    queue.enableLocalPlayback();
    queue.queueMP3({ text: 123, id: 1, text: "file 01.mp3", artist: null });
    test.equal(0, queue.songs.length)
    test.equal("mp3", queue.currentSong.type)
    test.equal(0, $('#song_list li').length)
    test.ok(queue.playback_started)
    test.done()
  },
  
  testStartedWithMP3: function(test){
    var queue = new media_queue.MediaQueue;
    queue.queueMP3({ text: 123, id: 1, text: "file 01.mp3", artist: null });
    test.equal(1, queue.songs.length)
    test.equal(null, queue.currentSong)
    test.equal(1, $('#song_list li').length)
    test.ok(!queue.playback_started)
    queue.enableLocalPlayback();
    test.equal(0, queue.songs.length)
    test.equal("mp3", queue.currentSong.type)
    test.equal(0, $('#song_list li').length)
    test.ok(queue.playback_started)
    test.done()
  },
  
  testWaitingSoundCloud: function(test){
    var queue = new media_queue.MediaQueue;
    queue.enableLocalPlayback();
    queue.queueSoundCloud({ text: 123, id: 1, url: "file 01.mp3" });
    test.ok(queue.playback_started)
    test.equal(0, queue.songs.length)
    test.equal("soundcloud", queue.currentSong.type)
    queue.sound_cloud_registered = true;
    queue.loadCurrentSoundCloud();
    queue.loadCurrentSoundCloud();
    test.done()
  },
});
