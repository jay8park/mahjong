var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/waiting', express.static(__dirname + '/client/anotha.html'));
app.use('/join', express.static(__dirname + '/client/join.html'));
app.get('/game', function(req, res) {
  console.log("inside game");
  if (!req.query.code) {
    console.log("index");
    res.redirect('/client/index.html');
  }
  else if (!req.query.name) {
    console.log("join");
    res.redirect('/join');
  }
  else {
    console.log("else");
    res.sendFile(require('path').join(__dirname, '/client/anotha.html'));
  }
})
//app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");
var play_id = 0;


var PLAYER_LIST = {};
const ROOMS = {}
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(player){
  play_id++;
  player.id = play_id;

  player.status = false;
  player.deck = [];
  player.revealed = [];

  player.emit('serverMsg',{
    id: player.id,
  });

  player.on('name',function(data){
    console.log(data.name);
    player.name = data.name;
  });

  player.on('create', function(data){
    console.log("created");
    const room = {
      id: data.roomName,
      sockets: []
    };
    ROOMS[room.id] = room;
    console.log("name: " + data.name + " room: " + room);
    player.emit('room created', {
      room: room,
      name: data.name
    });
  });

  PLAYER_LIST[player.id] = player;

  player.on('disconnect', function(){
    delete PLAYER_LIST[player.id];
  });


});

// var socket = io();
// socket.on('room created', function(data){
//   console.log("hey");
//   console.log(data.id);
// })
