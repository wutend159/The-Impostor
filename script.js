// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRlFWyQZ3l0ZeE8424NRdm8sJgBBTb9EE",
  authDomain: "the-impostor-2c85e.firebaseapp.com",
  databaseURL: "https://the-impostor-2c85e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "the-impostor-2c85e",
  storageBucket: "the-impostor-2c85e.firebasestorage.app",
  messagingSenderId: "645860033668",
  appId: "1:645860033668:web:8b2ffa40f151cdacfbeed1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const realtimeDb = firebase.database();

let currentPlayer = null;

// Join Game
document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  if (username) {
    localStorage.setItem("impostorUsername", username);
    currentPlayer = username;

    // Check if the game has already started
    realtimeDb.ref("gameState/gameStarted").once("value", (snapshot) => {
      const gameStarted = snapshot.val();

      if (gameStarted) {
        // Game is already running: show role/word immediately
        realtimeDb.ref("players/" + username).once("value", (playerSnapshot) => {
          const playerData = playerSnapshot.val();
          if (playerData.role !== "waiting") {
            showGameSection(playerData.role, playerData.word);
          }
        });
      } else {
        // Game hasn't started: add to waiting room
        realtimeDb.ref("players/" + username).set({
          username: username,
          role: "waiting",
          word: "",
          isGameMaster: false
        });
        document.getElementById("setup").classList.add("hidden");
        document.getElementById("waitingRoom").classList.remove("hidden");
      }
    });

    
    // Add player to Firebase
    realtimeDb.ref("players/" + username).set({
      username: username,
      role: "waiting",
      word: "",
      isGameMaster: false // Track Game Master status
    }).then(() => {
      // Hide setup and show waiting room
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("waitingRoom").classList.remove("hidden");
    });

    // Set the first player as Game Master
    realtimeDb.ref("gameState").once("value", (snapshot) => {
      const gameState = snapshot.val();
      if (!gameState || !gameState.gameMaster) {
        realtimeDb.ref("gameState").update({
          gameMaster: username,
          word: "",
          impostorCount: 1,
          gameStarted: false
        });
      }
    });
  }
});

// Listen for Players in Waiting Room
realtimeDb.ref("players").on("value", (snapshot) => {
  const players = snapshot.val() || {};
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = Object.keys(players).map(username => `<li>${username}</li>`).join("");

  // Show Game Master controls if current user is Game Master
  realtimeDb.ref("gameState/gameMaster").on("value", (snapshot) => {
    const gameMaster = snapshot.val();
    if (gameMaster === currentPlayer) {
      document.getElementById("gameMasterSection").classList.remove("hidden");
    } else {
      document.getElementById("gameMasterSection").classList.add("hidden");
    }
  });
});

// Start Round (Game Master Only)
document.getElementById("startRound").addEventListener("click", () => {
  const word = document.getElementById("word").value;
  const impostorCount = parseInt(document.getElementById("impostorCount").value);

  if (word && impostorCount > 0) {
    // Update game state
    realtimeDb.ref("gameState").update({
      word: word,
      impostorCount: impostorCount,
      gameStarted: true
    });

    // Assign roles to all players
    realtimeDb.ref("players").once("value", (snapshot) => {
      const players = snapshot.val();
      const playerUsernames = Object.keys(players);
      const impostors = chooseImpostors(playerUsernames, impostorCount);

      playerUsernames.forEach(username => {
        const isImpostor = impostors.includes(username);
        realtimeDb.ref("players/" + username).update({
          role: isImpostor ? "impostor" : "player",
          word: isImpostor ? "Impostor" : word
        });
      });
    });
  }
});

// Listen for role updates
realtimeDb.ref("players/" + currentPlayer).on("value", (snapshot) => {
  const playerData = snapshot.val();
  if (playerData && playerData.role !== "waiting") {
    showGameSection(playerData.role, playerData.word);
  }
});

// Load saved username on page load
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("impostorUsername");
  if (savedUsername) {
    document.getElementById("username").value = savedUsername;
  }
});

// Save username when joining the game
document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  if (username) {
    localStorage.setItem("impostorUsername", username); // Save to localStorage
    // Rest of your join game logic...
  }
});

// Helper function to choose impostors
function chooseImpostors(players, count) {
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to show the game section
function showGameSection(role, word) {
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("waitingRoom").classList.add("hidden");
  document.getElementById("gameSection").classList.remove("hidden");
  document.getElementById("roleDisplay").textContent = `You are the ${role}!`;
  document.getElementById("wordDisplay").textContent = 
    role === "impostor" ? "You do not know the word." : `The word is: ${word}`;
}

function resetGame() {
  realtimeDb.ref("players").remove(); // Clear all players
  realtimeDb.ref("gameState").update({
    gameMaster: "",
    word: "",
    impostorCount: 1,
    gameStarted: false
  });
}
