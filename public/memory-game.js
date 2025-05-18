document.addEventListener("DOMContentLoaded", () => {
  const gameContainer = document.querySelector(".game-container");
  const imagePath = "images/memory-game-res/"; // Path to your card images

  // IMPORTANT: Replace these placeholders with your 30 actual unique image filenames (without extension)
  // For example, if you have apple.png, banana.png, ..., up to 30 images.
  const cardValues = [
    "bela_roda",
    "beloglavi-sup",
    "buljina",
    "crvendać",
    "ćuk",
    "dugorepa_senica",
    "gačac",
    "gak",
    "grlica",
    "kobac",
    "kos",
    "kukuvija",
    "modrovrana",
    "obična_crvenrepka",
    "pčelarica",
    "plava_senica",
    "pupavac",
    "siva_čaplja",
    "strnadica_žutovoljka",
    "suri_orao",
    "svraka",
    "veliki_detlić",
    "veliki_tetreb",
    "vetruška",
    "vivak",
    "vodomar",
    "vrabac",
    "vuga",
    "zeba",
    "zviždara",
  ];
  let gameCards = [...cardValues, ...cardValues]; // Duplicate to create pairs (60 cards total)

  let flippedCards = [];
  let matchedPairs = 0;
  let canFlip = true; // To prevent flipping more than two cards or during timeout

  // Shuffle cards
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Create game board
  function createBoard() {
    gameContainer.innerHTML = ""; // Clear previous board if any
    matchedPairs = 0;
    flippedCards = [];
    canFlip = true;
    gameCards = shuffle([...cardValues, ...cardValues]);

    gameCards.forEach((value) => {
      const cardElement = document.createElement("div");
      cardElement.classList.add("card");
      cardElement.dataset.value = value; // Store the card's value (image name)

      // Create front and back faces
      const frontFace = document.createElement("div");
      frontFace.classList.add("front-face");
      // Assuming images are .png, adjust if different. Example: `${imagePath}${value}.jpg`
      frontFace.style.backgroundImage = `url('${imagePath}${value}.png')`;
      frontFace.style.backgroundSize = "cover"; // Ensure image covers the card

      const backFace = document.createElement("div");
      backFace.classList.add("back-face");
      backFace.textContent = "?"; // Or leave blank, or use an icon

      cardElement.appendChild(frontFace);
      cardElement.appendChild(backFace);

      cardElement.addEventListener("click", () => handleCardClick(cardElement));
      gameContainer.appendChild(cardElement);
    });
    console.log("Memory game board created with 60 cards");
  }

  // Handle card click
  function handleCardClick(card) {
    if (!canFlip || card.classList.contains("flipped") || card.classList.contains("matched")) {
      return; // Card cannot be flipped
    }

    card.classList.add("flipped");
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      canFlip = false; // Prevent further flips until check is complete
      checkForMatch();
    }
  }

  // Check for match
  function checkForMatch() {
    const [card1, card2] = flippedCards;
    if (card1.dataset.value === card2.dataset.value) {
      // It's a match!
      card1.classList.add("matched");
      card2.classList.add("matched");
      matchedPairs++;
      flippedCards = [];
      canFlip = true;
      if (matchedPairs === cardValues.length) {
        // All pairs matched - game over
        setTimeout(() => alert("You won! 🎉"), 500); // Simple win alert
        // TODO: Add a more sophisticated game over / play again screen
      }
    } else {
      // Not a match - flip back after a delay
      setTimeout(() => {
        card1.classList.remove("flipped");
        card2.classList.remove("flipped");
        flippedCards = [];
        canFlip = true;
      }, 1000); // 1 second delay
    }
  }

  // Initialize game
  createBoard();
  console.log("Memory game script loaded and 10x6 board initialized");
});
