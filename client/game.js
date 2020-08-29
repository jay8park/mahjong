const socket = io();
var Room = "";
var Name = "";
var search = window.location.search.substring(1);
var params = search.split("&");
for(var item in params){
    var sides = params[item].split("=");
    if(sides[0] == "room"){
        Room = sides[1];
        console.log("set room");
    }
    else if(sides[0] == "name"){
        Name = sides[1];
        console.log("set name" + sides[1]);
    }
}
console.log("room: "+Room+ " name: "+Name);
document.getElementById('room').innerText += Room;
console.log("this is my ID: " + socket.id);
socket.emit('newJoin', {room: Room, name: Name});
socket.on('newPlay', function(data){
    console.log("received emission");
    var html = "";
    var list = data.players;
    for(var p in list){
        html += "<li>"+list[p].name+"</li>";
    }
    document.getElementById('players').innerHTML = html;
});

var start = document.getElementById('start');
start.onclick = function(){
    //for the one who clicked it
    console.log("clicked");
    socket.emit('startGame', {room: Room});
    socket.on('start', function(data){
        if(data.message){
            document.getElementById('waiting').style.display = "none";
            document.getElementById('game').style.display = "block";
        }
        else{
            console.log("error: cant start without 4.");        
        }
    });
}

socket.on('start', function(data){
    //for the ones who didnt click
    if(data.message){
        document.getElementById('waiting').style.display = "none";
        document.getElementById('game').style.display = "block";
    }
    else{
        console.log("error: cant start without 4.");        
    }
});
