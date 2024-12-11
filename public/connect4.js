const socket = io();
let playerColor = null;
let currentPlayer = false;
let gameActive = false;
let gameState = Array(6)
  .fill()
  .map(() => Array(7).fill(""));
const ROWS = 6;
const COLS = 7;
let roomId = null;

const cells = document.querySelectorAll(".cell");
const status = document.getElementById("status");
const playAgainBtn = document.getElementById("playAgain");
const board = document.getElementById("board");

// Join game when page loads
socket.emit("joinConnect4");

socket.on(
  "playerAssigned",
  ({ color, roomId: roomIdReceived, board: boardState, currentPlayer: currentTurn, waiting }) => {
    playerColor = color;
    roomId = roomIdReceived;
    gameState = boardState;

    if (waiting) {
      status.textContent = "Waiting for opponent...";
      gameActive = false;
    } else {
      gameActive = true;
      currentPlayer = color === currentTurn;
      updateBoard();
      updateStatus();
    }
  }
);

socket.on("gameStart", ({ board: boardState, currentPlayer: currentTurn }) => {
  gameActive = true;
  gameState = boardState;
  currentPlayer = playerColor === currentTurn;
  updateBoard();
  updateStatus();
});

socket.on("gameUpdate", ({ board: boardState, currentPlayer: currentTurn }) => {
  gameState = boardState;
  currentPlayer = playerColor === currentTurn;
  updateBoard();
  updateStatus();
});

socket.on("gameOver", ({ winner }) => {
  gameActive = false;
  if (winner) {
    status.textContent = winner === playerColor ? "You won!" : "Opponent won!";
  } else {
    status.textContent = "It's a tie!";
  }
  playAgainBtn.style.display = "block";
});

// Add hover effect for columns
let currentColumn = -1;
board.addEventListener("mousemove", (e) => {
  if (!gameActive || !currentPlayer) return;

  const cell = e.target.closest(".cell");
  if (!cell) return;

  const index = parseInt(cell.dataset.index);
  const column = index % COLS;

  if (column !== currentColumn) {
    // Remove previous hover effect
    if (currentColumn !== -1) {
      for (let row = 0; row < ROWS; row++) {
        cells[row * COLS + currentColumn].classList.remove("hover");
      }
    }

    // Add new hover effect
    if (getLowestEmptyRow(column) !== -1) {
      for (let row = 0; row < ROWS; row++) {
        cells[row * COLS + column].classList.add("hover");
      }
      currentColumn = column;
    }
  }
});

board.addEventListener("mouseleave", () => {
  if (currentColumn !== -1) {
    for (let row = 0; row < ROWS; row++) {
      cells[row * COLS + currentColumn].classList.remove("hover");
    }
    currentColumn = -1;
  }
});

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    if (!gameActive || !currentPlayer) return;

    const index = parseInt(cell.dataset.index);
    const column = index % COLS;
    const row = getLowestEmptyRow(column);

    if (row !== -1) {
      console.log("Making move:", { roomId, column }); // Debug log
      socket.emit("connect4Move", {
        roomId: roomId,
        column: column,
      });
    }
  });
});

// Reset game state
function resetGame() {
  gameState = Array(6)
    .fill()
    .map(() => Array(7).fill(""));
  gameActive = true;
  updateBoard();
  socket.emit("requestNewConnect4Game", { roomId });
  playAgainBtn.style.display = "none";
}

playAgainBtn.addEventListener("click", () => {
  resetGame();
});

function getLowestEmptyRow(column) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (gameState[row][column] === "") {
      return row;
    }
  }
  return -1;
}

function updateBoard() {
  cells.forEach((cell, index) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    cell.textContent = "";
    cell.classList.remove("player1", "player2");
    const value = gameState[row][col];
    if (value === "red") {
      cell.classList.add("player1");
    } else if (value === "yellow") {
      cell.classList.add("player2");
    }
  });
}

function updateStatus() {
  if (!gameActive) {
    return;
  }
  status.textContent = currentPlayer ? "Your turn" : "Opponent's turn";
}

function checkWinner(board, lastMove) {
  const row = Math.floor(lastMove / COLS);
  const col = lastMove % COLS;
  const player = board[row][col];

  // Check horizontal
  for (let c = 0; c <= COLS - 4; c++) {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (board[row][c + i] === player) {
        count++;
      }
    }
    if (count === 4) return true;
  }

  // Check vertical
  for (let r = 0; r <= ROWS - 4; r++) {
    let count = 0;
    for (let i = 0; i < 4; i++) {
      if (board[r + i][col] === player) {
        count++;
      }
    }
    if (count === 4) return true;
  }

  // Check diagonal (top-left to bottom-right)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      let count = 0;
      for (let i = 0; i < 4; i++) {
        if (board[r + i][c + i] === player) {
          count++;
        }
      }
      if (count === 4) return true;
    }
  }

  // Check diagonal (top-right to bottom-left)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = COLS - 1; c >= 3; c--) {
      let count = 0;
      for (let i = 0; i < 4; i++) {
        if (board[r + i][c - i] === player) {
          count++;
        }
      }
      if (count === 4) return true;
    }
  }

  return false;
}
