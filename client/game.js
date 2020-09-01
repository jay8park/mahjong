// ----------------------------------------------------------------------------
// SET UP
// ----------------------------------------------------------------------------
const socket = io();
var Room = "";
var Name = "";
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

document.getElementById('room').innerText += Room;    // display Room name
console.log("this is my ID: " + socket.id);

// createS new player object
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
      * @desc display hidden and proceed to game
      * @param data = {boolean: message} - a boolean that tells us whether the server is ready to start the game
     */
    socket.on('start', function(data){
        if(data.message){
            document.getElementById('waiting').style.display = "none";
            document.getElementById('game').style.display = "block";

            // deal the cards to everyone (13 tiles for everybody)
            socket.emit('deal', {
              room: Room
            });

            // set the player who clicked start to be active (it's their turn)
            socket.emit('active true', {
              pID: socket.id
            });

            // first player starts, and draws an extra tile.
            socket.emit('draw', {
              pID: socket.id,
              name: Name,
              room: Room
            });
        }
        else{
            console.log("error: cant start without 4.");
        }
    });
}

/**
  * @desc for players who didn't click start, display hidden and proceed to game
  * @param data = {boolean: message} - a boolean that tells us whether the server is ready to start the game
 */
socket.on('start', function(data){
    if(data.message){
        document.getElementById('waiting').style.display = "none";
        document.getElementById('game').style.display = "block";
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

  // leave/unsubscribe to room
  socket.emit('leave', {
    room: Room,
    name: Name
  });
  window.location.href = "/";   // redirect to home page
}


// ----------------------------------------------------------------------------
// DISCARD BUTTON
// ----------------------------------------------------------------------------
var discard = document.getElementById('discard');

/**
  * @desc discard tile based on tile id (e.g. s1, s2)
  * NOTE, ANOTHER OPTION WE CAN DO IS REMOVE BASED ON INDEX
 */
leave.onclick = function() {
  console.log("discard");

  var tile = document.getElementById('tile');
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
// OTHERS
// ----------------------------------------------------------------------------

/**
  * @desc display players who have joined the game (waiting list)
  * @param data = {Array: players} - list of players associated with the room
 */
socket.on('newPlay', function(data){
    console.log("received emission");

    var html = "";
    var list = data.players;
    for(var p in list){
        html += "<li class='list-group-item'>"+list[p].name+"</li>";
    }
    document.getElementById('players').innerHTML = html;
});

/**
  * @desc display player's tiles on console
  * @param data = {string: tiles} - list of the player's tiles
 */
socket.on('player tiles', function(data){
  console.log("player tiles");
  console.log(data.tiles);
})
