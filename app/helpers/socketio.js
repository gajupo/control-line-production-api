const io = require('socket.io');

function ConfigureIO(httpServer) {
  return io(httpServer);
}

module.exports.ConfigureIO = ConfigureIO;
module.exports.io = io;
