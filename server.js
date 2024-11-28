const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

// Game rooms for different games
const tictactoeRooms = new Map();
const connect4Rooms = new Map();

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
          .map(() => Array(7).fill(null)),
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
    if (board[row][column] === null) {
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
  return board[0].every((cell) => cell !== null);
}

const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
