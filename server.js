HOST = null // localhost
//PORT = 8003
PORT = 9817

var server_code = require('./server_code')

server_code.server.listen(Number(process.env.PORT || PORT), HOST)