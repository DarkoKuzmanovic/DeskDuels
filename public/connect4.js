const socket = io();
let playerNumber = null;  // Add this to track which player number we are
let currentPlayer = false;
let gameActive = false;
let gameState = Array(42).fill('');
const ROWS = 6;
const COLS = 7;

const cells = document.querySelectorAll('.cell');
const status = document.getElementById('status');
const playAgainBtn = document.getElementById('playAgain');
const board = document.getElementById('board');

// Join game when page loads
socket.emit('joinConnect4');

// Add hover effect for columns
let currentColumn = -1;
board.addEventListener('mousemove', (e) => {
    if (!gameActive || !currentPlayer) return;
    
    const cell = e.target.closest('.cell');
    if (!cell) return;
    
    const index = parseInt(cell.dataset.index);
    const column = index % COLS;
    
    if (column !== currentColumn) {
        // Remove previous hover effect
        if (currentColumn !== -1) {
            for (let row = 0; row < ROWS; row++) {
                cells[row * COLS + currentColumn].classList.remove('hover');
            }
        }
        
        // Add new hover effect
        if (getLowestEmptyRow(column) !== -1) {
            for (let row = 0; row < ROWS; row++) {
                cells[row * COLS + column].classList.add('hover');
            }
            currentColumn = column;
        }
    }
});

board.addEventListener('mouseleave', () => {
    if (currentColumn !== -1) {
        for (let row = 0; row < ROWS; row++) {
            cells[row * COLS + currentColumn].classList.remove('hover');
        }
        currentColumn = -1;
    }
});

cells.forEach(cell => {
    cell.addEventListener('click', () => {
        if (!gameActive || !currentPlayer) return;
        
        const index = parseInt(cell.dataset.index);
        const column = index % COLS;
        const row = getLowestEmptyRow(column);
        
        if (row !== -1) {
            const moveIndex = row * COLS + column;
            socket.emit('move', { index: moveIndex });
        }
    });
});

playAgainBtn.addEventListener('click', () => {
    socket.emit('requestNewGame');
});

function getLowestEmptyRow(column) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (gameState[row * COLS + column] === '') {
            return row;
        }
    }
    return -1;
}

function checkWinner(board, lastMove) {
    const row = Math.floor(lastMove / COLS);
    const col = lastMove % COLS;
    const player = board[lastMove];
    
    // Check horizontal
    for (let c = 0; c <= COLS - 4; c++) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
            if (board[row * COLS + (c + i)] === player) {
                count++;
            }
        }
        if (count === 4) return true;
    }

    // Check vertical
    for (let r = 0; r <= ROWS - 4; r++) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
            if (board[(r + i) * COLS + col] === player) {
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
                if (board[(r + i) * COLS + (c + i)] === player) {
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
                if (board[(r + i) * COLS + (c - i)] === player) {
                    count++;
                }
            }
            if (count === 4) return true;
        }
    }

    return false;
}

socket.on('start', ({ player }) => {
    playerNumber = player;  // Store our player number
    currentPlayer = player === 1;  // Player 1 goes first
    gameActive = true;
    gameState = Array(42).fill('');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('player1', 'player2');
    });
    playAgainBtn.style.display = 'none';
    status.textContent = currentPlayer ? 'Your turn' : "Opponent's turn";
});

socket.on('move', ({ index, player }) => {
    gameState[index] = player;
    cells[index].classList.add(player === 1 ? 'player1' : 'player2');
    
    if (checkWinner(gameState, index)) {
        gameActive = false;
        status.textContent = playerNumber === player ? 'You won!' : 'You lost!';
        playAgainBtn.style.display = 'block';
    } else if (gameState.every(cell => cell !== '')) {
        gameActive = false;
        status.textContent = "It's a draw!";
        playAgainBtn.style.display = 'block';
    } else {
        // Update currentPlayer based on whose turn it is
        currentPlayer = playerNumber === (player === 1 ? 2 : 1);
        status.textContent = currentPlayer ? 'Your turn' : "Opponent's turn";
    }
});

socket.on('gameEnd', () => {
    gameActive = false;
    status.textContent = 'Opponent disconnected';
    playAgainBtn.style.display = 'block';
});
