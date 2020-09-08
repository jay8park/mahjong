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

## Client
  join.js
  games.js
## Logic
