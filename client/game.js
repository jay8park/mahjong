// ----------------------------------------------------------------------------
// SET UP
// ----------------------------------------------------------------------------
const socket = io();
var Room = "";
var Name = "";
var Active = false; // is it the current players turn or not
var Players = []; // list of names of other players in the same room; order is [me, left, top, right]
var State = "Waiting" // state of current player to determine which buttons are active; 
// Waiting (can steal), InTurn (steal or draw), Discard (choose a card), Reveal (or cancel after steal), Four (special case, only draw)

//getting URL query data
var search = window.location.search.substring(1);
var params = search.split("&");
for(var item in params){
    var sides = params[item].split("=");
    if(sides[0] == "room"){
        Room = sides[1];
    }
    else if(sides[0] == "name"){
        Name = sides[1];
    }
}

document.getElementById('room').innerText += " " + Room;    // display Room name
console.log("this is my ID: " + socket.id);

// notify the server we arrived at this page
socket.emit('newJoin', {
  room: Room,
  name: Name
});


// ----------------------------------------------------------------------------
// START BUTTON
// ----------------------------------------------------------------------------

var start = document.getElementById('start');

/**
  * @desc when someone clicks on the start button ...
 */
start.onclick = function(){
    console.log("start");   // displayed only to the one who clicked it

    socket.emit('startGame', {
      room: Room
    });

    /**
      * @desc things we want to happen once when game starts, only gets called with the one who clicked start
      * @param data = {boolean: message} - a boolean that tells us whether the server is ready to start the game
     */
    socket.on('start', function(data){
        if(data.message){
            // deal the cards to everyone (13 tiles for everybody)
            socket.emit('deal', {
              room: Room
            });

            // set the player who clicked start to be active (it's their turn)
            socket.emit('active true', {
              pID: socket.id, 
              room: Room
            });

            // first player starts, and draws an extra tile.
            socket.emit('draw', {
              pID: socket.id,
              name: Name,
              room: Room
            });

            Active = true;
        }
        else{
            document.getElementById('err').innerHTML = "Cannot start without 4 players";
        }
    });
}

/**
  * @desc for functions to happen to all players when game starts, display hidden and proceed to game
  * @param data = {boolean: message, Array: players} - a boolean that tells us whether the server is ready to start the game
 */
socket.on('start', function(data){
    if(data.message){
      // set the names for each player
      var index = data.players.findIndex(x => x.name === Name);
      console.log("index: " + index);
      var left = data.players[(index+1)%4].name;
      var top = data.players[(index+2)%4].name;
      var right = data.players[(index+3)%4].name;
      document.getElementById('topname').innerText = top;
      document.getElementById('leftname').innerText = left;
      document.getElementById('rightname').innerText = right;

      // set player list
      Players.push(Name + "");
      Players.push(left + "");
      Players.push(top + "");
      Players.push(right + "");

      console.log('players in this room: ' + Players);

      // hide the waiting room
      document.getElementById('waiting').classList.add('d-none');
      document.getElementById('game').classList.remove('d-none');
    }
    else{
        console.log("error: cant start without 4.");
    }
});



// ----------------------------------------------------------------------------
// LEAVE BUTTON
// ----------------------------------------------------------------------------
var leave = document.getElementById('leave');

/**
  * @desc leave the room if the player clicks the "leave" button
 */
leave.onclick = function() {
  console.log("leave");
  window.location.href = "/";   // redirect to home page 
  //should call disconnect
}


// ----------------------------------------------------------------------------
// DRAW BUTTON
// ----------------------------------------------------------------------------
var draw = document.getElementById('draw');

/**
  * @desc draw a tile
 */
draw.onclick = function() {
  console.log("drawing");

  // draw a tile from the deck
  socket.emit('draw', {
    pID: socket.id,
    name: Name,
    room: Room
  });
}


// ----------------------------------------------------------------------------
// DISCARD BUTTON
// ----------------------------------------------------------------------------
var discard = document.getElementById('discard');

/**
  * @desc discard tile based on tile id (e.g. s1, s2)
  * NOTE, ANOTHER OPTION WE CAN DO IS REMOVE BASED ON INDEX
 */
discard.onclick = function() {
  console.log("discard");

  var tile = document.getElementById('tile').value;
  // discard the chosen tile
  socket.emit('discard', {
    name: Name,
    pID: socket.id,
    tile: tile,
    room: Room
  });
  // set the active status of the player false and the next player's active status to true
  socket.emit('active switch', {
    pID: socket.id,
    room: Room
  });
}


// ----------------------------------------------------------------------------
// STEAL BUTTON
// ----------------------------------------------------------------------------
var steal = document.getElementById('steal');

/**
  * @desc steal the discarded tile
 */
steal.onclick = function() {
  console.log("stealing");

  // call server
  socket.emit('steal', {
    pID: socket.id,
    name: Name,
    room: Room
  });
  // request the server side to change the status of the player (who stole) as active
  socket.emit('active switch steal', {
    pID: socket.id,
    room: Room
  });

  // disable discard button
  var discard = document.getElementById('discard');
  discard.disable = true;
  // need to either reveal or cancel
}


// ----------------------------------------------------------------------------
// REVEAL BUTTON
// ----------------------------------------------------------------------------
var reveal = document.getElementById('reveal');

/**
  * @desc reveal the completed set due to stealing the discarded tile
  * NOTE, ANOTHER OPTION WE CAN DO IS BY INDEX RATHER THAN THE STRING OF THE TILE
 */
reveal.onclick = function() {
  console.log("revealing");

  var tiles = document.getElementById('tile').value.split(',');

  // set needs to be a size of 3 or greater
  if (tiles.length < 3) {
    console.log("not enough tiles to complete a set");
    return;
  }

  // call server
  socket.emit('reveal', {
    pID: socket.id,
    name: Name,
    room: Room,
    tiles: tiles
  });

  // enable discard button
  var discard = document.getElementById('discard');
  discard.disable = false;
}


// ----------------------------------------------------------------------------
// CANCEL BUTTON
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// WIN BUTTON
// ----------------------------------------------------------------------------




// ----------------------------------------------------------------------------
// OTHERS
// ----------------------------------------------------------------------------

/**
  * @desc display players who have joined the game (waiting list)
  * @param data = {Array: players} - list of players associated with the room
  * @param data = {String: error} - error message
 */
socket.on('newPlay', function(data){
  if(data.error){
    window.location.href = "/";
  }
  console.log("received emission");

  var html = "";
  var list = data.players;
  for(var p in list){
      html += "<li class='list-group-item'>"+list[p].name+"</li>";
  }
  document.getElementById('players').innerHTML = html;
});

/**
  * @desc display player's tiles
  * @param data = {Array: tiles, String: message} - 
  *   list of the player's tiles (strings) and function called to change the tiles (e.g. deal, discard, etc)
 */
socket.on('player tiles', function(data){
  console.log("message: " + data.message);
  if(data.message == "deal" || data.message == "draw"){
    document.getElementById("hand").innerHTML = "";
    if(Active){
      document.getElementById("astat").innerHTML = "<b>*</b>";
    }
    var id = 0;
    for(var t in data.tiles){
      document.getElementById("hand").innerHTML += 
      "<input type='image' class='hand' src='/client/img/" + data.tiles[t] + 
      ".svg' onclick='hand("+id+")'>";
      id += 1;
    }
    
  }
  
  console.log(data.tiles);
});

/**
  * @desc when a players turn changes, adjust *
  * @param data = {string: playerT, string: playerF} - the player whos turn it is, the player whos turn it was
 */
socket.on('active', function(data){
  var ID = "";
  console.log("data: " + data.playerT);
  console.log("players: " + Players[0]);
  switch(data.playerT){
    case Players[0]:
      Active = true;
      break;
    case Players[1]:
      ID = "leftname";
      break;
    case Players[2]:
      ID = "topname";
      break;
    case Players[3]:
      ID = "rightname";
      break;
    default:
      console.log("it is default");
      ID = "none";
      break;
  }
  if(Active){
    document.getElementById('astat').innerHTML = "<b>*</b>";
  }
  else if(ID != "none"){
    console.log(ID);
    document.getElementById(ID).innerHTML += "*";
  }

  ID = "";
  var n = "";
  switch(data.playerF){
    case Players[0]:
      Active = false;
      break;
    case Players[1]:
      ID = "leftname";
      break;
    case Players[2]:
      ID = "topname";
      break;
    case Players[3]:
      ID = "rightname";
      break;
    default:
      ID = "none";
      break;
  }
  if(!Active){
    document.getElementById('astat').innerText = "";
  }
  if(ID != "none"){
    document.getElementById(ID).innerText = data.playerF;
  }

});

function hand(i){
  console.log(i);
}