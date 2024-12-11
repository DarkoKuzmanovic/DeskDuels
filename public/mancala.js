const socket = io();
let playerSide = null;
let isMyTurn = false;
let gameActive = false;
let currentRoomId = null;

// Add constants at the top
const NUM_PITS = 6; // Number of pits per player (excluding stores)

// DOM Elements
const board = document.getElementById("mancala-board");
const gameStatus = document.getElementById("game-status");
const playerSideElement = document.getElementById("player-side");
const leaveGameButton = document.getElementById("leave-game");

// Game state
const gameState = {
  pits: Array(2 * NUM_PITS + 2).fill(4), // Initialize with 4 stones in each pit
  currentPlayer: "A",
};

// Initialize stores to 0
gameState.pits[NUM_PITS] = 0; // Player A's store (index 6)
gameState.pits[2 * NUM_PITS + 1] = 0; // Player B's store (index 13)

// Event Listeners
document.querySelectorAll(".pit").forEach((pit) => {
  pit.addEventListener("click", handlePitClick);

  // Add touch events with better mobile handling
  pit.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault(); // Prevent double-firing of click events
      pit.classList.add("touched");
    },
    { passive: false }
  );

  pit.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      pit.classList.remove("touched");
      handlePitClick(e);
    },
    { passive: false }
  );

  pit.addEventListener("touchcancel", (e) => {
    pit.classList.remove("touched");
  });
});

leaveGameButton.addEventListener("click", () => {
  socket.emit("leaveGame");
  window.location.href = "/";
});

// Prevent zooming on double tap
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  },
  false
);

// Socket event handlers
socket.on("connect", () => {
  socket.emit("joinGame", "mancala");
});

socket.on("gameJoined", ({ side, roomId }) => {
  console.log(`Joined game as ${side} in room ${roomId}`);
  playerSide = side;
  currentRoomId = roomId;
  playerSideElement.textContent = side === "A" ? "Bottom" : "Top";
  gameStatus.textContent = "Waiting for opponent...";
});

socket.on("gameStart", ({ currentPlayer, pits }) => {
  console.log("Game starting:", { currentPlayer, pits });
  gameActive = true;
  gameState.currentPlayer = currentPlayer;
  if (pits) {
    gameState.pits = pits;
  }
  updateBoard();
  updateTurnStatus();
});

socket.on("gameState", (newState) => {
  updateGameState(newState);
});

socket.on("gameOver", ({ winner, pits }) => {
  gameActive = false;

  // Calculate final scores
  const scoreA = pits[6]; // Player A's store
  const scoreB = pits[13]; // Player B's store

  // Show final scores and winner
  gameStatus.textContent = winner
    ? `Game Over! ${winner === playerSide ? "You won" : "Opponent won"} (${scoreA}-${scoreB})!`
    : `Game Over! It's a draw (${scoreA}-${scoreB})!`;
});

// Add error handling for socket events
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  gameStatus.textContent = "Connection error. Please try refreshing the page.";
});

socket.on("playerDisconnected", () => {
  gameActive = false;
  gameStatus.textContent = "Opponent disconnected. Please return to home.";
});

// Game Functions
function handlePitClick(event) {
  if (!gameActive || !isMyTurn) return;
  const pitIndex = parseInt(event.target.dataset.index);
  if (validateMove(pitIndex)) {
    socket.emit("makeMove", { pitIndex });
  }
}

function validateMove(pitIndex) {
  // Check if the pit belongs to the current player
  const isPlayerAPit = pitIndex >= 0 && pitIndex < NUM_PITS;
  const isPlayerBPit = pitIndex >= NUM_PITS + 1 && pitIndex < 2 * NUM_PITS + 1;
  if ((playerSide === "A" && !isPlayerAPit) || (playerSide === "B" && !isPlayerBPit)) return false;
  // Check if the pit is not empty
  if (gameState.pits[pitIndex] === 0) return false;
  return true;
}

function updateGameState(newState) {
  Object.assign(gameState, newState);
  updateBoard();
  updateTurnStatus();
}

function updateBoard() {
  for (let i = 0; i < gameState.pits.length; i++) {
    const pitElement = document.querySelector(`.pit[data-index="${i}"]`);
    if (pitElement) {
      pitElement.textContent = gameState.pits[i];
    } else {
      const storeElement = document.querySelector(`.store-${i === NUM_PITS ? "a" : "b"}`);
      if (storeElement) {
        storeElement.textContent = gameState.pits[i];
      }
    }
  }
  // Highlight active player's side
  const rowA = document.querySelector(".row-a");
  const rowB = document.querySelector(".row-b");
  rowA.classList.toggle("active", gameState.currentPlayer === "A");
  rowB.classList.toggle("active", gameState.currentPlayer === "B");
}

function updateTurnStatus() {
  isMyTurn = gameState.currentPlayer === playerSide;
  gameStatus.textContent = isMyTurn ? "Your turn!" : "Opponent's turn";
}

// Reset game state
function resetGame() {
  if (!currentRoomId) return;

  gameState.pits = Array(2 * NUM_PITS + 2).fill(4);
  gameState.pits[NUM_PITS] = 0; // Player A's store
  gameState.pits[2 * NUM_PITS + 1] = 0; // Player B's store
  gameState.currentPlayer = "A";
  gameActive = true;

  updateBoard();
  socket.emit("requestNewMancalaGame", { roomId: currentRoomId });
}
