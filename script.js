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
let isGameStarting = false;

// DOM Elements
const setupUI = document.getElementById("setup");
const waitingRoomUI = document.getElementById("waitingRoom");
const gameSectionUI = document.getElementById("gameSection");
const readyButton = document.getElementById("readyButton");

// Utility Functions
function setButtonState(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  btn.disabled = isLoading;
  const defaultText = btn.querySelector('.default-text');
  const loadingText = btn.querySelector('.loading-text');
  
  if (defaultText) defaultText.classList.toggle('hidden', isLoading);
  if (loadingText) loadingText.classList.toggle('hidden', !isLoading);
}

// Initialize on Load
window.addEventListener("load", () => {
  const savedUsername = localStorage.getItem("impostorUsername");
  if (savedUsername) {
    document.getElementById("username").value = savedUsername;
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
    if (setupUI) setupUI.classList.add("hidden");
    if (waitingRoomUI) waitingRoomUI.classList.remove("hidden");
    setupReadySystem(username);
    checkGameMasterStatus();
    
  } catch (error) {
    console.error("Join error:", error);
    alert(typeof error === 'string' ? error : "Join failed. Try again.");
  } finally {
    setButtonState("joinGame", false);
  }
});

// Player Initialization
async function initializePlayer(username) {
  return new Promise((resolve, reject) => {
    realtimeDb.ref("players/" + username).transaction(currentData => {
      if (currentData === null) {
        return {
          username: username,
          ready: false,
          role: "waiting",
          word: "",
          isGameMaster: false,
          hasBeenGM: false,
          timestamp: Date.now()
        };
      }
      return currentData;
    }, (error, committed) => {
      if (error) {
        reject("Connection error");
      } else if (!committed) {
        reject("Username already exists");
      } else {
        currentPlayer = username;
        localStorage.setItem("impostorUsername", username);
        resolve();
      }
    }, false);
  });
}

// Ready System
function setupReadySystem(username) {
  if (!readyButton) return;

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

// Game Master Status Check
function checkGameMasterStatus() {
  realtimeDb.ref("gameState/gameMaster").on("value", (snapshot) => {
    const gameMaster = snapshot.val();
    const isGM = gameMaster === currentPlayer;
    
    const gmControls = document.getElementById("gmControls");
    if (gmControls) gmControls.classList.toggle("hidden", !isGM);
  });
}

// Game State Management
function manageGameState() {
  realtimeDb.ref("players").on("value", snapshot => {
    const players = snapshot.val() || {};
    const validPlayers = Object.values(players).filter(p => 
      p.username !== "gma" && !p.isGameMaster
    );

    renderPlayerList(players);
    
    realtimeDb.ref("gameState/gameStarted").once("value", (gameStateSnap) => {
      if (!gameStateSnap.val() && 
          validPlayers.length >= 4 && // Minimum 4 players
          validPlayers.every(p => p.ready) &&
          !isGameStarting) {
        startGame(players);
      }
    });
  });
}

// Start Game
async function startGame(players) {
  if (isGameStarting) return;
  isGameStarting = true;

  try {
    const freshSnapshot = await realtimeDb.ref("players").once("value");
    const freshPlayers = freshSnapshot.val() || {};
    
    let eligiblePlayers = Object.values(freshPlayers)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);

    if (eligiblePlayers.length === 0) {
      const updates = {};
      Object.keys(freshPlayers).forEach(username => {
        if (username !== "gma") updates[`${username}/hasBeenGM`] = false;
      });
      await realtimeDb.ref("players").update(updates);
      eligiblePlayers = Object.values(freshPlayers).filter(p => p.username !== "gma");
    }

    const nextGM = eligiblePlayers.reduce((prev, current) => 
      prev.timestamp < current.timestamp ? prev : current
    ).username;

    await realtimeDb.ref("gameState").update({
      gameMaster: nextGM,
      gameStarted: true,
      word: "",
      impostorCount: 1
    });

    await realtimeDb.ref(`players/${nextGM}`).update({
      hasBeenGM: true,
      isGameMaster: true
    });

    // Assign roles to other players
    const playersToUpdate = Object.values(freshPlayers)
      .filter(p => p.username !== nextGM && p.username !== "gma");
    
    playersToUpdate.forEach(player => {
      realtimeDb.ref(`players/${player.username}`).update({
        role: "player",
        word: "Impostor"
      });
    });

  } catch (error) {
    console.error("Game start error:", error);
  } finally {
    isGameStarting = false;
  }
}

// Player List Rendering
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  const warning = document.getElementById("playerCountWarning");
  const filteredPlayers = Object.values(players)
    .filter(p => p.username !== "gma" && p.username !== currentPlayer);

  if (playerList) {
    playerList.innerHTML = filteredPlayers.map(player => `
      <li class="${player.ready ? 'ready-player' : ''}">
        ${player.username} ${player.ready ? '✅' : '❌'}
        ${currentPlayer === "gma" ? `
          <button class="remove-btn" onclick="removePlayer('${player.username}')">
            🗑️
          </button>
        ` : ''}
      </li>
    `).join("");
  }

  if (warning) {
    warning.style.display = filteredPlayers.length < 4 ? "block" : "none";
  }

  const readyCount = filteredPlayers.filter(p => p.ready).length;
  if (document.getElementById("readyCount")) {
    document.getElementById("readyCount").textContent = 
      `${readyCount}/${filteredPlayers.length} ready`;
  }
}

// Next Round Handler
document.getElementById("startNextRound")?.addEventListener("click", async () => {
  try {
    // Reset game state
    await realtimeDb.ref("gameState").update({
      gameStarted: false,
      word: "",
      impostorCount: 1
    });

    // Reset players
    const playersSnap = await realtimeDb.ref("players").once("value");
    const players = playersSnap.val() || {};
    
    const updates = {};
    Object.keys(players).forEach(username => {
      if (username !== "gma") {
        updates[`${username}/ready`] = false;
        updates[`${username}/role`] = "waiting";
        updates[`${username}/word`] = "";
      }
    });
    
    await realtimeDb.ref("players").update(updates);

    // Elect new GM
    const eligiblePlayers = Object.values(players)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);
    
    if (eligiblePlayers.length > 0) {
      const nextGM = eligiblePlayers[0].username;
      await realtimeDb.ref("gameState/gameMaster").set(nextGM);
      await realtimeDb.ref(`players/${nextGM}/hasBeenGM`).set(true);
    }

    window.location.reload();

  } catch (error) {
    console.error("Next round error:", error);
  }
});

// Debug Functions
function handleGmaLogin() {
  const debugControls = document.getElementById("debugControls");
  if (debugControls) debugControls.classList.remove("hidden");
  if (setupUI) setupUI.classList.add("hidden");
  if (waitingRoomUI) waitingRoomUI.classList.add("hidden");
  if (gameSectionUI) gameSectionUI.classList.add("hidden");
}

window.removePlayer = function(username) {
  if (currentPlayer === "gma" && username !== "gma") {
    realtimeDb.ref(`players/${username}`).remove();
  }
}

window.fullGameReset = function() {
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

// Initialize Game
manageGameState();