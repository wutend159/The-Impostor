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

// Load saved username on page load
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("impostorUsername");
  if (savedUsername) {
    document.getElementById("username").value = savedUsername;
    checkExistingGameState(savedUsername); // Check if game already started
  }
});

// Join Game
document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  if (username) {
    localStorage.setItem("impostorUsername", username);
    currentPlayer = username;
    initializePlayer(username);
  }
});

// Initialize player in Firebase
function initializePlayer(username) {
  realtimeDb.ref("players/" + username).once("value").then((snapshot) => {
    const existingData = snapshot.val();

    // Preserve existing role/word if player rejoins
    const playerData = existingData || {
      username: username,
      role: "waiting",
      word: "",
      isGameMaster: false
    };

    realtimeDb.ref("players/" + username).set(playerData)
      .then(() => handleGameState(username));
  });
}

// Handle game state changes
function handleGameState(username) {
  realtimeDb.ref("gameState").once("value", (snapshot) => {
    const gameState = snapshot.val() || { gameStarted: false };

    if (gameState.gameStarted) {
      // Game already running - show role/word
      realtimeDb.ref("players/" + username).once("value", (playerSnapshot) => {
        const playerData = playerSnapshot.val();
        showGameSection(playerData.role, playerData.word);
      });
    } else {
      // Game not started - show waiting room
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("waitingRoom").classList.remove("hidden");
      checkGameMasterStatus();
    }
  });
}

// Check if current user is Game Master
function checkGameMasterStatus() {
  realtimeDb.ref("gameState/gameMaster").on("value", (snapshot) => {
    const gameMaster = snapshot.val();
    if (gameMaster === currentPlayer) {
      document.getElementById("gameMasterSection").classList.remove("hidden");
    } else {
      document.getElementById("gameMasterSection").classList.add("hidden");
    }
  });
}

// Start Round (Game Master Only)
document.getElementById("startRound").addEventListener("click", () => {
  const word = document.getElementById("word").value.trim();
  const impostorCount = parseInt(document.getElementById("impostorCount").value);

  if (word && impostorCount > 0) {
    realtimeDb.ref("gameState").update({
      word: word,
      impostorCount: impostorCount,
      gameStarted: true
    });

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

// Show game section with role/word
function showGameSection(role, word) {
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("waitingRoom").classList.add("hidden");
  document.getElementById("gameSection").classList.remove("hidden");
  
  document.getElementById("roleDisplay").textContent = `You are the ${role}!`;
  document.getElementById("wordDisplay").textContent = 
    role === "impostor" ? "You do not know the word." : `The word is: ${word}`;
}

// Check existing game state on page load
function checkExistingGameState(username) {
  realtimeDb.ref("gameState/gameStarted").once("value", (snapshot) => {
    if (snapshot.val() === true) {
      realtimeDb.ref("players/" + username).once("value", (playerSnapshot) => {
        const playerData = playerSnapshot.val();
        if (playerData && playerData.role !== "waiting") {
          showGameSection(playerData.role, playerData.word);
        }
      });
    }
  });
}

// Choose impostors
function chooseImpostors(players, count) {
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Listen for real-time updates
realtimeDb.ref("players/" + currentPlayer).on("value", (snapshot) => {
  const playerData = snapshot.val();
  if (playerData && playerData.role !== "waiting") {
    showGameSection(playerData.role, playerData.word);
  }
});

// Listen for player list updates
realtimeDb.ref("players").on("value", (snapshot) => {
  const players = snapshot.val() || {};
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = Object.keys(players).map(username => 
    `<li>${username}${players[username].isGameMaster ? " (GM)" : ""}</li>`
  ).join("");
});
