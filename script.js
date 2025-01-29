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

// Load saved username
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

// Initialize player
function initializePlayer(username) {
  realtimeDb.ref("players/" + username).once("value").then((snapshot) => {
    const existingData = snapshot.val();

    const playerData = existingData || {
      username: username,
      ready: false,
      role: "waiting",
      word: "",
      isGameMaster: false,
      hasBeenGM: false
    };

    realtimeDb.ref("players/" + username).set(playerData)
      .then(() => handleGameState(username));
  });
}

// Ready Button Handler
function setupReadyButton(username) {
  const readyButton = document.getElementById("readyButton");
  readyButton.classList.remove("hidden");
  
  realtimeDb.ref("players/" + username + "/ready").on("value", (snapshot) => {
    const isReady = snapshot.val();
    readyButton.textContent = isReady ? "UNREADY" : "READY";
    readyButton.className = isReady ? "ready" : "not-ready";
  });

  readyButton.onclick = () => {
    const currentReady = document.getElementById("readyButton").classList.contains("ready");
    realtimeDb.ref("players/" + username + "/ready").set(!currentReady);
  };
}

// Check if all players are ready
function checkAllReady(players) {
  return Object.values(players).every(p => p.ready);
}

// Elect Game Master
function electGameMaster(players) {
  const eligiblePlayers = Object.values(players)
    .filter(p => p.username !== "gma" && !p.hasBeenGM);
  
  if (eligiblePlayers.length === 0) {
    // All players have been GM, reset status
    Object.keys(players).forEach(username => {
      realtimeDb.ref("players/" + username + "/hasBeenGM").set(false);
    });
    return electGameMaster(players);
  }
  
  const nextGM = eligiblePlayers[0].username;
  realtimeDb.ref("gameState").update({
    gameMaster: nextGM,
    gameStarted: true
  });
  realtimeDb.ref("players/" + nextGM).update({
    hasBeenGM: true,
    isGameMaster: true
  });
}

// Game state handling
function handleGameState(username) {
  realtimeDb.ref("gameState").once("value", (snapshot) => {
    const gameState = snapshot.val() || { gameStarted: false };

    if (gameState.gameStarted) {
      showGameSection(username);
    } else {
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("waitingRoom").classList.remove("hidden");
      setupReadyButton(username);
      checkGameMasterStatus();
    }
  });

  // Listen for all players' ready status
  realtimeDb.ref("players").on("value", (snapshot) => {
    const players = snapshot.val() || {};
    if (checkAllReady(players) && Object.keys(players).length > 1) {
      electGameMaster(players);
    }
  });
}

// Remove individual player (GMA only)
function removePlayer(username) {
  realtimeDb.ref("players/" + username).remove();
}

// Debug controls
document.getElementById("clearPlayers").addEventListener("click", () => {
  realtimeDb.ref("players").remove();
  realtimeDb.ref("gameState").update({
    gameMaster: "",
    word: "",
    gameStarted: false
  });
});

// Render player list with remove buttons
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = Object.values(players).map(player => `
    <li>
      ${player.username}
      ${player.ready ? '✅' : '❌'}
      ${currentPlayer === "gma" ? `<button onclick="removePlayer('${player.username}')">Remove</button>` : ''}
    </li>
  `).join("");
}

// Update UI
function showGameSection(username) {
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("waitingRoom").classList.add("hidden");
  document.getElementById("gameSection").classList.remove("hidden");

  realtimeDb.ref("players/" + username).on("value", (snapshot) => {
    const playerData = snapshot.val();
    if (playerData.isGameMaster) {
      document.getElementById("gmControls").classList.remove("hidden");
      document.getElementById("playerSection").classList.add("hidden");
    } else {
      document.getElementById("roleDisplay").textContent = `You are ${playerData.role}!`;
      document.getElementById("wordDisplay").textContent = 
        playerData.role === "impostor" ? 
        "You do not know the word." : 
        `The word is: ${playerData.word}`;
    }
  });
}

// Initialize
realtimeDb.ref("players").on("value", (snapshot) => {
  const players = snapshot.val() || {};
  renderPlayerList(players);
});
