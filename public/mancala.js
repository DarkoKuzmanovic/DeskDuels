const socket = io();
let playerSide = null;
let isMyTurn = false;
let gameActive = false;

// DOM Elements
const board = document.getElementById('mancala-board');
const gameStatus = document.getElementById('game-status');
const playerSideElement = document.getElementById('player-side');
const leaveGameButton = document.getElementById('leave-game');

// Game state
const gameState = {
    pits: Array(14).fill(4), // 0-5: Player A pits, 6: A's store, 7-12: Player B pits, 13: B's store
    currentPlayer: 'A'
};

// Initialize stores with 0 stones
gameState.pits[6] = 0;  // Player A's store
gameState.pits[13] = 0; // Player B's store

// Event Listeners
document.querySelectorAll('.pit').forEach(pit => {
    pit.addEventListener('click', handlePitClick);
});

leaveGameButton.addEventListener('click', () => {
    socket.emit('leaveGame');
    window.location.href = '/';
});

// Socket event handlers
socket.on('connect', () => {
    socket.emit('joinGame', 'mancala');
});

socket.on('gameJoined', ({ side }) => {
    playerSide = side;
    playerSideElement.textContent = side === 'A' ? 'Bottom' : 'Top';
    gameStatus.textContent = 'Waiting for opponent...';
});

socket.on('gameStart', ({ currentPlayer }) => {
    gameActive = true;
    gameState.currentPlayer = currentPlayer;
    updateTurnStatus();
});

socket.on('gameState', (newState) => {
    updateGameState(newState);
});

socket.on('gameOver', ({ winner }) => {
    gameActive = false;
    gameStatus.textContent = winner 
        ? `Game Over! ${winner === playerSide ? 'You won!' : 'Opponent won!'}`
        : 'Game Over! It\'s a draw!';
});

// Game Functions
function handlePitClick(event) {
    if (!gameActive || !isMyTurn) return;

    const pitIndex = parseInt(event.target.dataset.index);
    const isValidMove = validateMove(pitIndex);

    if (isValidMove) {
        socket.emit('makeMove', { pitIndex });
    }
}

function validateMove(pitIndex) {
    if (playerSide === 'A' && (pitIndex < 0 || pitIndex > 5)) return false;
    if (playerSide === 'B' && (pitIndex < 7 || pitIndex > 12)) return false;
    if (gameState.pits[pitIndex] === 0) return false;
    return true;
}

function updateGameState(newState) {
    Object.assign(gameState, newState);
    updateBoard();
    updateTurnStatus();
}

function updateBoard() {
    // Update pits
    document.querySelectorAll('.pit').forEach(pit => {
        const index = parseInt(pit.dataset.index);
        pit.textContent = gameState.pits[index];
    });

    // Update stores
    document.querySelector('.store-a').textContent = gameState.pits[6];
    document.querySelector('.store-b').textContent = gameState.pits[13];

    // Highlight active player's side
    const rowA = document.querySelector('.row-a');
    const rowB = document.querySelector('.row-b');
    rowA.classList.toggle('active', gameState.currentPlayer === 'A');
    rowB.classList.toggle('active', gameState.currentPlayer === 'B');
}

function updateTurnStatus() {
    isMyTurn = gameState.currentPlayer === playerSide;
    gameStatus.textContent = isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
}
