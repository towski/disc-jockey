var
  //assert = require('assert'),
  http = require('http'),
  hello = require('./server_code')

hello.server.listen(9091);

var client = http.createClient('9091')

exports.testSomething = function(test){
  // test recv without a since fails
  client.request('GET', '/recv').on('response', function (response) {
    test.equal(400, response.statusCode);
    test.done();
  }).end()
};

exports.testSomethingElse = function(test){
  // test sending a message without a proper session id fails
  client.request('GET', '/send?id=1&text=hey').on('response', function (response) {
    test.equal(400, response.statusCode);
    test.done();
  }).end()
};

exports.testSomethingElse2 = function(test){
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

exports.testSomethingElse3 = function(test){
  client.request('GET', '/who').on('response', function (response) {
    response.on('data', function(data){
      var json = JSON.parse(data.toString())
      console.log(json)
      test.equal(["nic"][0], json.nicks[0])
      hello.server.close();
      test.done(); 
    });
  }).end();
}

exports.testSomethingElse4 = function(test){
  test.done();
}

//process.addListener('exit', function() {
//  console.log("Success");
//});
