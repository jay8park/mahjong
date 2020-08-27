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


var PLAYER_LIST = {};
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(player){
  play_id++;
  player.id = play_id;
  player.name = "";
  player.status = false;
  player.deck = [];
  player.revealed = [];
  PLAYER_LIST[player.id] = player;
  player.emit('serverMsg',{
    id: player.id,
	});

  socket.on('disconnect', function(){
    delete PLAYER_LIST[player.id];  
  })

	socket.on('happy',function(data){
		console.log('happy because ' + data.reason);
	});



});
