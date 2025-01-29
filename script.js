// Firebase Configuration
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
const app = firebase.initializeApp(firebaseConfig);
const realtimeDb = firebase.database();
let currentPlayer = null;

// UI Elements
const setupUI = document.getElementById("setup");
const waitingRoomUI = document.getElementById("waitingRoom");
const gameSectionUI = document.getElementById("gameSection");
const readyButton = document.getElementById("readyButton");

// Initialize on Load
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("impostorUsername");
  if (savedUsername) {
    document.getElementById("username").value = savedUsername;
    checkExistingGameState(savedUsername);
  }
});

// Join Game Handler
document.getElementById("joinGame").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  if (!username) return;

  try {
    setButtonState("joinGame", true);
    
    if (username === "gma") {
      handleGmaLogin();
      return;
    }

    await initializePlayer(username);
    setupUI.classList.add("hidden");
    waitingRoomUI.classList.remove("hidden");
    setupReadySystem(username);
    checkGameMasterStatus();
    
  } catch (error) {
    console.error("Join error:", error);
    alert("Failed to join. Please try again.");
  } finally {
    setButtonState("joinGame", false);
  }
});

// Player Initialization
async function initializePlayer(username) {
  return new Promise((resolve, reject) => {
    realtimeDb.ref("players/" + username).transaction(currentData => {
      if (!currentData) {
        return {
          username: username,
          ready: false,
          role: "waiting",
          word: "",
          isGameMaster: false,
          hasBeenGM: false,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        };
      }
      return currentData;
    }).then(transactionResult => {
      if (transactionResult.committed) {
        currentPlayer = username;
        localStorage.setItem("impostorUsername", username);
        resolve();
      } else {
        reject("Username already exists");
      }
    });
  });
}

// Ready System
function setupReadySystem(username) {
  const readyRef = realtimeDb.ref(`players/${username}/ready`);
  
  readyRef.on("value", snapshot => {
    const isReady = snapshot.val();
    readyButton.textContent = isReady ? "UNREADY" : "READY";
    readyButton.className = isReady ? "ready" : "not-ready";
  });

  readyButton.onclick = () => {
    const currentReady = readyButton.classList.contains("ready");
    readyRef.set(!currentReady);
  };
}

// Game State Management
function manageGameState() {
  realtimeDb.ref("players").on("value", snapshot => {
    const players = snapshot.val() || {};
    const validPlayers = Object.values(players).filter(p => p.username !== "gma");
    
    renderPlayerList(players);
    
    if (validPlayers.length > 1 && 
        validPlayers.every(p => p.ready) &&
        !players.gameStarted) {
      startGame(players);
    }
  });
}

// Start Game
function startGame(players) {
  try {
    const eligiblePlayers = Object.values(players)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);
    
    if (eligiblePlayers.length === 0) {
      resetGMHistory(players);
      return startGame(players);
    }

    const nextGM = eligiblePlayers.reduce((prev, current) => 
      (prev.timestamp < current.timestamp) ? prev : current
    ).username;

    realtimeDb.ref("gameState").update({
      gameMaster: nextGM,
      gameStarted: true,
      word: "",
      impostorCount: 1
    });

    realtimeDb.ref(`players/${nextGM}`).update({
      hasBeenGM: true,
      isGameMaster: true
    });

  } catch (error) {
    console.error("Game start failed:", error);
    realtimeDb.ref("gameState/gameStarted").set(false);
  }
}

// Player List Rendering
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  const filteredPlayers = Object.values(players)
    .filter(p => p.username !== "gma" && p.username !== currentPlayer);
  
  playerList.innerHTML = filteredPlayers.map(player => `
    <li class="${player.ready ? 'ready-player' : ''}">
      ${player.username}
      ${currentPlayer === "gma" ? `
        <button class="remove-btn" onclick="removePlayer('${player.username}')">
          🗑️
        </button>
      ` : ''}
    </li>
  `).join("");

  document.getElementById("readyCount").textContent = 
    `${filteredPlayers.filter(p => p.ready).length}/${filteredPlayers.length} ready`;
}

// Debug Functions
function handleGmaLogin() {
  document.getElementById("debugControls").classList.remove("hidden");
  setupUI.classList.add("hidden");
  waitingRoomUI.classList.add("hidden");
  gameSectionUI.classList.add("hidden");
}

function removePlayer(username) {
  if (currentPlayer === "gma" && username !== "gma") {
    realtimeDb.ref(`players/${username}`).remove();
  }
}

function fullGameReset() {
  if (currentPlayer === "gma") {
    realtimeDb.ref("players").remove();
    realtimeDb.ref("gameState").set({
      gameMaster: "",
      word: "",
      impostorCount: 1,
      gameStarted: false
    });
  }
}

// Utilities
function setButtonState(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  btn.disabled = isLoading;
  btn.querySelector('.default-text').classList.toggle('hidden', isLoading);
  btn.querySelector('.loading-text').classList.toggle('hidden', !isLoading);
}

function resetGMHistory(players) {
  Object.keys(players).forEach(username => {
    if (username !== "gma") {
      realtimeDb.ref(`players/${username}/hasBeenGM`).set(false);
    }
  });
}

// Initialize Game
manageGameState();
