const socket = io();
let playerSymbol = null;
let currentPlayer = null;
let gameActive = false;
let board = []; // Initialize as an empty array
let boardSize = 3; // Default board size
let roomId = null;

const status = document.getElementById('status');
const playAgainBtn = document.getElementById('playAgain');
const boardContainer = document.getElementById('board');

// Function to create the board dynamically
function createBoard(size) {
    boardSize = size;
    board = Array(size * size).fill(null); // Initialize board array
    boardContainer.innerHTML = ''; // Clear existing board

    // Create the grid cells
    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.setAttribute('data-index', i);
        cell.addEventListener('click', () => {
            if (gameActive && currentPlayer === playerSymbol && board[i] === null) {
                socket.emit('tictactoeMove', {
                    roomId,
                    position: i
                });
            }
        });
        boardContainer.appendChild(cell);
    }
}

// Join game when page loads
socket.emit('joinTicTacToe');

socket.on('playerAssigned', (data) => {
    playerSymbol = data.symbol;
    roomId = data.roomId;
    createBoard(3); // Create a 3x3 board by default
    if (data.waiting) {
        status.textContent = 'Waiting for opponent...';
    } else {
        updateStatus();
    }
});

socket.on('gameStart', (data) => {
    gameActive = true;
    currentPlayer = data.currentPlayer;
    board = data.board;
    updateBoard();
    updateStatus();
});

socket.on('gameUpdate', (data) => {
    currentPlayer = data.currentPlayer;
    board = data.board;
    updateBoard();
    updateStatus();
});

socket.on('gameOver', ({ winner }) => {
    gameActive = false;
    if (winner === 'draw') {
        status.textContent = "It's a draw!";
    } else {
        status.textContent = winner === playerSymbol ? 'You won!' : 'You lost!';
    }
    playAgainBtn.style.display = 'block';
});

socket.on('playerDisconnected', () => {
    gameActive = false;
    status.textContent = 'Opponent disconnected';
    playAgainBtn.style.display = 'block';
});

// Update the socket listener for opponent rematch request
socket.on('opponentWantsRematch', () => {
    if (!gameActive) {  // Only show if game is not active
        status.textContent = 'Opponent wants to play again!';
        playAgainBtn.style.display = 'block';
    }
});

// Update the resetGame function
function resetGame() {
    // Clear the board immediately for visual feedback
    board = Array(boardSize * boardSize).fill(null);
    updateBoard();

    // Send reset request to server
    socket.emit('requestNewTicTacToeGame', { roomId });
    playAgainBtn.style.display = 'none';
    status.textContent = 'Waiting for opponent...';
}

playAgainBtn.addEventListener('click', () => {
    resetGame();
});

// Efficient board update
function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
    });
}

function updateStatus() {
    if (!gameActive) {
        return;
    }
    if (currentPlayer === playerSymbol) {
        status.textContent = 'Your turn';
    } else {
        status.textContent = "Opponent's turn";
    }
}
