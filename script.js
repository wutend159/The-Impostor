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
let isGameStarting = false; // Prevent multiple game starts

// Modified Player List Rendering
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  const filteredPlayers = Object.values(players)
    .filter(p => p.username !== "gma"); // Include current player
  
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

  // Accurate ready count
  const readyCount = filteredPlayers.filter(p => p.ready).length;
  document.getElementById("readyCount").textContent = 
    `${readyCount}/${filteredPlayers.length} ready`;
}

// Fixed Player Initialization
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
          timestamp: Date.now() // Use client timestamp
        };
      }
      return currentData; // Keep existing data if any
    }, (error, committed) => {
      if (error) {
        reject(error);
      } else if (!committed) {
        reject("Username already exists");
      } else {
        currentPlayer = username;
        localStorage.setItem("impostorUsername", username);
        resolve();
      }
    }, false); // Disable local events
  });
}

// Robust Game Starter
async function startGame(players) {
  if (isGameStarting) return;
  isGameStarting = true;

  try {
    let eligiblePlayers = Object.values(players)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);

    if (eligiblePlayers.length === 0) {
      // Reset GM status atomically
      const updates = {};
      Object.keys(players).forEach(username => {
        if (username !== "gma") updates[`${username}/hasBeenGM`] = false;
      });
      await realtimeDb.ref("players").update(updates);
      
      // Get fresh player list
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

// Enhanced State Manager
function manageGameState() {
  realtimeDb.ref("players").on("value", snapshot => {
    const players = snapshot.val() || {};
    const validPlayers = Object.values(players).filter(p => p.username !== "gma");
    
    if (validPlayers.length > 1 && 
        validPlayers.every(p => p.ready) &&
        !isGameStarting) {
      startGame(players).catch(console.error);
    }
    
    renderPlayerList(players);
  });
}

// Updated Join Handler
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
    
  } catch (error) {
    console.error("Join error:", error);
    if (error.includes("already exists")) {
      alert("Username taken. Try another.");
    } else {
      alert("Connection error. Check console.");
    }
  } finally {
    setButtonState("joinGame", false);
  }
});
