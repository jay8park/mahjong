// ----------------------------------------------------------------------------
// SET UP
// ----------------------------------------------------------------------------
const socket = io();
var Room = "";
var Name = "";
var Active = false; // is it the current players turn or not
var Players = []; // list of names of other players in the same room; order is [me, left, top, right]
var State = "Nothing" // state of current player to determine which buttons are active;
// Steal, InTurn, Discard, Reveal, Four, TheyWin -- see changeState(s)
var Tiles = [];
var Winner = []; // [name, pID]
var selected = []; // list of selected tiles in your hand by id


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


// in the case where a player refreshes the page
if (sessionStorage.getItem("name")) {
  socket.emit('rejoin', {
    room: Room,
    name: sessionStorage.get("name"),
    tiles: sessionStorage.get("tiles"),
    revealed: sessionStorage.get("revealed"),
    active: sessionStorage.get("active"),
    outOfTurn: sessionStorage.get("outOfTurn"),
    revealTileCount: sessionStorage.get("revealTileCount"),
    steal: sessionStorage.get("steal"),
    index: sessionStorage.get("index")    // player's index in the player's list (on server side)
  });

  // display in-play view
  document.getElementById('waiting').classList.add('d-none');
  document.getElementById('game').classList.remove('d-none');
}
// in the case where its a new player
else {
  // notify the server we arrived at this page
  socket.emit('newJoin', {
    room: Room,
    name: Name
  });
}

// ----------------------------------------------------------------------------
// START BUTTON
// ----------------------------------------------------------------------------

var start = document.getElementById('start');

/**
  * @desc when someone clicks on the start button ...
 */
start.onclick = function(){
    console.log("start");   // displayed only to the one who clicked it

    Active = Name;
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
            changeState("Discard");
            document.getElementById('astat').innerHTML = "<b>*</b>";
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

      // hide the waiting room
      document.getElementById('waiting').classList.add('d-none');
      document.getElementById('game').classList.remove('d-none');
    }
    else{
        console.log("error: cant start without 4.");
    }

    // set cookies
    document.cookie = "socket=" + socket.id;
    console.log("cookie");
    console.log(document.cookie);

    sessionStorage.setItem("name", Name);

});



// ----------------------------------------------------------------------------
// LEAVE BUTTON
// ----------------------------------------------------------------------------
var leave = document.getElementById('leave');

/**
  * @desc leave the room if the player clicks the "leave" button
 */
leave.onclick = function() {
  // console.log("leave");
  window.location.href = "/";   // redirect to home page
  //should call disconnect
}


// ----------------------------------------------------------------------------
// BUTTONS !!!
// ----------------------------------------------------------------------------

var topbut = document.getElementById('first');
topbut.onclick = function(){
  if(!topbut.disabled){
    if(topbut.value == 'discard'){
      console.log("selected: " + selected);
      if(selected.length == 1){ // if they didn't choose one, do nothing
        var pop = selected.shift();
        var tile = Tiles[pop];
        // set the active status of the player false and the next player's active status to true
        socket.emit('active switch', {
          pID: socket.id,
          room: Room
        });
        // discard the chosen tile
        socket.emit('discard', {
          name: Name,
          pID: socket.id,
          tile: tile,
          room: Room
        });
        // change the state of these players
        socket.emit('change others', {
          names: Players.slice(2),
          state: "Steal",
          room: Room,
        });
        changeState("Nothing");
      }
      else{
        modalMessage("choose a card to discard");
      }
    }
    else if(topbut.value == 'reveal'){
      if(selected.length < 3){
        console.log("not enough tiles");
        modalMessage("not enough tiles");
      }
      else{
        var l = [];
        for(var i in selected){
          l.push(Tiles[selected[i]]);
        }
        // call server
        socket.emit('reveal', {
          pID: socket.id,
          name: Name,
          room: Room,
          tiles: l
        });
      }

    }
    else if(topbut.value == 'steal'){
      // call server
      socket.emit('steal', {
        pID: socket.id,
        name: Name,
        room: Room
      });
      // request the server to change the status of the player (who stole) as active
      socket.emit('active switch steal', {
        pID: socket.id,
        room: Room
      });
      // everyone else state to nothing
      socket.emit('change others', {
        names: Players.slice(1),
        state: "Nothing",
        room: Room,
      });
      changeState("Reveal");
      clearBoard(); // remove discarded highlight

    }
    else if(topbut.value == 'accept'){
      // confirm win and change game state
      socket.emit('reset', {
        room: Room,
        players: Players
      });
    }
  }
}

var botbut = document.getElementById('second');
botbut.onclick = function(){
  if(!botbut.disabled){
    if(botbut.value == 'draw'){
      // draw a tile from the deck
      socket.emit('draw', {
        pID: socket.id,
        name: Name,
        room: Room
      });
      socket.emit('change others', {
        names: Players.slice(1),
        state: "Nothing",
        room: Room,
      });
      clearBoard();
      changeState("Discard");
    }
    else if(botbut.value == 'win'){
      // tell server someone claimed to win
      socket.emit('claimed win', {
        pID: socket.id,
        room: Room,
        players: Players.slice(1)
      });
      // change state for everyone else to display accept or reject
      socket.emit('change others', {
        names: Players.slice(1),
        state: "TheyWin",
        room: Room,
      });
      // change my own display to show nothing only
      changeState("Nothing");
      modalMessage("Other players are judging...");
      Winner = [Name, socket.id];
    }
    else if(botbut.value == 'reject'){
      socket.emit('reject win', {
        pID: Winner[1],
        room: Room
      });
      Winner = [];
    }
  }
}

var w = document.getElementById("w");

w.onclick = function(){
  if(w.value == "win"){
    // console.log("player " + Name + " claims win.");
    // tell server someone claimed to win
    socket.emit('claimed win', {
      pID: socket.id,
      room: Room,
    });
    // change state for everyone else to display accept or reject
    socket.emit('change others', {
      names: Players.slice(1),
      state: "TheyWin",
      room: Room,
    });
    // change my own display to show nothing only
    changeState("Nothing");
    Winner = [Name, socket.id];
  }
  else if(w.value == "cancel"){
    for(var i in selected){
      document.getElementById(selected[i]).classList.remove("choose");
    }
    selected = [];
    changeState("Discard");
  }
}

var c = document.getElementById("canc");
c.onclick = function(){
  if(c.value == "cancel"){
    // return the stolen piece
    socket.emit('cancel', {
      pID: socket.id,
      name: Name,
      room: Room
    });

    // change the state for other players
    // also changes everyone's display to be "steal"
    // socket.emit('change others', {
    //   names: Players,
    //   state: "Steal",
    //   room: Room,
    // });

    // request the server side to change the status of the previous actvive player as active
    // if player stole within turn, it will display proper buttons instead of "steal" state buttons
    socket.emit('active switch cancel', {
      pID: socket.id,
      room: Room
    });

    selected = []; // clear selected tiles
  }
  else if(c.value == "four"){
    changeState("ChooseFour");
  }
  else if(c.value == "reveal"){
    var l = []; // list of tile names from selected ids
    for(var i in selected){
      l.push(Tiles[selected[i]]);
    }
    //send to server
    socket.emit("reveal four", {
      pID: socket.id,
      room: Room,
      tiles: l
    });

  }
}

function win(){
  // call "win"
  console.log("WIN FUNCTION");
  socket.emit('win', {
    pID: socket.id,
    name: Name,
    room: Room
  });
  // change state for everyone else to display accept or reject
  socket.emit('change others', {
    names: Players.slice(1),
    state: "TheyWin",
    room: Room,
  })
  // change my own display to show nothing only
  changeState("Nothing");
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
    modalMessage("not enough tiles to complete a set");
    return;
  }

  // call server
  socket.emit('reveal', {
    pID: socket.id,
    name: Name,
    room: Room,
    tiles: tiles
  });
}


// ----------------------------------------------------------------------------
// CANCEL BUTTON
// ----------------------------------------------------------------------------
var cancel = document.getElementById('cancel');

/**
  * @desc cancel occurs when someone steals and their only options are reveal or cancel.
 */
cancel.onclick = function() {
  console.log("cancelling");
  // return the stolen piece
  socket.emit('cancel', {
    pID: socket.id,
    name: Name,
    room: Room
  });

  // request the server side to change the status of the previous actvive player as active
  socket.emit('active switch cancel', {
    pID: socket.id,
    room: Room
  });
}

// ----------------------------------------------------------------------------
// WIN BUTTON
// ----------------------------------------------------------------------------
var win = document.getElementById('win');

/**
  * @desc player wins the game, only if they have a total tile count of at least 14
 */
win.onclick = function() {
  console.log("win");
  // check tile count for potential win
  socket.emit('win', {
    pID: socket.id,
    name: Name,
    room: Room
  });
}

// ----------------------------------------------------------------------------
// REJECT BUTTON
// ----------------------------------------------------------------------------
var reject = document.getElementById('reject');

/**
  * @desc if a pleyer disagrees with another player's win, then
  * reject win and continue with game
 */
reject.onclick = function() {
  console.log("rejecting win");
  $('#modal3').modal('hide');

  socket.emit('change others', {
    names: Players,
    state: "Reject/Accept",
    room: Room,
  });

  // tell winner that they did not win
  console.log(Winner[0]);
  console.loge([Winner[0]]);
  socket.emit('change others', {
    names: [Winner[0]],
    state: 'Reject',
    room: Room
  });
  Winner = [];
}

// ----------------------------------------------------------------------------
// ACCEPT BUTTON
// ----------------------------------------------------------------------------
var accept = document.getElementById('accept');

/**
  * @desc player wins the game, only if they have a total tile count of at least 14
 */
accept.onclick = function() {
  console.log("accepting");

  // hide modal3
  $('#modal3').modal('hide');
  // confirm win and change game state
  socket.emit('reset', {
    room: Room
  });
  socket.emit('change others', {
    names: Players,
    state: "Reject/Accept",
    room: Room,
  })
}

// ----------------------------------------------------------------------------
// PLAY AGAIN BUTTON
// ----------------------------------------------------------------------------
var again = document.getElementById('again');

/**
  * @desc return to waiting room if player plays again
 */
again.onclick = function() {
  console.log("play again");

  socket.emit('joinRoom',{
    room: Room,
    name: Name
  });

  socket.emit('newJoin',{
    room: Room,
    name: Name
  });

  document.getElementById('finished').classList.add('d-none');
  document.getElementById('waiting').classList.remove('d-none');

}


// ----------------------------------------------------------------------------
// OTHERS
// ----------------------------------------------------------------------------

/**
  * @desc display players who have joined the game (waiting list)
  * @param data = {Array: players} - list of players associated with the room
  * @param data = {String: error} - error message
 */
socket.on('newPlay', function(data){
  // if(data.error){
  //   window.location.href = "/";
  // }
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
  * @param data = {Array: tiles}, {String: message}, {String: tile} -
  *   list of the player's tiles (strings) and function called to change the tiles (e.g. deal, discard, etc)
 */
socket.on('display tiles', function(data){
  var theone = "none";
  var done = false;
  if(data.message == "steal"){
    theone = data.tile;
  }
  if(data.message == "reveal"){
    // successful reveal
    // clear selected array
    selected = [];
  }
  document.getElementById("hand").innerHTML = "";
  var id = 0;
  for(var t in data.tiles){
    document.getElementById("hand").innerHTML +=
    "<input type='image' class='hand' src='/client/img/" + data.tiles[t] +
    ".svg' onclick='choose("+id+")' id='"+id+"'>";
    if(theone != "none" && theone == data.tiles[t] && !done){
      document.getElementById(id).classList.add("choose");
      selected.push(id);
      done = true;
    }

    id += 1;
  }
  if(data.message == "draw"){
    var i = data.index;
    console.log("index = "  + data.index);
    document.getElementById(i).classList.add("drew");
  }
  // update player Tiles
  Tiles = data.tiles;
  sessionStorage.setItem("tiles", data.tiles);
});

/**
  * @desc display player's revealed tiles
  * @param data = {Array: tiles, string: pname, string: message} -
  * list of the player's revealed tiles (strings), name of player who revealed, message: state it was called in (reveal or win)
 */
socket.on('display revealed', function(data){
  var element;
  var clas = "";
  sessionStorage.set("revealed", data.tiles);
  if(data.message == "win"){
    console.log("winner id: " + data.pID);
    Winner = [data.pname, data.pID];
  }
  if(data.pname == Name){
    element = document.getElementById("rev");
    clas = "srevtiles";
    if(data.message == "reveal"){
      changeState("Discard");
    }
    if(data.message == "four"){
      changeState("Four");
    }
  }
  else if(data.pname == Players[1]){ // left
    element = document.getElementById("wrev");
    clas = "wrevtiles";
  }
  else if(data.pname == Players[2]){ // top
    element = document.getElementById("nrev");
    clas = "nrevtiles";
  }
  else if(data.pname == Players[3]){ // right
    element = document.getElementById("erev");
    clas = "erevtiles";
  }
  console.log("reveal tiles: " + data.tiles);
  if(data.message == "reject"){
    element.innerHTML = "";
    for(var t in data.tiles){
      for(var i in data.tiles[t]){
        element.innerHTML +=
        "<img class='"+clas+"' src='/client/img/"+data.tiles[t][i]+".svg'></img>";
      }
    }
  }
  else{
    for(var i in data.tiles){
      element.innerHTML +=
      "<img class='"+clas+"' src='/client/img/"+data.tiles[i]+".svg'></img>";
    }
  }

});

/**
  * @desc update the discard pile
  * @param data = {String: tile} - the name of the tile last discarded
 */
socket.on('update discard', function(data){
  clearBoard();
  document.getElementById(data.tile).classList.add('grab'); // highlight last discarded
  // update number
  var name = "n" + data.tile;
  var num = document.getElementById(name).innerHTML;
  document.getElementById(name).innerHTML = parseInt(num)+1;
  document.getElementById(name).style.backgroundColor = "red";
  document.getElementById(name).style.color = "white";
});

/**
  * @desc update the discard pile numbers
  * @param data = {String: tile, String: oper} - the name of the tile, operation + or -
 */
socket.on('change number', function(data){
  var name = "n" + data.tile;
  var num = document.getElementById(name).innerHTML;
  if(data.oper == "+"){
    document.getElementById(name).innerHTML = parseInt(num) + 1;
  }
  else{
    document.getElementById(name).innerHTML = parseInt(num) - 1;
  }
});

/**
  * @desc change my state
  * @param data = {Array: names}, {string: state} - list of player names and string describing the state
 */
socket.on('change state', function(data){
  for(var i in data.names){
    if(data.names[i] == Name){
      changeState(data.state);
    }
  }
});


/**
  * @desc display proper modal pop ups for players deciding on accepting or rejecting win
  * @param data = {Array: names}, {string: winner} - list of player names
 */
socket.on('accept/reject modal', function(data){
  for (var i in data.names) {
    if (data.names[i] == Name) {
      modalMessage(data.winner + " claims win. choose whether to accept or reject");
    }
  }
})

/**
  * @desc when a players turn changes, adjust *
  * @param data = {string: playerT, string: playerF, boolean: inturn} - the player whos turn it is, the player whos turn it was
 */
socket.on('active', function(data){
  var t = data.playerT;
  var f = data.playerF;
  var ID = "";
  if(f == Players[0]){
    Active = false;
    ID = "none";
  }
  else if(f == Players[1]){
    ID = "leftname";
  }
  else if(f == Players[2]){
    ID = "topname";
  }
  else if(f == Players[3]){
    ID = "rightname";
  }
  else{
    ID = "none";
  }
  if(ID != "none"){
    document.getElementById(ID).innerText = data.playerF;
  }

  ID = "";
  if(t == Players[0]){
    Active = true;
    ID = "none";
  }
  else if(t == Players[1]){
    ID = "leftname";
  }
  else if(t == Players[2]){
    ID = "topname";
  }
  else if(t == Players[3]){
    ID = "rightname";
  }
  else{
    ID = "none";
  }
  if(ID != "none"){
    document.getElementById(ID).innerHTML += "*";
  }

  if(Active){
    document.getElementById('astat').innerHTML = "<b>*</b>";
    if(data.inturn != null){ // case of the first turn
      if(data.inturn){
        changeState("InTurn");
      }
      else{
        changeState("Reveal");
      }
    }
  }
  else{
    document.getElementById('astat').innerText = "";
  }

});

/**
  * @desc display message on player's console
  * @param data = {string: message} - message to print
 */
socket.on('message', function(data){
  console.log(data.message);
  modalMessage(data.message);
});


/**
  * @desc change display to finished display
 */
socket.on('to finish', function(){
  document.getElementById('room2').innerText += " " + Room;
  document.getElementById('winner').innerText += " " + Winner[0];
  document.getElementById('game').classList.add('d-none');
  document.getElementById('finished').classList.remove('d-none');
  document.getElementById('players').innerHTML = "";
  document.getElementById('rev').innerHTML = "";
  document.getElementById('erev').innerHTML = "";
  document.getElementById('wrev').innerHTML = "";
  document.getElementById('nrev').innerHTML = "";
});


/**
  * @desc set sessionStorage
  * @param data - {string: key}, {string: value}
 */
socket.on('set sessionStorage', function(data){
  sessionStorage.setItem(key, value);
  console.log('set sessionStorage');
  console.log(sessionStorage.getItem(key));
});


// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
  * @desc clear discard board to not highlight anything
  * should occur after a steal
 */
function clearBoard(){
  var actives = document.getElementsByClassName("grab"); // get current highlighted
  if(actives.length > 0){
    // should really only have one element at a time
    var element = actives[0];
    element.classList.remove('grab');
    // change background color and text color of number
    var name = "n" + element.getAttribute('id');
    var span = document.getElementById(name);
    span.style.backgroundColor = "pink";
    span.style.color = "black";
  }
}

/**
  * @desc clear highlights in hand
 */
function clearHand(){
  var actives = document.getElementsByClassName("drew"); // get current highlighted
  // console.log(actives.length);
  if(actives.length > 0){
    // should really only have one element at a time
    var element = actives[0];
    element.classList.remove('drew');
  }
}

/**
  * @desc decide what happens when you click a tile
  * tiles should only be clickable in the Discard or Reveal state
  * @param tile = string tilename
 */

function choose(id){
  var element = document.getElementById(id);
  if(State == "Discard"){
    for(var s in selected){ // in theory should only have one
      var temp = selected.splice(s, 1);
      document.getElementById(temp+"").classList.remove("choose");
      selected.shift(); // remove from front
    }
    element.classList.add("choose");
    selected.push(id);
  }
  else if(State == "Reveal"){
    if(element.classList.contains("choose") && id != selected[0]){
      element.classList.remove("choose");
      selected.splice(selected.indexOf(id), 1);
    }
    else if(id != selected[0]){
      if(selected.length >= 4){
        var temp = selected.splice(1,1); // remove the second one bc the first should be permanent
        document.getElementById(temp).classList.remove("choose");
      }
      element.classList.add("choose");
      selected.push(id);
      if(selected.length == 3){
        document.getElementById("first").disabled = false;
      }
    }
  }
  else if(State == "ChooseFour"){
    if(element.classList.contains("choose")){
      element.classList.remove("choose");
      selected.splice(selected.indexOf(id), 1);
    }
    else{
      if(selected.length >= 4){
        var temp = selected.splice(0,1); // remove the first one
        document.getElementById(temp).classList.remove("choose");
      }
      element.classList.add("choose");
      selected.push(id);
      if(selected.length == 4){
        document.getElementById("canc").disabled = false;
      }
    }
  }
}

/**
  * @desc changes the state of player and button values
  * @param s = string{State}
 */
function changeState(s){
  console.log("state: " + s);
  State = s;
  var top = document.getElementById("first");
  var bottom = document.getElementById("second");
  // bottom two buttons
  var a = document.getElementById("w");
  var b = document.getElementById("canc");
  // three button case
  var half = document.getElementById("steals");
  var lower = document.getElementById("lower");
  if(s == "Reveal" || s == "ChooseFour" || s == "Discard"){
    if(!lower.classList.contains('d-none')){
      lower.classList.add('d-none');
    }
    if(half.classList.contains('d-none')){
      half.classList.remove('d-none');
    }
  }
  else{
    if(lower.classList.contains('d-none')){
      lower.classList.remove('d-none');
    }
    if(!half.classList.contains('d-none')){
      half.classList.add('d-none');
    }
  }
  switch(s){
    case "Steal": // steal
      top.disabled = false;
      top.value = "steal";
      bottom.disabled = true;
      break;
    case "InTurn": // steal or draw
      top.disabled = false;
      top.value = "steal";
      bottom.disabled = false;
      bottom.value = "draw";
      break;
    case "Discard": // discard or win or four
      top.disabled = false;
      top.value = "discard";
      a.value = "win";
      a.disabled = false;
      b.value = "four";
      b.disabled = false;
      break;
    case "ChooseFour": // reveal or cancel
      top.disabled = true;
      a.value = "cancel";
      b.disabled = true;
      b.value = "reveal";
      break;
    case "Reveal": // reveal or win or cancel
      top.disabled = true;
      top.value = "reveal";
      a.value = "win";
      b.value = "cancel";
      break;
    case "Four": // draw
      top.disabled = true;
      bottom.disabled = false;
      bottom.value = "draw";
      break;
    case "TheyWin": //accept or reject
      top.disabled = false;
      top.value = "accept";
      bottom.disabled = false;
      bottom.value = "reject";
      break;
    case "Reject/Accept":
      $('#modal2').modal('hide');
    default:
      top.disabled = true;
      bottom.disabled = true;
      clearBoard();
      clearHand();
      break;
  }
}

function modalMessage(message) {
  document.getElementById('message').innerHTML = message;
  $('#modal2').modal('show');
}

function rejectAcceptModal(winner) {
  document.getElementById('possibleWinner').innerHTML = winner;
  $('#modal3').modal('show');
}
