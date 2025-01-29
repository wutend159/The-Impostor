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
let playerOrder = []; // To track player order for GM rotation

// Load saved username on page load
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("impostorUsername");
  if (savedUsername) {
    document.getElementById("username").value = savedUsername;
    checkExistingGameState(savedUsername);
  }
});

// Join Game
document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  if (username) {
    localStorage.setItem("impostorUsername", username);
    currentPlayer = username;
    initializePlayer(username);
    
    // Special case for debug GM
    if (username === "gma") {
      document.getElementById("debugControls").classList.remove("hidden");
    }
  }
});

// Initialize player in Firebase
function initializePlayer(username) {
  realtimeDb.ref("players/" + username).once("value").then((snapshot) => {
    const existingData = snapshot.val();

    const playerData = existingData || {
      username: username,
      role: "waiting",
      word: "",
      isGameMaster: false,
      hasBeenGM: false
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
      // Game already running - put in waiting room
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("waitingRoom").classList.remove("hidden");
      checkGameMasterStatus();
    } else {
      // Game not started - show appropriate section
      realtimeDb.ref("players/" + username).once("value", (playerSnapshot) => {
        const playerData = playerSnapshot.val();
        if (playerData.role !== "waiting") {
          showGameSection(playerData.role, playerData.word);
        } else {
          document.getElementById("setup").classList.add("hidden");
          document.getElementById("waitingRoom").classList.remove("hidden");
          checkGameMasterStatus();
        }
      });
    }
  });
}

// Check if current user is Game Master
function checkGameMasterStatus() {
  realtimeDb.ref("gameState/gameMaster").on("value", (snapshot) => {
    const gameMaster = snapshot.val();
    const isGM = gameMaster === currentPlayer;
    
    document.getElementById("gmControls").classList.toggle("hidden", !isGM);
    document.getElementById("playerSection").classList.toggle("hidden", isGM);
    
    if (isGM) {
      realtimeDb.ref("gameState/word").once("value", (wordSnapshot) => {
        document.getElementById("gmWord").textContent = wordSnapshot.val();
      });
    }
  });
}

// Start New Round (Game Master Only)
document.getElementById("startNextRound").addEventListener("click", () => {
  realtimeDb.ref("players").once("value", (snapshot) => {
    const players = snapshot.val();
    const playerUsernames = Object.keys(players).filter(u => u !== "gma");
    
    // Update player order and select next GM
    if (playerOrder.length === 0) {
      playerOrder = [...playerUsernames];
    }
    
    const currentGMIndex = playerOrder.indexOf(currentPlayer);
    const nextGMIndex = (currentGMIndex + 1) % playerOrder.length;
    const nextGM = playerOrder[nextGMIndex];
    
    // Reset game state
    realtimeDb.ref("gameState").update({
      gameStarted: false,
      gameMaster: nextGM,
      word: "",
      impostorCount: 1
    });

    // Reset player roles but keep hasBeenGM status
    playerUsernames.forEach(username => {
      realtimeDb.ref("players/" + username).update({
        role: "waiting",
        word: "",
        isGameMaster: false
      });
    });

    // Update GM status
    realtimeDb.ref("players/" + nextGM).update({
      hasBeenGM: true,
      isGameMaster: true
    });
  });
});

// Debug: Clear all players
document.getElementById("clearPlayers").addEventListener("click", () => {
  realtimeDb.ref("players").remove();
  realtimeDb.ref("gameState").update({
    gameMaster: "",
    word: "",
    impostorCount: 1,
    gameStarted: false
  });
  alert("All players cleared!");
});

// Show game section with role/word
function showGameSection(role, word) {
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("waitingRoom").classList.add("hidden");
  document.getElementById("gameSection").classList.remove("hidden");
  
  if (role === "gamemaster") {
    document.getElementById("gmControls").classList.remove("hidden");
    document.getElementById("gmWord").textContent = word;
  } else {
    document.getElementById("roleDisplay").textContent = `You are the ${role}!`;
    document.getElementById("wordDisplay").textContent = 
      role === "impostor" ? "You do not know the word." : `The word is: ${word}`;
  }
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

// Initialize game state
realtimeDb.ref("gameState").once("value", (snapshot) => {
  if (!snapshot.val()) {
    realtimeDb.ref("gameState").set({
      gameMaster: "",
      word: "",
      impostorCount: 1,
      gameStarted: false
    });
  }
});
