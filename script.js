// Firebase configuration remains the same
const firebaseConfig = { /* your config */ };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const realtimeDb = firebase.database();
let currentPlayer = null;

// Improved player initialization
function initializePlayer(username) {
  realtimeDb.ref("players/" + username).transaction((currentData) => {
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
  }).then(() => {
    if (username !== "gma") handleGameState(username);
  });
}

// Enhanced ready system
function setupReadySystem(username) {
  const readyButton = document.getElementById("readyButton");
  readyButton.classList.remove("hidden");

  const readyRef = realtimeDb.ref(`players/${username}/ready`);
  
  readyRef.on("value", (snapshot) => {
    const isReady = snapshot.val();
    readyButton.textContent = isReady ? "UNREADY" : "READY";
    readyButton.className = isReady ? "ready" : "not-ready";
  });

  readyButton.onclick = () => readyRef.set(!readyButton.classList.contains("ready"));
}

// Robust game starter
function startGame(players) {
  try {
    const eligiblePlayers = Object.values(players)
      .filter(p => p.username !== "gma" && !p.hasBeenGM);
    
    if (eligiblePlayers.length === 0) {
      // Reset GM history for new round
      Object.keys(players).forEach(username => {
        if (username !== "gma") {
          realtimeDb.ref(`players/${username}/hasBeenGM`).set(false);
        }
      });
      return startGame(players); // Recursive call with reset status
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

// Secure player removal
function removePlayer(username) {
  if (currentPlayer === "gma" && username !== "gma") {
    realtimeDb.ref(`players/${username}`).remove()
      .then(() => console.log(`Removed ${username}`))
      .catch(console.error);
  }
}

// Complete game reset
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

// Enhanced player list rendering
function renderPlayerList(players) {
  const playerList = document.getElementById("playerList");
  const filteredPlayers = Object.values(players).filter(p => p.username !== "gma");
  
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

  // Update ready count display
  const readyCount = filteredPlayers.filter(p => p.ready).length;
  document.getElementById("readyCount").textContent = 
    `${readyCount}/${filteredPlayers.length} ready`;
}

// Game state manager
function manageGameState() {
  realtimeDb.ref("players").on("value", (snapshot) => {
    const players = snapshot.val() || {};
    const validPlayers = Object.values(players).filter(p => p.username !== "gma");
    
    renderPlayerList(players);
    
    if (validPlayers.length > 1 && 
        validPlayers.every(p => p.ready) &&
        !realtimeDb.gameStarted) {
      startGame(players);
    }
  });
}

// Initialize everything
window.addEventListener("load", () => {
  // Existing load logic
  
  // New initialization flow
  manageGameState();
  if (currentPlayer === "gma") {
    document.getElementById("debugControls").classList.remove("hidden");
    document.getElementById("waitingRoom").classList.add("hidden");
  }
});
