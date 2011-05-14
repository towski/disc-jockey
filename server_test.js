var
  //assert = require('assert'),
  http = require('http'),
  hello = require('./server_code')
  fs = require('fs')

hello.server.listen(9091);

var client = http.createClient('9091')

exports.testSomething = function(test){
  // test recv without a since fails
  client.request('GET', '/recv').on('response', function (response) {
    test.equal(400, response.statusCode);
    test.done();
  }).end()
};

exports.testSendWithoutId = function(test){
  // test sending a message without a proper session id fails
  client.request('GET', '/send?id=1&text=hey').on('response', function (response) {
    test.equal(400, response.statusCode);
    test.done();
  }).end()
};

exports.testJoinSendAndReceive = function(test){
  // test join, then send a message, then receive a response
  client.request('GET', '/join?nick=nic').on('response', function (response) {
    response.on('data', function(data){
      var json = JSON.parse(data.toString())
      client.request('GET', '/send?id='+json.id+'&text=hey').on('response', function (response) {
        test.equal(200, response.statusCode)
        client.request('GET', '/recv?since=1').on('response', function (response) {
          response.on('data', function(data){
            test.equal(["hey"], JSON.parse(data.toString()).messages[1].text)
            test.done(); 
          });
          test.equal(200, response.statusCode);
        }).end()
      }).end()
    });
    test.equal(200, response.statusCode)
  }).end()
}

exports.testWho = function(test){
  client.request('GET', '/who').on('response', function (response) {
    response.on('data', function(data){
      var json = JSON.parse(data.toString())
      test.equal(["nic"][0], json.nicks[0])
      test.done(); 
    });
  }).end();
}

exports.testSubmitBadYoutubeLink = function(test){
  hello.server.channel.messages = [] 
  var request = client.request('POST', '/submit_youtube_link', {"content-type":'urlencoded'}).on('response', function (response) {
    test.equal(200, response.statusCode);
  })
  request.write("youtube_link=a%2Cd")
  request.end()
  test.deepEqual([], hello.server.channel.messages);
  test.done(); 
}

exports.testSubmitGoodYoutubeLink = function(test){
  hello.server.channel.messages = [] 
  var request = client.request('POST', '/submit_youtube_link', {"content-type":'urlencoded'}).on('response', function (response) {
    test.equal(200, response.statusCode);
    test.ok(hello.server.channel.messages.length > 0);
    test.done();
  })
  request.write("youtube_link=" + escape("http://www.youtube.com/watch?v=Lv-GLbumJIA"))
  request.end()
}

exports.testSubmitSoundcloudLink = function(test){
  hello.server.channel.messages = [] 
  var request = client.request('POST', '/submit_soundcloud_link', {"content-type":'urlencoded'}).on('response', function (response) {
    test.equal(200, response.statusCode);
    test.ok(hello.server.channel.messages.length > 0);
    test.done();
  })
  request.write("soundcloud_link=" + escape("http://soundcloud.com/getter_dubstep/mt-eden-sierre-leone-getter"))
  request.end()
}

exports.testSubmitNonFile = function(test){
  hello.server.channel.messages = [] 
  var request = client.request('POST', '/submit_file', {"content-type":'urlencoded'}).on('response', function (response) {
    test.equal(200, response.statusCode);
    test.deepEqual([], hello.server.channel.messages);
    test.done();
  })
  request.write("song_selection=" + escape("01 Booger Pants.mp3"))
  request.end()
}

exports.testSubmitFile = function(test){
  hello.server.channel.messages = []
  var request = client.request('POST', '/submit_file', {"content-type":'urlencoded'}).on('response', function (response) {
    test.equal(200, response.statusCode);
    test.ok(hello.server.channel.messages.length > 0);
    test.done();
  })
  request.write("song_selection=" + escape("01 Synthy.mp3"))
  request.end()
}

exports.testUploadFile = function(test){
  hello.server.channel.messages = []
  fs.unlink("tmp/thefile.mp3")
  fs.unlink("tags/thefile.mp3")
  var fileCreated = false;  
  var tagsCreated = false;
  var headers = {
    "Content-Type":"multipart/form-data; boundary=----randomstring1337"
  }
  var request = client.request('POST', '/upload', headers).on('response', function (response) {
    test.equal(200, response.statusCode);
  })
  request.write("------randomstring1337\r\n")
  request.write('Content-Disposition: form-data; name="upload"; filename="thefile.mp3"\r\n')
  request.write('Content-Type: application/octet-stream"\r\n')
  request.write('\r\n')
  request.write('hey this is the file\r\n')
  request.write('------randomstring1337--')
  request.end()
  fs.watchFile("tmp/thefile.mp3", function (curr, prev) {
    fileCreated = true;
    if(fileCreated && tagsCreated){
      test.done()
    }
  });
  fs.watchFile("tags/thefile.mp3", function (curr, prev) {
    var tagsCreated = true;
    if(fileCreated && tagsCreated){
      test.done()
    }
  });
}

exports.testUploadMultipleFiles = function(test){
  hello.server.channel.messages = []
  fs.unlink("tmp/thefile.mp3")
  fs.unlink("tags/thefile.mp3")
  fs.stat("boogoo")
  var headers = {
    "Content-Type":"multipart/form-data; boundary=----randomstring1337",
    "Connection":"keep-alive"
  }
  var request = client.request('POST', '/upload', headers).on('response', function (response) {
    test.equal(200, response.statusCode);
  })
  request.write("------randomstring1337\r\n")
  request.write('Content-Disposition: form-data; name="upload"; filename="thefile.mp3"\r\n')
  request.write('Content-Type: application/octet-stream"\r\n')
  request.write('\r\n')
  request.write('hey this is the file\r\n')
  request.write('------randomstring1337')
  request.write('Content-Disposition: form-data; name="upload"; filename="thefile2.mp3"\r\n')
  request.write('Content-Type: application/octet-stream"\r\n')
  request.write('\r\n')
  request.write('another file\r\n')
  request.write('------randomstring1337--')
  request.end()
}

//process.addListener('exit', function() {
//  console.log("Success");
//});
