var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");
var play_id = 0;

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
  play_id++;  
  socket.emit('serverMsg',{
    id: play_id,
	});

	socket.on('name',function(data){
		console.log(data.name);
	});
 
	
 
});
 
 
 
