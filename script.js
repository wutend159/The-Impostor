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
    setupUI.classList.add("hidden");
    waitingRoomUI.classList.remove("hidden");
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
        !isGameStarting) {
      startGame(players);
    }
  });
}

// Start Game
async function startGame(players) {
  if (isGameStarting) return;
  isGameStarting = true;

  try {
    let eligiblePlayers = Object.values(players)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);

    if (eligiblePlayers.length === 0) {
      const updates = {};
      Object.keys(players).forEach(username => {
        if (username !== "gma") updates[`${username}/hasBeenGM`] = false;
      });
      await realtimeDb.ref("players").update(updates);
      
      const newSnapshot = await realtimeDb.ref("players").once("value");
      eligiblePlayers = Object.values(newSnapshot.val())
        .filter(p => p.username !== "gma");
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

  } catch (error) {
    console.error("Game start error:", error);
    await realtimeDb.ref("gameState/gameStarted").set(false);
  } finally {
    isGameStarting = false;
  }
}

// Player List Rendering
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  const filteredPlayers = Object.values(players)
    .filter(p => p.username !== "gma");
  
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

// Initialize Game
manageGameState();
