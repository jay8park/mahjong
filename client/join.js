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
