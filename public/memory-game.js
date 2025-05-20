document.addEventListener("DOMContentLoaded", () => {
  // Initialize sound effects
  const sounds = {
    flip: new Audio("sounds/memory-game-res/flipcard.mp3"),
    correct: new Audio("sounds/memory-game-res/correct.mp3"),
    incorrect: new Audio("sounds/memory-game-res/incorrect.mp3"),
  };

  // Sound toggle functionality
  const soundToggle = document.querySelector(".sound-toggle");
  const soundOnIcon = document.querySelector(".sound-on-icon");
  const soundOffIcon = document.querySelector(".sound-off-icon");
  let isSoundMuted = localStorage.getItem("soundMuted") === "true";

  // Update sound icons based on mute state
  function updateSoundIcons(muted) {
    if (muted) {
      soundOnIcon.style.display = "none";
      soundOffIcon.style.display = "block";
    } else {
      soundOnIcon.style.display = "block";
      soundOffIcon.style.display = "none";
    }
  }

  // Initialize sound state
  updateSoundIcons(isSoundMuted);

  // Sound toggle click handler
  soundToggle.addEventListener("click", () => {
    isSoundMuted = !isSoundMuted;
    localStorage.setItem("soundMuted", isSoundMuted);
    updateSoundIcons(isSoundMuted);
  });

  // Function to play sound with error handling
  function playSound(soundName) {
    if (isSoundMuted) return; // Don't play if muted
    try {
      sounds[soundName].currentTime = 0; // Reset sound to start
      sounds[soundName].play().catch((err) => console.log("Sound play failed:", err));
    } catch (err) {
      console.log("Error playing sound:", err);
    }
  }

  const socket = io();
  let roomId = null;
  let myPlayerNum = null;
  let currentPlayerId = null;
  let localBoardState = []; // To store card values for display

  const gameContainer = document.querySelector(".game-container");
  const gameStatusElement = document.getElementById("game-status");
  const playAgainBtn = document.getElementById("play-again-btn");

  const p1ScoreElement = document.getElementById("player-1-score");
  const p2ScoreElement = document.getElementById("player-2-score");
  const turnIndicatorElement = document.getElementById("turn-indicator");

  const imagePath = "images/memory-game-res/"; // Path to your card images

  function updateScores(scores) {
    p1ScoreElement.textContent = `Player 1: ${scores.player1}`;
    p2ScoreElement.textContent = `Player 2: ${scores.player2}`;
  }

  function updateTurnIndicator() {
    if (!currentPlayerId || !myPlayerNum) {
      turnIndicatorElement.textContent = "Waiting...";
      turnIndicatorElement.classList.remove("my-turn");
      return;
    }
    const isMyTurn = socket.id === currentPlayerId;
    turnIndicatorElement.textContent = isMyTurn ? "Your Turn" : "Opponent's Turn";
    if (isMyTurn) {
      turnIndicatorElement.classList.add("my-turn");
    } else {
      turnIndicatorElement.classList.remove("my-turn");
    }
  }

  function createBoard(boardData) {
    gameContainer.innerHTML = "";
    playAgainBtn.style.display = "none";
    localBoardState = boardData.map((card) => ({ ...card, actualValue: null })); // Store card structure, actualValue revealed on flip

    localBoardState.forEach((cardDataFromServer) => {
      const cardElement = document.createElement("div");
      cardElement.classList.add("card");
      cardElement.dataset.id = cardDataFromServer.id; // Use server-provided ID

      const frontFace = document.createElement("div");
      frontFace.classList.add("front-face");
      // frontFace.style.backgroundImage will be set when card is flipped and server sends value

      const backFace = document.createElement("div");
      backFace.classList.add("back-face");
      // No text content needed for back face since we're using an image

      cardElement.appendChild(frontFace);
      cardElement.appendChild(backFace);

      if (cardDataFromServer.isMatched) {
        cardElement.classList.add("matched");
        // If rejoining a game in progress, reveal matched cards & set image
        const cardInBoard = localBoardState.find((c) => c.id === cardDataFromServer.id);
        if (cardInBoard && cardInBoard.actualValue) {
          // Ensure actualValue is known
          frontFace.style.backgroundImage = `url('${imagePath}${cardInBoard.actualValue}.png')`;
          cardElement.classList.add("flipped");
        }
      } else if (cardDataFromServer.isFlipped) {
        // If rejoining, show flipped cards (server should ideally send value here too)
        // For now, this might not show image if value isn't in localBoardState yet
        cardElement.classList.add("flipped");
      }

      cardElement.addEventListener("click", () => handleCardClick(cardDataFromServer.id));
      gameContainer.appendChild(cardElement);
    });
  }

  function handleCardClick(cardId) {
    if (socket.id !== currentPlayerId) {
      gameStatusElement.textContent = "Not your turn!";
      return;
    }
    const cardElement = document.querySelector(`.card[data-id='${cardId}']`);
    if (cardElement.classList.contains("flipped") || cardElement.classList.contains("matched")) {
      return; // Already flipped or matched
    }
    // Optimistically show click, server will confirm
    // cardElement.classList.add("flipped");
    socket.emit("memoryFlipCard", { roomId, cardId });
  }

  // Socket.IO event listeners
  socket.emit("joinMemoryGame");
  gameStatusElement.textContent = "Joining game...";

  socket.on("memoryPlayerAssigned", (data) => {
    roomId = data.roomId;
    myPlayerNum = data.playerNum;
    gameStatusElement.textContent = data.waiting ? "Waiting for an opponent..." : "Opponent found!";
    // Initial board might be sent here if rejoining, or with gameStart
    if (data.board) {
      // Server might send a partial board if one player is waiting.
      // For now, createBoard expects full start structure.
      // createBoard(data.board); // This board only has id, isFlipped, isMatched
    }
    updateTurnIndicator();
  });

  socket.on("memoryPlayerRoles", (data) => {
    myPlayerNum = data.playerNum; // Confirm/update player number
    // Could display P1 / P2 identity if desired
    console.log(`You are Player ${myPlayerNum}. Opponent ID: ${data.opponentId}`);
  });

  socket.on("memoryGameStart", (data) => {
    gameStatusElement.textContent = "Game started!";
    currentPlayerId = data.currentPlayer;
    createBoard(data.board); // data.board from server has id, isFlipped, isMatched
    updateScores(data.scores);
    updateTurnIndicator();
    playAgainBtn.style.display = "none";
  });

  socket.on("memoryCardFlipped", (data) => {
    const cardElement = document.querySelector(`.card[data-id='${data.cardId}']`);
    const frontFace = cardElement.querySelector(".front-face");
    if (cardElement && frontFace) {
      // Store the actual value locally now that it's revealed
      const cardInLocalBoard = localBoardState.find((c) => c.id === data.cardId);
      if (cardInLocalBoard) cardInLocalBoard.actualValue = data.cardValue;

      frontFace.style.backgroundImage = `url('${imagePath}${data.cardValue}.png')`;
      cardElement.classList.add("flipped");
      playSound("flip"); // Play flip sound
    }
    gameStatusElement.textContent = "Card flipped...";
  });

  socket.on("memoryMatchFound", (data) => {
    const card1Element = document.querySelector(`.card[data-id='${data.matchedCardIds[0]}']`);
    const card2Element = document.querySelector(`.card[data-id='${data.matchedCardIds[1]}']`);
    if (card1Element && card2Element) {
      card1Element.classList.add("matched");
      card2Element.classList.add("matched");
      playSound("correct"); // Play correct match sound
    }
    updateScores(data.scores);
    currentPlayerId = data.currentPlayer; // Current player might continue if they got a match
    updateTurnIndicator();
    gameStatusElement.textContent = "Match found! Your turn again!";
  });

  socket.on("memoryNoMatch", (data) => {
    const card1Element = document.querySelector(`.card[data-id='${data.cardId1}']`);
    const card2Element = document.querySelector(`.card[data-id='${data.cardId2}']`);
    gameStatusElement.textContent = "No match. Flipping back...";
    playSound("incorrect"); // Play incorrect match sound
    setTimeout(() => {
      if (card1Element) card1Element.classList.remove("flipped");
      if (card2Element) card2Element.classList.remove("flipped");
      // Image on front-face can remain, it'll be hidden by back-face
      gameStatusElement.textContent = "Opponent's turn."; // This will be updated by turnUpdate shortly
    }, 1000); // Keep visible slightly less than server's 1.2s before turn switches
  });

  socket.on("memoryTurnUpdate", (data) => {
    currentPlayerId = data.currentPlayer;
    updateTurnIndicator();
    const statusText = socket.id === currentPlayerId ? "Your turn!" : "Opponent's turn.";
    gameStatusElement.textContent = statusText;
  });

  socket.on("memoryGameOver", (data) => {
    updateScores(data.scores);
    let gameOverMessage = "Game Over! ";
    if (data.scores.player1 > data.scores.player2) {
      gameOverMessage += myPlayerNum === 1 ? "You win! 🎉" : "Player 1 wins!";
    } else if (data.scores.player2 > data.scores.player1) {
      gameOverMessage += myPlayerNum === 2 ? "You win! 🎉" : "Player 2 wins!";
    } else {
      gameOverMessage += "It's a tie!";
    }
    gameStatusElement.textContent = gameOverMessage;
    gameStatusElement.className = "status success mb-2";
    playAgainBtn.style.display = "inline-block";
    turnIndicatorElement.textContent = "Game Over";
    turnIndicatorElement.classList.remove("my-turn");
  });

  playAgainBtn.addEventListener("click", () => {
    socket.emit("requestNewMemoryGame", { roomId });
    playAgainBtn.style.display = "none";
    gameStatusElement.textContent = "Requested a new game. Waiting for opponent...";
  });

  socket.on("opponentWantsMemoryRematch", () => {
    gameStatusElement.textContent = "Opponent wants a rematch! Click 'Play Again' to start.";
    playAgainBtn.style.display = "inline-block"; // Show button if hidden
  });

  socket.on("opponentDisconnectedMemory", () => {
    gameStatusElement.textContent = "Opponent disconnected. Game over.";
    gameStatusElement.className = "status error mb-2";
    playAgainBtn.style.display = "none"; // Or allow finding new game
    turnIndicatorElement.textContent = "Opponent Left";
    // Optionally disable game board interactions
    gameContainer.style.pointerEvents = "none";
  });

  // Initial UI setup
  updateTurnIndicator(); // Will show waiting initially
});
