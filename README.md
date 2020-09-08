# mahjong
<insert description> 

## Server
app.js

### Objects
PLAYERS -- dictionary of player -- key: id (socket)

ROOMS -- dictionary of room -- key: id (room code)

Player:
- id -- string -- the socket id is used as the player's id
- name -- string
- tiles -- list of strings -- the tiles in hand
- revealed -- list of strings -- the tiles/completed sets that are revealed
- active -- boolean -- is it the player's turn? 
- outOfTurn -- boolean -- used for the steal functionality, i.e. you can complete a consecutive set via a steal ONLY if the player stole within his/her turn

Room:
- id -- string -- room code
- players list -- list of strings -- list of the player's name
- tile list -- list of strings -- the list of available tiles for this room
- discard -- list of strings -- the list of dicarded tiles
- last -- string -- the last discarded tile -- NOTE, might not need, bc we could just pop out the last element of discard
- steal -- boolean -- if false, no one is able to steal, if true, players may steal; note, normally set to false when a player is in turn (draws a tile/discarding tile, etc.)

### Functions
on ('connection')
- createRoom
  - data: code (string) -- room code (used as room id)
  - descr: creates a new room if the room (name/code) does not already exist
  - call to client: roomCreated
- joinROom
  - data: room (string), name (string) -- room name and player name
  - desc: lets players join an existing room, only if the player's name is not taken and the room is not full (and other error checks)
  - call to client: joined
- newJoin
  - data: room (string), name (string) -- room name and player name
  - descr: creates a player object and add to PLAYERS dictionary
  - call to client: newPlay
- startGame
  - data: room (string) -- room name 
  - descr: checks if there are 4 players and then starts game if true (call to client to tell client to move to the next page)
  - call to client: start
- disconnect
  - data: N/A
  - descr: remove player from ROOMS and PLAYERS if they disconnect
  - call to client: newPLay
- leave
  - data: room (string), name( string) -- room name and player name
  - descr: if the leave button is triggered, remove player from ROOMS and PLAYERS
  - call to client: newPlay
  
- active true
  - data: pID (string), name (string) -- player ID and player name
  - descr: change player's active status to true
  - call to client: N/A
- active false
  - data: pID (string), name (string) -- player ID and player name
  - descr: change player's active status to false
  - call to client: N/A
- active switch
  - data: pID (string), room (string) -- player ID and room name
  - descr: change player's active status to false and the next player's active status to true
  - call to client: N/A
- active swtich steal
  - data: pID (string), room (string) -- player ID and room name
  - descr: change current player's active status to false and the active status of the player who stole to true
  - call to client: N/A
 
- deal
  - data: room (string) -- room name
  - descr: deal cards to every player in the room
  - call to client: player tiles -- call to the player's client via their socket id
- draw
  - data: pID (string), name (string), room (string) -- player ID, player name, room name
  - descr: draw a tile from the room's tiles list (take from top)
  - call to client: player tiles -- to the player via socket id
- discard
  - data: pID (string), name (string) tile (string), room (string) -- player ID, player name, tile to discard, room name
  - descr: discard a tile from player's hand/tiles
  - call to client: player tiles -- to the player via socket id
- steal
  - data: pID (string), name (string), room (string) -- player ID, player name, room name
  - descr: steal the most recently discarded tile
  - call to client: player tiles -- to the player via socket id
- reveal
  - data: pID (string), name (string), room (string), tiles (list of strings) -- player ID, player name, room name, list of tiles to reveal
  - descr: reveal completed set
  - call to client: player tiles -- to the player via socket id

helper functions
- checkPlayer
  - param: r (string), n (string) -- room name and player name
  - return: boolean
  - descr: checks if the player's name already exists in the room
- shuffle
  - param: a (array) 
  - return: a (array) -- shuffled array
  - descr: shuffles an array via fisher-yates shuffle algorithm
- deal
  - param: a (array of string) -- list of tiles to be dealt
  - return: (array) -- list of 13 tiles
  - descr: deals 13 tiles 
- isIdentical
  - param: a (array) -- the list of tiles (string)
  - return: (boolean) -- true if each tile is identical, false if not
  - descr: checks to see if each tile in the array is identical
- isConsecutive
  - param: a (array) -- the list of tiles (string)
  - return: (boolean) -- true if each tile is identical, false if not
  - descr: checks to see if each tile in the array is consecutive within the same suite

Note: room name and room code are synonymous 

## Client
join.js
### Fields
### Functions

games.js
### Fields
### Functions
## Logic
