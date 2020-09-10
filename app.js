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
      createRoom(data.code);
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
    console.log("requested to join room: "+ data.room);
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

    socket.emit('joined', {
      message: mess
    });   //notify client to redirect or display error
  });

  /**
    * @desc creates a Player object
    * @param data = {string: room}, {string: name} - room name and player name
  */
  socket.on('newJoin', function(data){
    console.log("this is the socket id: " + socket.id);
    // this can be called by refreshing in waiting room, how handle edge cases
    if(ROOMS[data.room] && checkPlayer(data.room, data.name)){
      io.to(socket.id).emit('newPlay', {
        error: "refresh"
      });
    }
    else{
      if(!ROOMS[data.room]){
        createRoom(data.room);
      }
      var player = createPlayer(data.name, socket.id);
      ROOMS[data.room].players.push(player);  //add Player to room
      console.log("created room: " + JSON.stringify(ROOMS[data.room]));
      console.log("players: " + JSON.stringify(PLAYERS));
      socket.join(data.room, function(){
        io.to(data.room).emit('newPlay', {
          players: ROOMS[data.room].players
        });
      });   //notify the room
    }

  });

  /**
    * @desc checks requirements to start game, and starts game
    * @param data = {string: room} - room name
  */
  socket.on('startGame', function(data){
    //data = {room: ___}
    var start = false;
    //check if there are 4 players
    if(ROOMS[data.room].players.length == 4){
      start = true;
    }
    io.to(data.room).emit('start', {
      message: start,
      players: ROOMS[data.room].players
    }); //notify the room to start game
    ROOMS[data.room].inplay = true;
  });

  /**
    * @desc if a player gets disconnected (e.g. exits tab), remove player from ROOMS and PLAYERS
  */
  socket.on('disconnect', function(){
    console.log("disconnect");

    var room = "";
    var removed = [];
    var one = false;
    var index = -1;
    // find the appropriate room and index and update
    for (var r in ROOMS) {
      for (var i = 0; i < ROOMS[r].players.length; i++) {
        if (ROOMS[r].players[i].id == socket.id) {
          if(ROOMS[r].inplay){
            console.log("return to home, but room still exists...");
            // --- currently crashes the game (take back to home screen)
            // should disconnect all players from the game completely
            io.to(r).emit('newPlay', {
              error: "game in play."
            });
          }
          room = r;
          if(ROOMS[r].players.length == 1){
            //special case of one player in room
            one = true;
            console.log("special case called.");
            break;
          }
          index = i;
          break;
        }
      }
      // actually update the players array in ROOMS
      if(index >= 0){
        removed = ROOMS[r].players.splice(index, 1);
        //console.log("removed: " + JSON.stringify(removed));
      }
      break;
    }
    // if room exists, delete ROOM if there was only one player
    // notify the rest of the players in room tp update waiting room
    if (ROOMS[room]) {
      if(one == true){
        delete ROOMS[room];
      }
      else{
        io.to(room).emit('newPlay', {
          players: ROOMS[room].players
        });
      }
    }
    // always delete player from PLAYER list
    delete PLAYERS[socket.id];
    console.log("rooms: "+ JSON.stringify(ROOMS));
    console.log("players: "+ JSON.stringify(PLAYERS));
  });

  /**
    * @desc if a player clicks the "leave" button to leave the game, remove player from ROOMS and PLAYERS
    * @param data = {string: room}, {string: name} - room name and player name
  */
  // socket.on('leave', function(data){
  //   console.log(data.name + " is requesting to leave");
  //   // remove player from room
  //   var removed = []
  //   for (var i = 0; i < ROOMS[data.room].players.length; i++) {
  //     if (ROOMS[data.room].players[i].name == data.name) {
  //       removed = ROOMS[data.room].players.splice(i-1, 1);
  //       break;
  //     }
  //   }
  //   ROOMS[data.room].players = removed;

  //   delete PLAYERS[socket.id];  // remove player from PLAYERS

  //   socket.leave(data.room, function(){
  //     io.to(data.room).emit('newPlay', {
  //       players: ROOMS[data.room].players
  //     });   // notify the room the updated players list
  //   });   // leave/unsubscribe from room
  // });




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
        index = p;
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
    * @desc change current player's active status to false and the active status of the player who stole to true
    * @param data = {string: pID}, {string: room} - player ID and room name
  */
  socket.on('active switch steal', function(data){
    // set the current active player's status to false
    // also set the outOfTurn status
    for (var p in ROOMS[data.room].players) {
      if (ROOMS[data.room].players[p].active == true) {
        if (ROOMS[data.room].players[p].id == data.pID) {   // check to see if the stealer stole in turn or not
          ROOMS[data.room].players[p].outOfTurn = false;
        }
        else {
          ROOMS[data.room].players[p].outOfTurn = true;
        }

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
      ROOMS[data.room].players[p].tiles = deal(ROOMS[data.room].tiles).sort();   // deal 13 for each player
      // console.log(p);
      // console.log(deal(ROOMS[data.room].tiles));

      console.log(ROOMS[data.room].players[p].name + " has tiles: ");
      console.log(ROOMS[data.room].players[p].tiles);

      io.to(ROOMS[data.room].players[p].id).emit('player tiles', {
        tiles: ROOMS[data.room].players[p].tiles,
        message: "deal"
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
    PLAYERS[data.pID].tiles.sort();

    console.log(data.name + ' is drawing ' + draw);

    io.to(data.pID).emit('player tiles', {
      tiles: PLAYERS[data.pID].tiles,
      message: "draw"
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
      tiles: PLAYERS[data.pID].tiles,
      message: "discard"
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc steal the discarded tile
    * @param data = {string: pID}, {string: name}, {string: room} - player ID, player name, and room name
  */
  socket.on('steal', function(data){
    console.log(data.name + " is stealing discarded tile: " + ROOMS[data.room].last);

    PLAYERS[data.pID].tiles.push(ROOMS[data.room].last);
    PLAYERS[data.pID].tiles.sort();
    ROOMS[data.room].last = "";
    ROOMS[data.room].discard.pop();
    ROOMS[data.room].steal = true; // players can now steal tiles from discard

    io.to(data.pID).emit('player tiles', {
      tiles: PLAYERS[data.pID].tiles,
      message: "steal"
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc reveal completed set
    * @param data = {string: pID}, {string: name}, {string: room}, {Array: tiles} - player ID, player name, room name, array of tiles to reveal (string)
  */
  socket.on('reveal', function(data){
    console.log(data.name + " is revealing");

    // check if its a completed set
    var completed = false;
    var identical = isIdentical(data.tiles)

    if (data.tiles.length == 3) {
      // if the player stole out of turn, completed set must be identical
      if (PLAYERS[data.pID].outOfTurn && identical) {
        console.log("ITS IDENTICAL");
        completed = true;
      }
      // if player stole within turn, completed set can be identical or consecutive
      else if (!PLAYERS[data.pID].outOfTurn && (identical || isConsecutive(data.tiles))) {
        console.log("IN TURN, & ITS CONSECUTIVE OR IDENTICAL");
        completed = true;
      }
    }
    // if there are 4 tiles, all needs to be identical to be a completed set
    if (data.tiles.length == 4 && identical) {
      completed  = true;
    }

    if (completed) {
      // remove tiles from hand and into revealed
      // var removed = [];
      // for (var i = 0; i < PLAYERS[data.pID].tiles.length; i++) {
      //   if (PLAYERS[data.pID].tiles[i] == data.tile) {
      //     removed = PLAYERS[data.pID].tiles.splice(i, 1);   // remove tile from player's hand
      //     ROOMS[data.room].discard.push(data.tile);     // add discarded tile into room's discard pile/list
      //     ROOMS[data.room].last = data.tile;      // set last discard tile
      //     break;
      //   }
      // }

      io.to(data.pID).emit('player tiles', {
        tiles: PLAYERS[data.pID].tiles,
        message: "reveal"
      });   // return the list of tiles to the player's screen
    }
    else {
      console.log("cannot complete set");
    }

  });

});


// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
  * @desc creates a Room object and adds to the ROOMS list
  * @param {string} r - the room name
  * @return {Object} - the Room
 */
function createRoom(r){
  var Room = {};
  Room.id = r;
  Room.players = [];
  Room.discard = [];
  Room.last = "";
  Room.steal = false;
  Room.inplay = false;
  tilesCopy = [...tiles];
  Room.tiles = shuffle(tilesCopy);
  ROOMS[r] = Room;  //add room to list
  return Room;
}

/**
  * @desc creates a Player object and adds to the PLAYERS list
  * @param {string} p - the player name
  * @param {string} s - socket id
  * @return {Object} - the Player
 */
function createPlayer(p, s){
  var Player = {};
  Player.id = s;
  Player.name = p;
  Player.tiles = [];
  Player.revealed = [];
  Player.active = false;
  PLAYERS[Player.id] = Player;
  return Player;
}


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
  * @param {Array} a - the list of tiles (string) to be dealt
  * @return {Array} - list of the 13 tiles
 */
function deal(a) {
  var hand = []
  for (var i = 0; i < 13; i++) {
    hand.push(a.shift());
  }
  return hand;
}

/**
  * @desc checks to see if each tile in the array is identical
  * @param {Array} a - the list of tiles (string)
  * @return {boolean} - true if each tile is identical; if not, false
 */
function isIdentical(a) {
  for (var i = 1; i < a.length; i++) {
    if (a[i] != a[0]) {       // check against the first tile
      return false;
    }
  }
  return true;
}

/**
  * @desc checks to see if each tile in the array is consecutive (within the same suite)
  * @param {Array} a - the list of tiles (string)
  * @return {Array} - true if consecutive, false otherwise
 */
function isConsecutive(a) {
  a.sort();
  var suite = a[0].charAt(0);
  for (var i = 0; i < a.length-1; i++) {
    // check if its a special character tile (return false)
    if (a[i].length != 2) {
      return false;
    }
    // check suite
    if (a[i].charAt(0) != suite) {
      return false;
    }
    // check consecutive numbers
    if (parseInt(a[i+1].charAt(1)) - parseInt(a[i].charAt(1)) != 1) {
      return false;
    }

  }
  return true;
}
