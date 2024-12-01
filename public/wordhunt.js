const socket = io();
let playerWords = new Set();
let opponentWords = new Set();
let currentWord = '';
let selectedCells = [];
let gameActive = false;
let boardData = [];
let timeLeft = 180; // 3 minutes in seconds
let timerInterval;

// DOM Elements
const board = document.getElementById('board');
const gameStatus = document.getElementById('game-status');
const playerScoreElement = document.getElementById('player-score');
const opponentScoreElement = document.getElementById('opponent-score');
const playerWordsList = document.getElementById('player-words');
const opponentWordsList = document.getElementById('opponent-words');
const currentWordElement = document.getElementById('current-word');
const timerElement = document.getElementById('timer');
const playAgainBtn = document.getElementById('play-again');

// Constants
const BOARD_SIZE = 4;
const MIN_WORD_LENGTH = 3;
const POINTS = {
    3: 1,
    4: 1,
    5: 2,
    6: 3,
    7: 5,
    8: 11
};

// Initialize the game board
function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'letter-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            board.appendChild(cell);
        }
    }
}

// Update the board with new letters
function updateBoard(letters) {
    boardData = letters;
    const cells = board.getElementsByClassName('letter-cell');
    for (let i = 0; i < cells.length; i++) {
        const row = Math.floor(i / BOARD_SIZE);
        const col = i % BOARD_SIZE;
        cells[i].textContent = letters[row][col];
    }
}

// Handle mouse/touch events for word selection
function handleCellSelection(event) {
    if (!gameActive) return;
    
    const cell = event.target.closest('.letter-cell');
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Check if the cell is adjacent to the last selected cell
    if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1];
        const rowDiff = Math.abs(lastCell.row - row);
        const colDiff = Math.abs(lastCell.col - col);
        if (rowDiff > 1 || colDiff > 1) return;
    }

    // Toggle cell selection
    if (!cell.classList.contains('selected')) {
        cell.classList.add('selected');
        selectedCells.push({ row, col });
        currentWord += boardData[row][col];
        currentWordElement.textContent = currentWord;
    }
}

function handleWordSubmission() {
    if (currentWord.length >= MIN_WORD_LENGTH) {
        socket.emit('submitWord', currentWord.toLowerCase());
    }
    
    // Reset selection
    selectedCells.forEach(({ row, col }) => {
        const cell = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.remove('selected');
    });
    selectedCells = [];
    currentWord = '';
    currentWordElement.textContent = '';
}

// Update the score display
function updateScore() {
    let playerScore = calculateScore(playerWords);
    let opponentScore = calculateScore(opponentWords);
    playerScoreElement.textContent = `Your Score: ${playerScore}`;
    opponentScoreElement.textContent = `Opponent Score: ${opponentScore}`;
}

// Calculate score based on word lengths
function calculateScore(words) {
    return Array.from(words).reduce((score, word) => {
        const length = Math.min(word.length, 8);
        return score + (POINTS[length] || POINTS[8]);
    }, 0);
}

// Update the word lists display
function updateWordLists() {
    playerWordsList.innerHTML = Array.from(playerWords)
        .sort()
        .map(word => `<li>${word}</li>`)
        .join('');
    
    opponentWordsList.innerHTML = Array.from(opponentWords)
        .sort()
        .map(word => `<li>${word}</li>`)
        .join('');
}

// Timer functions
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            socket.emit('gameOver');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Event Listeners
board.addEventListener('mousedown', handleCellSelection);
board.addEventListener('mouseover', event => {
    if (event.buttons === 1) { // Left mouse button is pressed
        handleCellSelection(event);
    }
});
document.addEventListener('mouseup', handleWordSubmission);

playAgainBtn.addEventListener('click', () => {
    socket.emit('requestNewGame');
});

// Socket event handlers
socket.on('connect', () => {
    socket.emit('joinWordHunt');
});

socket.on('gameStart', ({ letters }) => {
    gameActive = true;
    playerWords.clear();
    opponentWords.clear();
    timeLeft = 180;
    updateBoard(letters);
    updateWordLists();
    updateScore();
    startTimer();
    gameStatus.textContent = 'Game Started!';
});

socket.on('wordAccepted', ({ word, isOpponent }) => {
    if (isOpponent) {
        opponentWords.add(word);
    } else {
        playerWords.add(word);
    }
    updateWordLists();
    updateScore();
});

socket.on('gameOver', ({ playerScore, opponentScore }) => {
    gameActive = false;
    clearInterval(timerInterval);
    
    const result = playerScore > opponentScore ? 'You won!' :
                  playerScore < opponentScore ? 'You lost!' :
                  "It's a tie!";
    
    gameStatus.textContent = `Game Over! ${result}`;
    playAgainBtn.style.display = 'block';
});

// Initialize the board when the page loads
createBoard();

// Dark theme toggle functionality
const themeToggle = document.querySelector('.theme-toggle');
const lightIcon = document.querySelector('.theme-light-icon');
const darkIcon = document.querySelector('.theme-dark-icon');
const html = document.documentElement;

// Check for saved theme preference, otherwise use system preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    html.dataset.theme = savedTheme;
    updateThemeIcons(savedTheme);
} else {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    html.dataset.theme = systemTheme;
    updateThemeIcons(systemTheme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = html.dataset.theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
});

function updateThemeIcons(theme) {
    if (theme === 'dark') {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    } else {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
    }
}
