var express = require('express');
var app = express();
var serv = require('http').Server(app);
var path = require('path');

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/join.html');
});
app.get('/game', function(req, res){
  if(!req.query.room || !req.query.name){
    res.redirect("/");
  }
  else{
    res.sendFile(path.join(__dirname, '/client/game.html'));
  }
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var PLAYERS = {};
var ROOMS = {};
var playID = 0;
var io = require('socket.io').listen(serv);
io.sockets.on('connection', function(socket){

  socket.on('createRoom', function(data){
    //data = {code: }
    //check for existing Room, make new Room
    console.log("requested to make room: " + data.code);
    var madeRoom = false;
    if(!ROOMS[data.code]){
      var Room = {}; 
      Room.id = data.code;
      Room.players = [];
      ROOMS[data.code] = Room; //add room to list
      madeRoom = true; //made room
    }
    socket.emit('roomCreated', {message:madeRoom});
    //notify client to redirect or display error
  });
  socket.on('joinRoom', function(data){
    //data = {room: __ ; name: ___; }
    //check for existing Rooms, check Room for Players
    console.log("requested to join room: "+data.room);
    var mess = "";
    if(!ROOMS[data.room]){
      mess = "room does not exist.";
    }
    else if(checkPlayer(data.room, data.name)){
      mess = "player name is taken.";
    }
    else if(ROOMS[data.room].players.length == 4){
      mess = "room is full."
    }
    else{
      mess = "good";
    }
    socket.emit('joined', { message: mess });
    //notify client to redirect or display error
  });
  socket.on('newJoin', function(data){
    //data = {room: __ ; name: ___; }
    //create player
    console.log("this is the socket id: " + socket.id);
    //playID++;
    //socket.id = playID;
    var Player = {};
    Player.id = socket.id;
    Player.name = data.name;    
    PLAYERS[Player.id] = Player;
    //add Player and socket to room
    ROOMS[data.room].players.push(Player);
    socket.join(data.room, function(){
      io.to(data.room).emit('newPlay', { players: ROOMS[data.room].players });
    }); //data.room

    //notify the room 
  });
  socket.on('startGame', function(data){
    //data = {room: ___}
    var start = false;
    //check if there are 4 players
    if(ROOMS[data.room].players.length == 4){
      start = true;
    }
    io.to(data.room).emit('start', {message: start});
    //notify the room to start game
  });
  socket.on('disconnect', function(){
    delete PLAYERS[socket.id];  
  });


});

function checkPlayer(r, n){
  var plays = ROOMS[r].players;
  for(var i in plays){
    if(plays[i].name == n){
      return true;
    }
  }
  return false;
}
