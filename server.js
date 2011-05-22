HOST = null // localhost
//PORT = 8003
PORT = 9817

var mongodb = require('mongodb');
var server_code = require('./server_code')
var fs = require('fs')
var mongo_config;

if(process.env.NODE_ENV == "local"){
  mongo_config = JSON.parse(fs.readFileSync('config.json.local')).mongo;
}else{
  mongo_config = JSON.parse(fs.readFileSync('config.json')).mongo;
}

mongodb.connect(mongo_config, function(error, db){
  if (error) {
    throw error
  }
  var server = new server_code.Server(db)
  server.listen(Number(process.env.PORT || PORT), HOST)
})