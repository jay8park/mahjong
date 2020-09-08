// ----------------------------------------------------------------------------
// SERVER SET UP
// ----------------------------------------------------------------------------
var express = require('express');
var app = express();
var serv = require('http').Server(app);
var path = require('path');
serv.listen(2000);
var io = require('socket.io').listen(serv);

// ----------------------------------------------------------------------------
// URLS
// ----------------------------------------------------------------------------
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

console.log("Server started.");

// ----------------------------------------------------------------------------
// GAME SET UP
// ----------------------------------------------------------------------------
var PLAYERS = {};
var ROOMS = {};
var availableTiles = {
  "s1" : 4,
  "s2" : 4,
  "s3" : 4,
  "s4" : 4,
  "s5" : 4,
  "s6" : 4,
  "s7" : 4,
  "s8" : 4,
  "s9" : 4,

  "c1" : 4,
  "c2" : 4,
  "c3" : 4,
  "c4" : 4,
  "c5" : 4,
  "c6" : 4,
  "c7" : 4,
  "c8" : 4,
  "c9" : 4,

  "b1" : 4,
  "b2" : 4,
  "b3" : 4,
  "b4" : 4,
  "b5" : 4,
  "b6" : 4,
  "b7" : 4,
  "b8" : 4,
  "b9" : 4,

  "north" : 4,
  "east" : 4,
  "south" : 4,
  "west" : 4,
  "money" : 4,
  "blank" : 4,
  "center" : 4,
};
var tiles = ["s1", "s1", "s1", "s1", "s2", "s2", "s2", "s2", "s3", "s3", "s3", "s3", "s4", "s4", "s4", "s4", "s5", "s5", "s5", "s5", "s6", "s6", "s6", "s6", "s7", "s7", "s7", "s7", "s8", "s8", "s8", "s8", "s9", "s9", "s9", "s9", "c1", "c1", "c1", "c1", "c2", "c2", "c2", "c2", "c3", "c3", "c3", "c3", "c4", "c4", "c4", "c4", "c5", "c5", "c5", "c5", "c6", "c6", "c6", "c6", "c7", "c7", "c7", "c7", "c8", "c8", "c8", "c8", "c9", "c9", "c9", "c9", "b1", "b1", "b1", "b1", "b2", "b2", "b2", "b2", "b3", "b3", "b3", "b3", "b4", "b4", "b4", "b4", "b5", "b5", "b5", "b5", "b6", "b6", "b6", "b6", "b7", "b7", "b7", "b7", "b8", "b8", "b8", "b8", "b9", "b9", "b9", "b9", "north", "north", "north", "north", "east", "east", "east", "east", "south", "south", "south", "south", "west", "west", "west", "west", "money", "money", "money", "money", "blank", "blank", "blank", "blank", "center", "center", "center", "center"];

// ----------------------------------------------------------------------------
// GAME STATUSES
// ----------------------------------------------------------------------------
io.sockets.on('connection', function(socket){
  /**
    * @desc creates a new room if the room does not already exist
    * @param data = {string: code} - code is the room password/code
  */
  socket.on('createRoom', function(data){
    console.log("requested to make room: " + data.code);
    var madeRoom = false;

    if(!ROOMS[data.code]){
      var Room = {};
      Room.id = data.code;
      Room.players = [];
      Room.tiles = shuffle(tiles);
      Room.discard = [];
      Room.last = "";
      Room.steal = false;

      ROOMS[data.code] = Room;  //add room to list
      madeRoom = true;  //made room
    }
    //notify client to redirect or display error
    socket.emit('roomCreated', {
      message: madeRoom
    });   
  });

  /**
    * @desc players can join an existing room
    * also checks for existing name, if the room is full, and other error checks
    * @param data = {string: room}, {string: name} - room name and player name
  */
  socket.on('joinRoom', function(data){
    console.log("requested to join room: "+data.room);
    var mess = "";
    if(!ROOMS[data.room]){
      mess = "Room does not exist.";
    }
    else if(ROOMS[data.room].players.length == 4){
      mess = "Room is full."
    }
    else if(checkPlayer(data.room, data.name)){
      mess = "Player name is taken.";
    }
    else{
      mess = "good";
    }
    //notify client to redirect or display error
    socket.emit('joined', { message: mess });   
  });

  /**
    * @desc creates a Player object
    * @param data = {string: room}, {string: name} - room name and player name
  */
  socket.on('newJoin', function(data){
    console.log("this is the socket id: " + socket.id);
    if(!ROOMS[data.room]){
      window.location.href = '/';
    }
    else if(checkPlayer(data.room, data.name)){
      
    }
    var Player = {};
    Player.id = socket.id;
    Player.name = data.name;
    Player.tiles = [];
    Player.revealed = [];
    Player.active = false;

    PLAYERS[Player.id] = Player;
    ROOMS[data.room].players.push(Player);  //add Player and socket to room

    socket.join(data.room, function(){
      io.to(data.room).emit('newPlay', {
        players: ROOMS[data.room].players
      });
    });   //notify the room
  });

  /**
    * @desc players can join an existing room
    * also checks for existing name, if the room is full, and other error checks
    * @param data = {string: room}, {string: name} - room name and player name
  */
  socket.on('startGame', function(data){
    //data = {room: ___}
    var start = false;
    //check if there are 4 players
    if(ROOMS[data.room].players.length == 4){
      start = true;
    }
    io.to(data.room).emit('start', {
      message: start
    }); //notify the room to start game
  });

  /**
    * @desc if a player gets disconnected (e.g. exits tab), remove player from ROOMS and PLAYERS
  */
  socket.on('disconnect', function(){
    console.log("disconnect");

    // remove player from room
    var room = "";
    var removed = [];
    for (var r in ROOMS) {
      for (var i = 0; i < ROOMS[r].players.length; i++) {
        if (ROOMS[r].players[i].id == socket.id) {
          room = r;
          removed = ROOMS[r].players.splice(i-1, 1);
          break;
        }
      }
    }
    // if room exists, update players in ROOMS and PLAYERS dict
    if (ROOMS[room]) {
      ROOMS[room].players = removed;
      delete PLAYERS[socket.id];
      io.to(room).emit('newPlay', {
        players: ROOMS[room].players
      });
    }
  });

  /**
    * @desc if a player clicks the "leave" button to leave the game, remove player from ROOMS and PLAYERS
    * @param data = {string: room}, {string: name} - room name and player name
  */
  socket.on('leave', function(data){
    console.log(data.name + " is requesting to leave");
    // remove player from room
    var removed = []
    for (var i = 0; i < ROOMS[data.room].players.length; i++) {
      if (ROOMS[data.room].players[i].name == data.name) {
        removed = ROOMS[data.room].players.splice(i-1, 1);
        break;
      }
    }
    ROOMS[data.room].players = removed;

    delete PLAYERS[socket.id];  // remove player from PLAYERS

    socket.leave(data.room, function(){
      io.to(data.room).emit('newPlay', {
        players: ROOMS[data.room].players
      });   // notify the room the updated players list
    });   // leave/unsubscribe from room
  });




  /**
    * @desc change player's active status to true
    * @param data = {string: pID}, {string: name} - player ID and player name
  */
  socket.on('active true', function(data){
    PLAYERS[data.pID].active = true;
    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
  });

  /**
    * @desc change player's active status to false
    * @param data = {string: pID}, {string: name} - player ID and player name
  */
  socket.on('active false', function(data){
    PLAYERS[data.pID].active = false;
    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
  });

  /**
    * @desc change player's active status to false and the next player's active status to true if the status changes while they play in turn
    * @param data = {string: pID}, {string: room} - player ID and room name
  */
  socket.on('active switch', function(data){
    PLAYERS[data.pID].active = false;
    var index = 0;
    for (var p in ROOMS[data.room].players) {
      if (ROOMS[data.room].players[p].id == data.pID) {   // find the current player's index in order to get the next player's index
        index = parseInt(p);
        break;
      }
    }
    var nextPlayerIndex = 0;
    if (index != ROOMS[data.room].players.length - 1) { // if the current player is the last item in the list, go back to beginning of list
      nextPlayerIndex = parseInt(index) + 1;
    }

    ROOMS[data.room].players[nextPlayerIndex].active = true; // set next player's active status to true

    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
    console.log("active status of " + ROOMS[data.room].players[nextPlayerIndex].name + " is now: " + ROOMS[data.room].players[nextPlayerIndex].active);
  });

  /**
    * @desc change player's active status to false and the next player's active status to true if the status changes bc of a steal
    * @param data = {string: pID}, {string: room} - player ID and room name
  */
  socket.on('active switch steal', function(data){
    // set the current active player's status to false
    for (var p in ROOMS[data.room].players) {
      if (ROOMS[data.room].players[p].active == true) {
        ROOMS[data.room].players[p].active = false;
        console.log("active status of " + ROOMS[data.room].players[p].name + " is now: " + ROOMS[data.room].players[p].active);
        break;
      }
    }
    PLAYERS[data.pID].active = true;     // set active status of stealer to be true

    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
  });




  /**
    * @desc deal cards to every player in the room
    * @param data = {string: room} - room name
  */
  socket.on('deal', function(data){
    console.log("dealing...");

    for (var p in ROOMS[data.room].players) {
      ROOMS[data.room].players[p].tiles = deal(ROOMS[data.room].tiles);   // deal 13 for each player

      console.log(ROOMS[data.room].players[p].name + " has tiles: ");
      console.log(ROOMS[data.room].players[p].tiles);

      io.to(ROOMS[data.room].players[p].id).emit('player tiles', {
        tiles: ROOMS[data.room].players[p].tiles
      });   // return the list of tiles to each player's perspective screen
    }
  });




  /**
    * @desc draw a tile from the room's tiles list (take from top)
    * @param data = {string: pID}, {string: name}, {string: room} -player ID, player name, and room name
  */
  socket.on('draw', function(data){
    ROOMS[data.room].steal = false;     // players cannot steal tiles from discard when active player draws a tile
    var draw = ROOMS[data.room].tiles.shift();
    PLAYERS[data.pID].tiles.push(draw);

    console.log(data.name + ' is drawing ' + draw);

    io.to(data.pID).emit('player tiles', {
      tiles: PLAYERS[data.pID].tiles
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc discard a tile from player's hand/tiles
    * @param data = {string: pID}, {string: name}, {string: tile}, {string: room} - player ID, player name, tile to discard, and room name
  */
  socket.on('discard', function(data){
    console.log(data.name + " is discarding tile: " + data.tile);

    var removed = [];
    for (var i = 0; i < PLAYERS[data.pID].tiles.length; i++) {
      if (PLAYERS[data.pID].tiles[i] == data.tile) {
        removed = PLAYERS[data.pID].tiles.splice(i, 1);   // remove tile from player's hand
        ROOMS[data.room].discard.push(data.tile);     // add discarded tile into room's discard pile/list
        ROOMS[data.room].last = data.tile;      // set last discard tile
        break;
      }
    }

    ROOMS[data.room].steal = true; // players can now steal tiles from discard

    io.to(data.pID).emit('player tiles', {
      tiles: PLAYERS[data.pID].tiles
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc steal the discarded tile
    * @param data = {string: pID}, {string: name}, {string: room} - player ID, player name, and room name
  */
  socket.on('steal', function(data){
    console.log(data.name + " is stealing discarded tile: " + ROOMS[data.room].last);

    PLAYERS[data.pID].tiles.push(ROOMS[data.room].last);
    ROOMS[data.room].last = "";
    ROOMS[data.room].discard.pop();
    ROOMS[data.room].steal = true; // players can now steal tiles from discard

    io.to(data.pID).emit('player tiles', {
      tiles: PLAYERS[data.pID].tiles
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc reveal completed set
    * @param data = {string: pID}, {string: name}, {string: room} - player ID, player name, and room name
  */
  // socket.on('reveal', function(data){
  //   console.log(data.name + " is stealing discarded tile: " + ROOMS[data.room].last);
  //
  //   PLAYERS[data.pID].tiles.push(ROOMS[data.room].last);
  //   ROOMS[data.room].last = "";
  //   ROOMS[data.room].discard.pop();
  //   ROOMS[data.room].steal = true; // players can now steal tiles from discard
  //
  //   io.to(data.pID).emit('player tiles', {
  //     tiles: PLAYERS[data.pID].tiles
  //   });   // return the list of tiles to the player's screen
  // });

});


// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
  * @desc checks if the player's name already exists in the room
  * @param {string} r - the room name
  * @param {string} n - the player's name
  * @return {bool} - true or false
 */
function checkPlayer(r, n){
  var plays = ROOMS[r].players;
  for(var i in plays){
    if(plays[i].name == n){
      return true;
    }
  }
  return false;
}

 /**
   * @desc shuffles an array using the Fisher-Yates shuffle algorithm
   * @param {Array} a
   * @return {Array} a - the shuffled array
  */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/**
  * @desc deals 13 tiles (take out 13 items from the top of the list/array)
  * @param {Array} a - the list of tiles to be dealt
  * @return {Array} - list of the 13 tiles
 */
function deal(a) {
    var hand = []
    for (var i = 0; i < 13; i++) {
      hand.push(a.shift());
    }
    return hand;
}
