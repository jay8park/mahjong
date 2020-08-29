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
            console.log("error: room already exists");
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
        else{
            console.log("error: " + data.message);
        }
    });

}