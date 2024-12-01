const socket = io();
let playerSymbol = null;
let currentPlayer = null;
let gameActive = false;
let board = Array(9).fill(null);
let roomId = null;

const cells = document.querySelectorAll('.cell');
const status = document.getElementById('status');
const playAgainBtn = document.getElementById('playAgain');

// Join game when page loads
socket.emit('joinTicTacToe');

socket.on('playerAssigned', (data) => {
    playerSymbol = data.symbol;  // 'X' or 'O'
    roomId = data.roomId;
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

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        const index = parseInt(cell.getAttribute('data-index'));
        
        if (gameActive && currentPlayer === playerSymbol && board[index] === null) {
            socket.emit('tictactoeMove', {
                roomId,
                position: index
            });
        }
    });
});

playAgainBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

function updateBoard() {
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
