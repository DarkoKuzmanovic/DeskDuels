# Instructions to Create a Mancala Game for DeskDuels

## Overview

Create a web-based version of the classic board game **Mancala** as a new game for the DeskDuels project. The game should support two players and follow the traditional rules of Mancala. The user interface should be intuitive and interactive, providing a seamless gaming experience.

## Game Rules

### Objective

The objective of Mancala is to collect more stones in your Mancala (store) than your opponent.

### Game Setup

- The game board consists of two rows of six pits (also called holes) each, and two larger pits called Mancalas (stores) at each end.
- Each of the 12 small pits starts with 4 stones.
- Players sit opposite each other, each controlling the six pits on their side and their Mancala on their right.

### Gameplay

1. **Player Turns**

   - Players take turns moving stones.
   - On your turn, select one of the six pits on your side of the board.

2. **Sowing**

   - Remove all stones from the selected pit.
   - Moving counterclockwise, deposit one stone in each pit you pass, including your own Mancala but **not** your opponent's Mancala.
   - If you run out of stones, continue around the board until all stones are sown.

3. **Extra Turn**

   - If the last stone you sow lands in your own Mancala, you get an extra turn.
   - There is no limit to the number of extra turns you can earn.

4. **Capturing Stones**

   - If the last stone you sow lands in an empty pit on your side, and the opposite pit on your opponent's side has stones, you capture all the stones from the opposite pit along with your last stone.
   - Captured stones are placed in your Mancala.

5. **Game End**

   - The game ends when all six pits on one side of the board are empty.
   - The player who still has stones on their side moves all remaining stones to their Mancala.
   - The player with the most stones in their Mancala wins.
   - If both players have the same number of stones, the game is a draw.

## Technical Requirements

### Frontend

- **Technologies**: Use HTML, CSS, and JavaScript.
- **UI Elements**:
  - Graphical representation of the Mancala board with interactive pits and Mancalas.
  - Display the number of stones in each pit and Mancala.
  - Highlight the active player's side.
- **User Interaction**:
  - Allow players to select pits to make their moves.
  - Provide visual feedback for captures and extra turns.
- **Responsive Design**: Ensure the game is playable on various device sizes.

### Backend

- **Server**: Use Node.js with Socket.IO for real-time communication.
- **Game Logic**:
  - Manage game state on the server to prevent cheating.
  - Implement all game rules accurately.
- **Player Matching**:
  - Allow players to create or join game rooms.
  - Assign player sides (top or bottom) upon joining.

### Game Flow

1. **Setup**:
   - When two players are connected, initialize the game board with the starting number of stones.
2. **Turns**:
   - Alternate turns between players.
   - Validate moves to ensure players can only select pits on their side.
3. **Updates**:
   - Broadcast game state updates after each move.
   - Update both clients simultaneously to reflect the current state.
4. **End Game**:
   - Detect when the game has ended based on the rules.
   - Announce the winner or declare a draw.
   - Provide an option to play again or return to the main menu.

### Additional Features

- **Play Again Option**: Allow players to restart the game without leaving the room.
- **Chat Functionality**: Include a chat box for players to communicate.
- **Animations**: Add smooth animations for stone movement.
- **Sounds**: Optional sound effects for moves and captures.
- **Accessibility**: Ensure the game is accessible to players with disabilities.

## Development Guidelines

- **Code Structure**: Write clean, modular code with comments.
- **Version Control**: Use Git for version control and maintain clear commit messages.
- **Testing**:
  - Unit test critical game logic functions.
  - Perform integration testing with multiple clients.
- **Error Handling**:
  - Gracefully handle disconnections and reconnections.
  - Validate all client inputs on the server side.

## Deliverables

- Fully functional Mancala game integrated into the DeskDuels project.
- Source code with documentation.
- Instructions for running the game locally and deploying to production.

## Timeline

Aim to complete the development and initial testing within 2-3 weeks, followed by a week of user testing and bug fixing.

## References

- [Mancala Rules - Wikipedia](https://en.wikipedia.org/wiki/Mancala)
- [Socket.IO Documentation](https://socket.io/docs/v4)

---

Feel free to adjust or add any additional instructions as needed.
