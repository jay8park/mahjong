const socket = io();
var makeNew = document.getElementById("new");
var joinRoom = document.getElementById("join");
makeNew.onclick = function(e){
    e.preventDefault();
    var name = document.getElementById("user").value;
    var code = document.getElementById("room").value;

    socket.emit('createRoom',{ code: code });
    socket.on('roomCreated', function(data){
        if(data.message){
            window.location.href = "/game?room=" + code + "&name=" + name;
        }
        else{
            document.getElementById("room-err").innerHTML = "This room already exists.";
        }
    });
}

joinRoom.onclick = function(e){
    e.preventDefault();
    var name = document.getElementById("user").value;
    var code = document.getElementById("room").value;
    
    socket.emit('joinRoom',{ room: code, name: name });
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