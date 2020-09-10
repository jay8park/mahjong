// ----------------------------------------------------------------------------
// SET UP
// ----------------------------------------------------------------------------
const socket = io();

// ----------------------------------------------------------------------------
// NEW BUTTON
// ----------------------------------------------------------------------------
var makeNew = document.getElementById("new");

/**
  * @desc when someone clicks on the new button ...
 */
makeNew.onclick = function(e){
    e.preventDefault();
    var name = document.getElementById("user").value;
    var code = document.getElementById("room").value;

    resetError();   // reset error message if any exists
    if (displayError(name, code)){      // display error if any
      return;
    }

    socket.emit('createRoom',{
      code: code
    });

    /**
      * @desc redirects to waiting room (game.html)
      * @param data = {boolean: message} - true if the server created room, false if otherwise
     */
    socket.on('roomCreated', function(data){
        if(data.message){
            window.location.href = "/game?room=" + code + "&name=" + name;
        }
        else{
            document.getElementById("room-err").innerHTML = "This room already exists.";
        }
    });
}

// ----------------------------------------------------------------------------
// JOIN BUTTON
// ----------------------------------------------------------------------------
var joinRoom = document.getElementById("join");

/**
  * @desc when someone clicks on the join button ...
 */
joinRoom.onclick = function(e){
    e.preventDefault();
    var name = document.getElementById("user").value;
    var code = document.getElementById("room").value;

    resetError();   // reset error message if any exists
    if (displayError(name, code)){      // display error if any
      return;
    }

    socket.emit('joinRoom',{
      room: code,
      name: name
    });

    /**
      * @desc redirects to waiting room (game.html)
      * @param data = {string: message} - a message of the join status
     */
    socket.on('joined', function(data){
        if(data.message == "good"){
            window.location.href = "/game?room=" + code + "&name=" + name;
        }
        else if(data.message.includes('Room')){
            document.getElementById("room-err").innerHTML = data.message;
        }
        else{
            document.getElementById("name-err").innerHTML = data.message;
        }
    });

}


// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
  * @desc display error message if name or room code is not filled
  * @param {string} name -- player's name
  * @param {string} room -- room code
  * @return {boolean} -- true if there is an error, false if there is none
 */
function displayError(name, room) {
  var error = false;
  if (name == "" || name == null) {
    document.getElementById("name-err").innerHTML = "Please enter a name.";
    error = true;
  }
  if (room == "" || room == null) {
    console.log("hello");
    document.getElementById("room-err").innerHTML = "Please enter a room code.";
    error = true;
  }
  if (error) {
    return true;
  }
  else {
    return false;
  }
}

/**
  * @desc remove error message for "name-err" and "room-err" if there is any
 */
function resetError() {
  if (document.getElementById("name-err").innerHTML != "") {
    document.getElementById("name-err").innerHTML = "";
  }
  if (document.getElementById("room-err").innerHTML != "") {
    document.getElementById("room-err").innerHTML = "";
  }
}
