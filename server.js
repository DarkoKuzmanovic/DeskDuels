const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// Game rooms for different games
const tictactoeRooms = new Map();
const connect4Rooms = new Map();
const mancalaRooms = new Map();
const wordHuntRooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // TicTacToe game logic
  socket.on("joinTicTacToe", () => {
    let roomId = null;

    // Find an available room
    for (const [id, room] of tictactoeRooms.entries()) {
      if (room.players.length === 1) {
        roomId = id;
        break;
      }
    }

    // Create new room if none available
    if (!roomId) {
      roomId = "tictactoe_" + Math.random().toString(36).substring(7);
      tictactoeRooms.set(roomId, {
        players: [],
        board: Array(9).fill(null),
        currentPlayer: "X",
      });
    }

    const room = tictactoeRooms.get(roomId);
    const playerSymbol = room.players.length === 0 ? "X" : "O";
    room.players.push(socket.id);
    socket.join(roomId);

    socket.emit("playerAssigned", {
      symbol: playerSymbol,
      roomId: roomId,
      board: room.board,
      currentPlayer: room.currentPlayer,
      waiting: room.players.length === 1
    });

    if (room.players.length === 2) {
      io.to(roomId).emit("gameStart", {
        board: room.board,
        currentPlayer: room.currentPlayer,
      });
    }
  });

  socket.on("tictactoeMove", ({ roomId, position }) => {
    const room = tictactoeRooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    const playerSymbol = playerIndex === 0 ? "X" : "O";

    if (playerSymbol !== room.currentPlayer) return;
    if (room.board[position] !== null) return;

    room.board[position] = playerSymbol;
    room.currentPlayer = room.currentPlayer === "X" ? "O" : "X";

    io.to(roomId).emit("gameUpdate", {
      board: room.board,
      currentPlayer: room.currentPlayer,
    });

    const winner = checkTicTacToeWinner(room.board);
    if (winner || room.board.every((cell) => cell !== null)) {
      io.to(roomId).emit("gameOver", { winner });
      tictactoeRooms.delete(roomId);
    }
  });

  // Connect4 game logic
  socket.on("joinConnect4", () => {
    let roomId = null;

    // Find an available room
    for (const [id, room] of connect4Rooms.entries()) {
      if (room.players.length === 1) {
        roomId = id;
        break;
      }
    }

    // Create new room if none available
    if (!roomId) {
      roomId = "connect4_" + Math.random().toString(36).substring(7);
      connect4Rooms.set(roomId, {
        players: [],
        board: Array(6)
          .fill()
          .map(() => Array(7).fill('')),
        currentPlayer: "red",
      });
    }

    const room = connect4Rooms.get(roomId);
    const playerColor = room.players.length === 0 ? "red" : "yellow";
    room.players.push(socket.id);
    socket.join(roomId);

    socket.emit("playerAssigned", {
      color: playerColor,
      roomId: roomId,
      board: room.board,
      currentPlayer: room.currentPlayer,
      waiting: room.players.length === 1
    });

    if (room.players.length === 2) {
      io.to(roomId).emit("gameStart", {
        board: room.board,
        currentPlayer: room.currentPlayer,
      });
    }
  });

  socket.on("connect4Move", ({ roomId, column }) => {
    const room = connect4Rooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    const playerColor = playerIndex === 0 ? "red" : "yellow";

    if (playerColor !== room.currentPlayer) return;

    // Find the lowest empty row in the selected column
    const row = findLowestEmptyRow(room.board, column);
    if (row === -1) return; // Column is full

    room.board[row][column] = playerColor;
    room.currentPlayer = room.currentPlayer === "red" ? "yellow" : "red";

    io.to(roomId).emit("gameUpdate", {
      board: room.board,
      currentPlayer: room.currentPlayer,
    });

    const winner = checkConnect4Winner(room.board);
    if (winner || isConnect4BoardFull(room.board)) {
      io.to(roomId).emit("gameOver", { winner });
      connect4Rooms.delete(roomId);
    }
  });

  // Mancala game logic
  socket.on("joinGame", (gameType) => {
    if (gameType === "mancala") {
      let roomId = null;

      // Find an available Mancala room
      for (const [id, room] of mancalaRooms.entries()) {
        if (room.players.length === 1) {
          roomId = id;
          break;
        }
      }

      // Create new room if none available
      if (!roomId) {
        roomId = "mancala_" + Math.random().toString(36).substring(7);
        mancalaRooms.set(roomId, {
          players: [],
          pits: Array(14).fill(4), // Initialize all pits with 4 stones
          currentPlayer: "A",
        });
        // Set stores to 0
        const room = mancalaRooms.get(roomId);
        room.pits[6] = 0;  // Player A's store
        room.pits[13] = 0; // Player B's store
      }

      const room = mancalaRooms.get(roomId);
      const playerSide = room.players.length === 0 ? "A" : "B";
      room.players.push({ id: socket.id, side: playerSide });
      socket.join(roomId);

      socket.emit("gameJoined", {
        side: playerSide,
        roomId: roomId,
      });

      if (room.players.length === 2) {
        io.to(roomId).emit("gameStart", {
          currentPlayer: room.currentPlayer,
          pits: room.pits,
        });
      }
    }
  });

  socket.on("makeMove", ({ pitIndex }) => {
    // Find the room this socket is in
    let currentRoom = null;
    let roomId = null;

    for (const [id, room] of mancalaRooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        currentRoom = room;
        roomId = id;
        break;
      }
    }

    if (!currentRoom) return;

    const player = currentRoom.players.find(p => p.id === socket.id);
    if (player.side !== currentRoom.currentPlayer) return;

    // Validate move
    if (currentRoom.pits[pitIndex] === 0) return;
    if (player.side === "A" && (pitIndex < 0 || pitIndex > 5)) return;
    if (player.side === "B" && (pitIndex < 7 || pitIndex > 12)) return;

    // Perform the move
    let stones = currentRoom.pits[pitIndex];
    console.log(`Moving ${stones} stones from pit ${pitIndex}`);
    currentRoom.pits[pitIndex] = 0;
    let lastPitIndex = pitIndex;

    // Distribute stones counterclockwise
    while (stones > 0) {
      // Calculate next pit in counterclockwise direction
      if (lastPitIndex >= 0 && lastPitIndex <= 5) {
        // Moving right in bottom row
        lastPitIndex++;
      } else if (lastPitIndex === 6) {
        // From A's store to top row
        lastPitIndex = 7;
      } else if (lastPitIndex >= 7 && lastPitIndex <= 11) {
        // Moving right in top row
        lastPitIndex++;
      } else if (lastPitIndex === 12) {
        // From rightmost top pit to B's store
        lastPitIndex = 13;
      } else if (lastPitIndex === 13) {
        // From B's store to bottom row
        lastPitIndex = 0;
      }

      // Skip opponent's store
      if ((player.side === "A" && lastPitIndex === 13) ||
          (player.side === "B" && lastPitIndex === 6)) {
        continue;
      }

      console.log(`Placing stone in pit ${lastPitIndex}`);
      // Add stone to the pit and decrement stones
      currentRoom.pits[lastPitIndex]++;
      stones--;
    }

    // Check for capture
    if (currentRoom.pits[lastPitIndex] === 1) {
      console.log(`Last stone landed in pit ${lastPitIndex} with 1 stone`);
      const isPlayerSide = (player.side === "A" && lastPitIndex >= 0 && lastPitIndex <= 5) ||
                          (player.side === "B" && lastPitIndex >= 7 && lastPitIndex <= 12);
      console.log(`Is player side: ${isPlayerSide}, Player: ${player.side}`);
      if (isPlayerSide) {
        // Calculate opposite index based on the ending position
        const oppositeIndex = lastPitIndex <= 5 ? lastPitIndex + 7 : lastPitIndex - 7;
        console.log(`Checking capture: Last pit ${lastPitIndex}, opposite pit ${oppositeIndex}`);
        console.log(`Stones in opposite pit: ${currentRoom.pits[oppositeIndex]}`);
        if (currentRoom.pits[oppositeIndex] > 0) {
          const playerStore = player.side === "A" ? 6 : 13;
          const capturedStones = currentRoom.pits[oppositeIndex] + 1;
          currentRoom.pits[playerStore] += capturedStones;
          currentRoom.pits[oppositeIndex] = 0;
          currentRoom.pits[lastPitIndex] = 0;
          console.log(`Captured ${capturedStones} stones to store ${playerStore}`);
        }
      }
    } else {
      console.log(`Last stone landed in pit ${lastPitIndex} with ${currentRoom.pits[lastPitIndex]} stones`);
    }

    // Check if game is over
    const isGameOver = checkMancalaGameOver(currentRoom.pits);
    if (isGameOver) {
      // Move remaining stones to respective stores
      for (let i = 0; i <= 5; i++) {
        currentRoom.pits[6] += currentRoom.pits[i];
        currentRoom.pits[i] = 0;
      }
      for (let i = 7; i <= 12; i++) {
        currentRoom.pits[13] += currentRoom.pits[i];
        currentRoom.pits[i] = 0;
      }

      // Determine winner
      const winner = currentRoom.pits[6] > currentRoom.pits[13] ? "A" :
                    currentRoom.pits[6] < currentRoom.pits[13] ? "B" : null;

      io.to(roomId).emit("gameOver", {
        winner: winner,
        pits: currentRoom.pits
      });
      
      // Clean up the room
      mancalaRooms.delete(roomId);
    } else {
      // Check for extra turn (last stone in player's store)
      const playerStore = player.side === "A" ? 6 : 13;
      if (lastPitIndex !== playerStore) {
        currentRoom.currentPlayer = currentRoom.currentPlayer === "A" ? "B" : "A";
      }

      io.to(roomId).emit("gameState", {
        currentPlayer: currentRoom.currentPlayer,
        pits: currentRoom.pits
      });
    }
  });

  // Word Hunt game logic
  socket.on("joinWordHunt", () => {
    console.log("Player joining Word Hunt:", socket.id);
    let roomId = null;

    // Find an available room
    for (const [id, room] of wordHuntRooms.entries()) {
      if (room.players.length === 1) {
        roomId = id;
        console.log("Found existing room:", roomId);
        break;
      }
    }

    // Create new room if none available
    if (!roomId) {
      roomId = "wordhunt_" + Math.random().toString(36).substring(7);
      console.log("Creating new room:", roomId);
      wordHuntRooms.set(roomId, {
        players: [],
        letters: generateBoard(),
        playerWords: new Map(),
      });
    }

    const room = wordHuntRooms.get(roomId);
    room.players.push(socket.id);
    socket.join(roomId);
    console.log(`Player ${socket.id} joined room ${roomId}. Players in room: ${room.players.length}`);

    if (room.players.length === 2) {
      console.log("Starting game in room:", roomId);
      io.to(roomId).emit("gameStart", {
        letters: room.letters
      });
    }
  });

  socket.on("submitWord", async (word) => {
    // Find the room this socket is in
    let currentRoom = null;
    let roomId = null;

    for (const [id, room] of wordHuntRooms.entries()) {
      if (room.players.includes(socket.id)) {
        currentRoom = room;
        roomId = id;
        break;
      }
    }

    if (!currentRoom) return;

    const playerIndex = currentRoom.players.indexOf(socket.id);
  
    // Validate the word
    if (await isValidWord(word) && !currentRoom.playerWords.has(word)) {
      currentRoom.playerWords.set(word, playerIndex);
      
      // Emit to all players, setting isOpponent based on each player's perspective
      currentRoom.players.forEach((playerId, idx) => {
        io.to(playerId).emit("wordAccepted", {
          word: word,
          isOpponent: idx !== playerIndex
        });
      });
    }
  });

  socket.on("gameOver", () => {
    // Find the room this socket is in
    for (const [roomId, room] of wordHuntRooms.entries()) {
      if (room.players.includes(socket.id)) {
        // Calculate final scores
        const scores = [0, 0];
        room.playerWords.forEach((playerIndex, word) => {
          const length = Math.min(word.length, 8);
          const points = {
            3: 1, 4: 1, 5: 2, 6: 3, 7: 5, 8: 11
          }[length] || 11;
          scores[playerIndex] += points;
        });

        io.to(roomId).emit("gameOver", {
          playerScore: scores[0],
          opponentScore: scores[1]
        });
        
        wordHuntRooms.delete(roomId);
        break;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Handle TicTacToe disconnection
    for (const [roomId, room] of tictactoeRooms.entries()) {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("playerDisconnected");
        tictactoeRooms.delete(roomId);
      }
    }

    // Handle Connect4 disconnection
    for (const [roomId, room] of connect4Rooms.entries()) {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("playerDisconnected");
        connect4Rooms.delete(roomId);
      }
    }

    // Handle Mancala disconnection
    for (const [roomId, room] of mancalaRooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        io.to(roomId).emit("playerDisconnected");
        mancalaRooms.delete(roomId);
      }
    }

    // Handle Word Hunt disconnection
    for (const [roomId, room] of wordHuntRooms.entries()) {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("playerDisconnected");
        wordHuntRooms.delete(roomId);
      }
    }
  });
});

// Helper functions for TicTacToe
function checkTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Helper functions for Connect4
function findLowestEmptyRow(board, column) {
  for (let row = 5; row >= 0; row--) {
    if (board[row][column] === '') {
      return row;
    }
  }
  return -1;
}

function checkConnect4Winner(board) {
  // Check horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        board[row][col] &&
        board[row][col] === board[row][col + 1] &&
        board[row][col] === board[row][col + 2] &&
        board[row][col] === board[row][col + 3]
      ) {
        return board[row][col];
      }
    }
  }

  // Check vertical
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      if (
        board[row][col] &&
        board[row][col] === board[row + 1][col] &&
        board[row][col] === board[row + 2][col] &&
        board[row][col] === board[row + 3][col]
      ) {
        return board[row][col];
      }
    }
  }

  // Check diagonal (positive slope)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        board[row][col] &&
        board[row][col] === board[row + 1][col + 1] &&
        board[row][col] === board[row + 2][col + 2] &&
        board[row][col] === board[row + 3][col + 3]
      ) {
        return board[row][col];
      }
    }
  }

  // Check diagonal (negative slope)
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      if (
        board[row][col] &&
        board[row][col] === board[row - 1][col + 1] &&
        board[row][col] === board[row - 2][col + 2] &&
        board[row][col] === board[row - 3][col + 3]
      ) {
        return board[row][col];
      }
    }
  }

  return null;
}

function isConnect4BoardFull(board) {
  return board[0].every((cell) => cell !== '');
}

// Helper function for Mancala
function checkMancalaGameOver(pits) {
  let aSideEmpty = true;
  let bSideEmpty = true;

  // Check A's side (pits 0-5)
  for (let i = 0; i <= 5; i++) {
    if (pits[i] > 0) {
      aSideEmpty = false;
      break;
    }
  }

  // Check B's side (pits 7-12)
  for (let i = 7; i <= 12; i++) {
    if (pits[i] > 0) {
      bSideEmpty = false;
      break;
    }
  }

  return aSideEmpty || bSideEmpty;
}

// Helper function to generate the Word Hunt board
function generateBoard() {
  const board = [];
  const dice = [
    'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS',
    'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
    'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW',
    'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ'
  ];
  
  // Shuffle the dice
  for (let i = dice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  
  // Create 4x4 board
  for (let i = 0; i < 4; i++) {
    const row = [];
    for (let j = 0; j < 4; j++) {
      const die = dice[i * 4 + j];
      const letter = die[Math.floor(Math.random() * 6)];
      row.push(letter);
    }
    board.push(row);
  }
  
  return board;
}

// Helper function to validate words using an API
async function isValidWord(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    return response.ok;
  } catch (error) {
    console.error('Error validating word:', error);
    return false;
  }
}

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
