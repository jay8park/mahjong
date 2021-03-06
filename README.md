# mahjong
<insert description> 

## Server
### app.js

#### Objects
PLAYERS -- dictionary of player -- key: id (socket)

ROOMS -- dictionary of room -- key: id (room code)

Player:
- id -- string -- the socket id is used as the player's id
- name -- string
- tiles -- list of strings -- the tiles in hand
- revealed -- list of strings -- the tiles/completed sets that are revealed
- active -- boolean -- is it the player's turn? 
- outOfTurn -- boolean -- used for the steal functionality, i.e. you can complete a consecutive set via a steal ONLY if the player stole within his/her turn
- revealTileCount -- int -- total number of tiles
- steal -- boolean -- in the case where someone steals and then clicks win, we use this flag to revert to the correct state (back to the cancel state and not the discard state); steal is set to true on steal, and set to false on completed reveal

Room:
- id -- string -- room code
- players -- list of objects -- list of the player objects
- tiles -- list of strings -- the list of available tiles for this room
- discard -- list of strings -- the list of dicarded tiles
- last -- string -- the last discarded tile 
- prevLast -- string -- the previously last discarded tile -- used in steal, reveal, cancel
- steal -- boolean -- if false, no one is able to steal, if true, players may steal; note, normally set to false when a player is in turn (draws a tile/discarding tile, etc.)
- inplay -- boolean -- status of whether game has started (true) or whether still in waiting room (false) -- needed for the disconnect functionality
- prevActive -- string -- the player id who was last previously active -- this is meant for the cancel functionality where we need to revert back to the original active player 

#### Functions
on ('connection')
- createRoom
  - data: code (string) -- room code (used as room id)
  - descr: creates a new room if the room (name/code) does not already exist
  - call to client: roomCreated
- joinRoom
  - data: room (string), name (string) -- room name and player name
  - desc: lets players join an existing room, only if the player's name is not taken and the room is not full (and other error checks)
  - call to client: joined
- newJoin
  - data: room (string), name (string) -- room name and player name
  - descr: checks for errros/etc. and then creates a player object and add to PLAYERS dictionary
  - call to client: newPlay
- startGame
  - data: room (string) -- room name 
  - descr: checks if there are 4 players and then starts game if true (call to client to tell client to move to the next page)
  - call to client: start
- disconnect
  - data: N/A
  - descr: remove player from ROOMS and PLAYERS if they disconnect
  - call to client: newPLay
- active true
  - data: pID (string), name (string) -- player ID and player name
  - descr: change player's active status to true
  - call to client: active
- active false
  - data: pID (string), name (string) -- player ID and player name
  - descr: change player's active status to false
  - call to client: N/A
- active switch
  - data: pID (string), room (string) -- player ID and room name
  - descr: change player's active status to false and the next player's active status to true
  - call to client: active
- active switch steal
  - data: pID (string), room (string) -- player ID and room name
  - descr: change current player's active status to false and the active status of the player who stole to true
  - call to client: active
- active switch cancel
  - data: pID (string), room (string) -- player ID and room name
  - descr: change current player's acive status to false and the previous active player's active status to true
  - call to client: active
- change others
  - data: names (Array), state (string), room (string) -- player names, state name, room name
  - descr: emit to the rest of the room for player state changes
  - call to client: change state

- deal
  - data: room (string) -- room name
  - descr: deal cards to every player in the room
  - call to client: display tiles -- call to the player's client via their socket id
- draw
  - data: pID (string), name (string), room (string) -- player ID, player name, room name
  - descr: draw a tile from the room's tiles list (take from top)
  - call to client: display tiles -- to the player via socket id
- discard
  - data: pID (string), name (string) tile (string), room (string) -- player ID, player name, tile to discard, room name
  - descr: discard a tile from player's hand/tiles
  - call to client: display tiles -- to the player via socket id
- steal
  - data: pID (string), name (string), room (string) -- player ID, player name, room name
  - descr: steal the most recently discarded tile
  - call to client: display tiles -- to the player via socket id
- reveal
  - data: pID (string), name (string), room (string), tiles (list of strings) -- player ID, player name, room name, list of tiles to reveal
  - descr: reveal completed set
  - call to client: display tiles -- to the player via socket id
- cancel
  - data: pID (string), name (string), room (string) -- player ID, player name, room name
  - descr: remove the stolen tile from player's hand and return it to discard pile -- any player may now steal the discarded tile again
  - call to client: display tiles
- win
  - data: pId (string), name (string), room (string) -- player ID, player name, room name
  - descr: checks if total tile count it at least 14 for potential win, and returns message to client
  - call to client: won, message
- reset
  - data: room (string) -- room name
  - descr: reset game room's field, e.g. tiles, discarded, etc. to prep in the case the players want to play again; also removes players from the players list

Helper Functions
 - createRoom
  - param: r (string) -- room name
  - return: {Object} -- Room 
  - descr: creates a Room object and adds to the ROOMS dict 
 - createPlayer
  - param: p (string), s (string) -- player name and socket id
  - return: {Object} -- Player 
  - descr: creates a Player object and adds to the PLAYERS dict 
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
  - param: t (string) -- the tile that needs to be included in a
  - return: (boolean) -- true if each tile is identical, false if not
  - descr: checks to see if each tile in the array is identical
- isConsecutive
  - param: a (array) -- the list of tiles (string)
  - param: t (string) -- the tile that needs to be included in a
  - return: (boolean) -- true if each tile is identical, false if not
  - descr: checks to see if each tile in the array is consecutive within the same suite

 
 #### Note:
 Room name and room code are synonymous 

## Client
### join.js
#### Fields
- socket
#### Functions
Socket Functions
- roomCreated -- within makeNew.onclick
  - data: message (boolean) -- status on whether to create room or not
  - descr: redirects to waiting room (game.html)
- joined -- within joinRoom.onclick
  - data: message (string) -- status on whether to join room or not
  - descr: redirects to waiting room (game.html)

Event Functions
- makeNew.onclick
  - descr: when a user clicks on the "new" button, create a new room (after doing error checking) via server and redirect page
  - call to server: createRoom
  - socket function: roomCreated
- joinRoom.onclick
  - descr: when a user clicks the "join" button, join the specific room (after doing error checking) via server and redirect page
  - call to server: joinRoom
  - socket function: joined

Helper Functions
- displayError
  - param: name (string), room (string) -- document element value of name and room
  - return: boolean -- true if there is an error with the name and room input, false otherwise
  - descr: display error message(s) if name or room code input is not filled
- resetError
  - param: N/A
  - return: N/A
  - descr: remove error message(s) for the name or room code input

### games.js
#### Fields
- socket
- room  -- room code
- name  -- player's name
- active -- boolean for curent player's turn
- players -- list of all players in the room [me, left, top, right]
- state -- determines which buttons are active (Waiting, InTurn, Discard, Reveal, Four, MeWin, TheyWin
- selected -- list of selected tiles in hand by id (specifically for choose() function)
- tiles -- list of players tiles
- winner

#### Functions
Socket Functions
- start -- within start.onclick
  - data: message (boolean) -- true to start game, false to display error
  - descr: hide waiting area and display hiden game to proceed; also deals the tiles and the first player (player who clicked start) draws another tile
  - call to server: deal, active true, draw
- start 
  - data: message (boolean) -- true to start game, false to display error
  - descr: hide waiting area and display hiden game to proceed (for every other player who did not click start button)
- newPlay
  - data: players (array of strings), error (string) -- list of players associated with the room and error message
  - descr: displays players who have joined the game in the waiting list or the error message
- display  tiles
  - data: tiles (array of strings), message (string) -- list/dict of the player's tiles/hand and the message/description of the tiles 
  - descr: display the player's tiles/hand
- update discard
  - data: tile (string) -- tile last discarded
  - descr: change the discard pile on each screen to highlight last discarded
- change state
  - data: names (Array), state (string) -- list of player names that should change to named state
  - descr: changes the state of this client if Name exists in the list
- active
  - data: playerT (string), playerF (string) -- name of players who turn active and inactive
  - descr: changes asterick display based on who is active and who isn't
- message
  - data: message (string) -- message to print
  - descr: display message on player's console
- won
  - data: name (string), tiles (string array), revealed (array of string arrays) -- winning player's name, winning player's tiles in hand, winning player's revealed tiles
  - descr: display winning details on console
- to finish
  - data: N/A
  -descr: write to html and change display to finished

Event Functions
- start.onclick
  - descr: when someone clicks the start button...
  - call to server: startGame
  - socket function: start
    - call to server: deal, active true, draw
- leave.onclick
  - descr: leave the room if the player clicks the "leave" button
  - call to server: leave
- draw.onclick
  - descr: draw a tile
  - call to server: draw
- discard.onclick
  - descr: discard tile based on tile id  -- NOTE, ANOTHER OPTION WE CAN DO IS REMOVE BASED ON INDEX
  - call to server: discard, active switch
- steal.onclick
  - descr: steal the discarded tile
  - call to server: steal, active switch steal
- reveal.onclick
  - descr: reveal the completed set due to stealing the discarded tile
  - call to server: reveal
- cancel.onclick
  - descr: cancels the steal, so return stolen tile and change active status
  - call to server: cancel, active switch cancel
- win.onclick
- reject.onclick
  - descr: rejects someone's win and proceed with game
  - call to server: N/A
- accept.onclick
  - descr: accepts someones win and resets game state as well as display ending credits
  - call to server: reset
- again.onclick
  -descr: redirects to the waiting room 
  - call to server: joinRoom, newJoin
    - so, creates a new player, because previously w accept.onclick(), we call reset, which deletes the Players

Helper Functions
- clearBoard
  - descr: clears the discard highlights
- choose
  - descr: decides what happens when you click a tile based on State
  - param: tile name, id number
- changeState
  - descr: changes buttons based on State
  - param: state name

### Note:
games.js calls newJoin in the very beginning 

## Logic/Flow
Home Page
- Note: need to put down a name and room code
- If you click "Create Game"
  - w/ a new game code
    1) client (join.js): makeNew.onclick()
    2) server: createRoom -- data { message: true }
    3) client (join.js): roomCreated  -- redirect to game.html
  - w/ an existing game code
    1) client (join.js): makeNew.onclick()
    2) server: createRoom -- data { message: false }
    3) client (join.js): roomCreated  -- print error
  - w/out a game code or name     -- need to make sure that form needs to be filled
    1) client (join.js): makeNew.onclick()
    2) server: createRoom -- data { message: true }
    3) client (join.js): roomCreated  -- empty query, but redirected
- If you click "Join Game"
  - w/ an existing game code and a unique name
    1) client (join.js): joinRoom.onclick()
    2) server: joinRoom -- data { message: good }
    3) client (join.js): joined   -- redirect to game.html
  - w/ an existing game code and a taken name
    1) client (join.js): joinRoom.onclick()
    2) server: joinRoom -- data { message: player name is taken. }
    3) client (join.js): joined   -- print error
  - w/ an existing game code, a unique name, and maxed out capacity
    1) client (join.js): joinRoom.onclick()
    2) server: joinRoom -- data { message: room is full. }
    3) client (join.js): joined   -- print error
  - w/ a non-existing game code and a unique name
    1) client (join.js): joinRoom.onclick()
    2) server: joinRoom -- data { message: room does not exist. }
    3) client (join.js): joined   -- print error
  - w/ a non-existing game code and a taken name
    1) client (join.js): joinRoom.onclick()
    2) server: joinRoom -- data { message: room does not exist. }
    3) client (join.js): joined   -- print error
  
Waiting Room <br>
- If you click "start" without 4 players 
  - player who clicked
  - players who didn't click
- If you click "start" with 4 players
  - player who clicked
  - players who didn't click
- If you click "leave"
  - player who clicked
  - players who didn't click
- If you exit the page (disconnect)
  - player who left
  - players who didn't leave
- If you refresh the page
  - player who refreshed
  - players who didn't refresh

Game Room <br>
- If you click "draw"
  - on your turn
  - not on your turn
- If you click "discard"
  - on your turn
  - not on your turn 
- If you click on "steal"
  - when steal flag is false
  - when steal flag is true
    - on your turn
    - not on your turn
- If you click on "reveal"
- If you click on "cancel"
- If you click on "win"
- If you refresh the page
- If you leave the page (disconnect)
  
Note: the waiting room and game room is the same html page


players: -- person who clicks start goes first. player order: in order of who entered the room

<br>
how do turns work?


<br>
default buttons:
- draw
- steal


on draw
- discard
- win


on steal
- reveal
- cancel
- win


on reveal
- discard
- win


on cancel
- **change active status**
- draw 
- steal

steal flag
- true when player discards
- false when player draws
- false when player stea;s
- true when player cancels


game.js states:
- nothing 
  - disables buttons
- steal
  - enables steal button
- inturn
  - enable steal or draw
- discard 
  - happens right after you draw, so enable discard button
- reveal
  - enable reveal button
- four
  - when you reveal four, you have an extra chance to draw
  - so, enable draw
  
  
On refresh:
- set names at start
- set tiles at 'display tiles'
- set revealed at 'display revealed'
- DO I WANT TO KEEP EVERYTHING CONSISTENT BY USING 'SET SESSIONSTORAGE' OR DOES IT NOT MATTER?
