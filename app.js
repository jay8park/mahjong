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
  "s1" : 0,
  "s2" : 0,
  "s3" : 0,
  "s4" : 0,
  "s5" : 0,
  "s6" : 0,
  "s7" : 0,
  "s8" : 0,
  "s9" : 0,

  "c1" : 0,
  "c2" : 0,
  "c3" : 0,
  "c4" : 0,
  "c5" : 0,
  "c6" : 0,
  "c7" : 0,
  "c8" : 0,
  "c9" : 0,

  "b1" : 0,
  "b2" : 0,
  "b3" : 0,
  "b4" : 0,
  "b5" : 0,
  "b6" : 0,
  "b7" : 0,
  "b8" : 0,
  "b9" : 0,

  "north" : 0,
  "east" : 0,
  "south" : 0,
  "west" : 0,
  "money" : 0,
  "blank" : 0,
  "center" : 0,
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
    // set the outOfTurn status
    if (PLAYERS[data.pID].active == true) {     // if player stole in turn, set outOfTurn to false
      PLAYERS[data.pID].outOfTurn = false;
    }
    else {
      PLAYERS[data.pID].outOfTurn = true;
    }

    // set the current active player's status to false
    for (var p in ROOMS[data.room].players) {     // note, p is just the index, doesn't actually give us the player's name
      if (ROOMS[data.room].players[p].active == true) {
        ROOMS[data.room].prevActive = ROOMS[data.room].players[p].id;    // set prevActive player
        ROOMS[data.room].players[p].active = false;
        console.log("active status of " + ROOMS[data.room].players[p].name + " is now: " + ROOMS[data.room].players[p].active);
        break;
      }
    }
    PLAYERS[data.pID].active = true;     // set active status of stealer to be true

    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
  });

  /**
    * @desc change current player's active status to false and the previous active player's active status to true
    * @param data = {string: pID}, {string: room} - player ID and room name
  */
  socket.on('active switch cancel', function(data){
    PLAYERS[data.pID].active = false;
    PLAYERS[ROOMS[data.room].prevActive].active = true;

    console.log("active status of " + PLAYERS[data.pID].name + " is now: " + PLAYERS[data.pID].active);
    console.log("active status of " + PLAYERS[ROOMS[data.room].prevActive].name + " is now: " + PLAYERS[ROOMS[data.room].prevActive].active);
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

      io.to(ROOMS[data.room].players[p].id).emit('display tiles', {
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

    io.to(data.pID).emit('display tiles', {
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
        ROOMS[data.room].discard[data.tile] += 1;     // add discarded tile into room's discard pile/list
        ROOMS[data.room].last = data.tile;      // set last discard tile
        break;
      }
    }
    ROOMS[data.room].steal = true; // players can now steal tiles from discard

    console.log("discard pile: ")
    console.log(ROOMS[data.room].discard);

    io.to(data.pID).emit('display tiles', {
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
    ROOMS[data.room].discard[ROOMS[data.room].last] -= 1;
    ROOMS[data.room].steal = false; // players cannot steal tiles from discard now
    ROOMS[data.room].prevLast = ROOMS[data.room].last;
    ROOMS[data.room].last = "";

    io.to(data.pID).emit('display tiles', {
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
    var identical = isIdentical(data.tiles, ROOMS[data.room].prevLast);

    if (data.tiles.length == 3) {
      // if the player stole out of turn, completed set must be identical
      if (PLAYERS[data.pID].outOfTurn && identical) {
        console.log("ITS IDENTICAL");
        completed = true;
      }
      // if player stole within turn, completed set can be identical or consecutive
      else if (!PLAYERS[data.pID].outOfTurn && (identical || isConsecutive(data.tiles, ROOMS[data.room].prevLast))) {
        console.log("IN TURN, & ITS CONSECUTIVE OR IDENTICAL");
        completed = true;
      }
    }
    // if there are 4 tiles, all needs to be identical to be a completed set
    if (data.tiles.length == 4 && identical) {
      completed  = true;
    }

    if (completed) {
      // remove tiles from hand
      for (var i = 0; i < data.tiles.length; i++) {
        for (var k = 0; k < PLAYERS[data.pID].tiles.length; k++) {
          if (PLAYERS[data.pID].tiles[k] == data.tiles[i]) {
            PLAYERS[data.pID].tiles.splice(k, 1);
            break;   // break out of this inner loop, and continue with outer loop
          }
        }
      }
      PLAYERS[data.pID].revealed.push(data.tiles);    // add completed set list to revealed list
      PLAYERS[data.pID].revealTileCount += data.tiles.length;

      io.to(data.pID).emit('display tiles', {
        tiles: PLAYERS[data.pID].tiles,
        message: "reveal"
      });   // return the list of tiles to the player's screen

      io.to(data.pID).emit('display tiles', {
        message: "revealed tiles",
        tiles: PLAYERS[data.pID].revealed
      });   // return the list of tiles to the player's screen
    }
    else {
      console.log("cannot complete set");
      io.to(data.pID).emit('player revealed tiles', {
        message: "cannot complete set"
      });   // print message on client side
    }

  });

  /**
    * @desc remove the stolen tile from hand,
    * return the discarded tile back to the discarded tile, and
    * set the steal flag to true
    * @param data = {string: pID}, {string: name}, {string: room} - player ID, player name, and room name
  */
  socket.on('cancel', function(data){
    console.log(data.name + " cancelling");

    // remove stolen tile from hand
    for (var i = 0; i < PLAYERS[data.pID].tiles.length; i++) {
      if (PLAYERS[data.pID].tiles[i] == ROOMS[data.room].prevLast) {
        PLAYERS[data.pID].tiles.splice(i, 1);
        break;
      }
    }

    // set the fields and properties
    ROOMS[data.room].last = ROOMS[data.room].prevLast;
    ROOMS[data.room].discard[ROOMS[data.room].last] += 1;
    ROOMS[data.room].prevLast = "";
    ROOMS[data.room].steal = true; // players can now steal tiles from discard

    io.to(data.pID).emit('display tiles', {
      tiles: PLAYERS[data.pID].tiles,
      message: "cancel"
    });   // return the list of tiles to the player's screen
  });

  /**
    * @desc check if total tile count is at least 14, and return respective message to client
    * @param data = {string: pID}, {string: name}, {string: room} - player ID, player name, and room name
  */
  socket.on('win', function(data){
    console.log(data.name + " won?");
    var possibleWin = false;
    if (PLAYERS[data.pID].tiles.length + PLAYERS[data.pID].revealTileCount >= 14) {
      possibleWin = true;
    }

    if (possibleWin) {
      // send to entire room
      io.to(data.room).emit('won', {
        name: data.name,
        tiles: PLAYERS[data.pID].tiles,
        revealed: PLAYERS[data.pID].revealed
      });
    }
    else {
      // send to player
      io.to(data.pID).emit('message', {
        message: "not enough tiles to win"
      });   // return the list of tiles to the player's screen
    }
  });

  /**
    * @desc reset game state
    * @param data = {string: room} - room name
  */
  socket.on('reset', function(data){
    console.log("resetting room: " + data.room);

    for (var i = 0; i < ROOMS[data.room].players.length; i++) {
      delete PLAYERS[ROOMS[data.room].players[i].id];
    }

    ROOMS[data.room].players = [];
    ROOMS[data.room].tiles = shuffle([...tiles]);
    ROOMS[data.room].discard = Object.assign({}, availableTiles);
    ROOMS[data.room].last = "";
    ROOMS[data.room].prevLast = "";
    ROOMS[data.room].steal = false;
    ROOMS[data.room].inplay = false;
    ROOMS[data.room].prevActive = "";

    io.to(data.room).emit('to finish');
  });

});


// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
  * @desc creates a Room object and adds to the ROOMS dict
  * @param {string} r - the room name
  * @return {Object} - the Room
 */
function createRoom(r){
  var Room = {};
  Room.id = r;
  Room.players = [];
  tilesCopy = [...tiles];
  Room.tiles = shuffle(tilesCopy);
  Room.discard = Object.assign({}, availableTiles);
  Room.last = "";   // last dicarded tile
  Room.prevLast = "";   // previously last discarded tile
  Room.steal = false;
  Room.inplay = false;
  Room.prevActive = "";   // should be player id rather than player name
  ROOMS[r] = Room;  //add room to list
  return Room;
}

/**
  * @desc creates a Player object and adds to the PLAYERS dict
  * @param {string} p - the player name
  * @param {string} s - socket id
  * @return {Object} - the Player
 */
function createPlayer(p, s){
  var Player = {};
  Player.id = s;
  Player.name = p;
  Player.tiles = [];
  Player.revealed = []; // list of list
  Player.active = false;
  Player.outOfTurn = false;
  Player.revealTileCount = 0;
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
  * @param {string} t - the tile that must be included in the array a
  * @return {boolean} - true if each tile is identical; if not, false
 */
function isIdentical(a, t) {
  var stolenIncluded = false;
  for (var i = 1; i < a.length; i++) {
    if (a[i] != a[0]) {       // check against the first tile
      return false;
    }
    if (a[i] == t) {        // check if stolen tile is included
      stolenIncluded = true;
    }
  }
  return stolenIncluded;
}

/**
  * @desc checks to see if each tile in the array is consecutive (within the same suite)
  * @param {Array} a - the list of tiles (string)
  * @param {string} t - the tile that must be included in the array a
  * @return {Array} - true if consecutive, false otherwise
 */
function isConsecutive(a, t) {
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
    // check if stolen tile is included
    if (a[i] == t) {
      stolenIncluded = true;
    }
  }
  return stolenIncluded;
}
