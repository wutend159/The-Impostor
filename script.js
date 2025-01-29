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

// DOM Elements
const setupUI = document.getElementById("setup");
const waitingRoomUI = document.getElementById("waitingRoom");
const gameMasterUI = document.getElementById("gameMasterUI");
const playerUI = document.getElementById("playerUI");
const adminUI = document.getElementById("adminUI");

// Initialize Game State
realtimeDb.ref("gameState").set({
  gameMaster: "",
  word: "",
  impostorCount: 1,
  gameStarted: false,
  roundActive: false
});

// Join Game Handler
document.getElementById("joinGame").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  if (!username) return;

  if (username === "gma") {
    handleAdminLogin();
    return;
  }

  try {
    await realtimeDb.ref(`players/${username}`).set({
      username: username,
      ready: false,
      role: "waiting",
      word: "",
      isGameMaster: false,
      hasBeenGM: false,
      timestamp: Date.now()
    });

    currentPlayer = username;
    localStorage.setItem("impostorUsername", username);
    setupUI.classList.add("hidden");
    waitingRoomUI.classList.remove("hidden");
    
    setupReadySystem(username);
    checkGameMasterStatus();

  } catch (error) {
    alert("Failed to join game");
  }
});

// Ready System
function setupReadySystem(username) {
  const readyRef = realtimeDb.ref(`players/${username}/ready`);
  
  readyRef.on("value", snapshot => {
    const isReady = snapshot.val();
    document.getElementById("readyButton").textContent = 
      isReady ? "UNREADY" : "READY";
  });

  document.getElementById("readyButton").onclick = () => {
    readyRef.set(!document.getElementById("readyButton").textContent === "READY");
  };
}

// Game Master Flow
function checkGameMasterStatus() {
  realtimeDb.ref("gameState/gameMaster").on("value", async (snapshot) => {
    const gameMaster = snapshot.val();
    
    if (gameMaster === currentPlayer) {
      waitingRoomUI.classList.add("hidden");
      gameMasterUI.classList.remove("hidden");
      
      // GM Controls
      document.getElementById("startRound").onclick = async () => {
        const word = document.getElementById("gmWord").value;
        const impostorCount = document.getElementById("impostorCount").value;
        
        await realtimeDb.ref("gameState").update({
          word: word,
          impostorCount: impostorCount,
          roundActive: true
        });
        
        assignRoles(word, impostorCount);
      };
    }
  });
}

// Player Flow
realtimeDb.ref("gameState/roundActive").on("value", (snapshot) => {
  if (snapshot.val() && currentPlayer !== "gma") {
    waitingRoomUI.classList.add("hidden");
    playerUI.classList.remove("hidden");
    
    realtimeDb.ref(`players/${currentPlayer}`).once("value", (playerSnap) => {
      const player = playerSnap.val();
      document.getElementById("playerRole").textContent = 
        `You are ${player.role === "impostor" ? "the IMPOSTOR" : "a PLAYER"}`;
      document.getElementById("playerWord").textContent = 
        player.role === "impostor" ? "You don't know the word!" : `The word is: ${player.word}`;
    });
  }
});

// Admin System
function handleAdminLogin() {
  setupUI.classList.add("hidden");
  adminUI.classList.remove("hidden");
  
  // Player list for admin
  realtimeDb.ref("players").on("value", (snapshot) => {
    const players = snapshot.val() || {};
    document.getElementById("adminPlayerList").innerHTML = Object.keys(players)
      .map(username => `
        <li>
          ${username}
          <button onclick="removePlayer('${username}')">Remove</button>
        </li>
      `).join("");
  });
}

window.removePlayer = async (username) => {
  await realtimeDb.ref(`players/${username}`).remove();
};

document.getElementById("resetGame").addEventListener("click", async () => {
  await realtimeDb.ref("players").remove();
  await realtimeDb.ref("gameState").set({
    gameMaster: "",
    word: "",
    impostorCount: 1,
    gameStarted: false,
    roundActive: false
  });
});

// Game Logic
async function assignRoles(word, impostorCount) {
  const playersSnap = await realtimeDb.ref("players").once("value");
  const players = playersSnap.val();
  const playerList = Object.keys(players).filter(u => u !== "gma");
  
  // Select impostors
  const impostors = [];
  while (impostors.length < impostorCount) {
    const randomPlayer = playerList[Math.floor(Math.random() * playerList.length)];
    if (!impostors.includes(randomPlayer)) {
      impostors.push(randomPlayer);
    }
  }

  // Update roles
  const updates = {};
  playerList.forEach(username => {
    updates[`${username}/role`] = impostors.includes(username) ? "impostor" : "player";
    updates[`${username}/word`] = impostors.includes(username) ? "???" : word;
    updates[`${username}/ready`] = false;
  });
  
  await realtimeDb.ref("players").update(updates);
}

// Next Round System
document.getElementById("nextRound").addEventListener("click", async () => {
  await realtimeDb.ref("gameState").update({
    roundActive: false,
    gameMaster: "",
    word: ""
  });
  
  const playersSnap = await realtimeDb.ref("players").once("value");
  const players = playersSnap.val();
  
  const updates = {};
  Object.keys(players).forEach(username => {
    updates[`${username}/ready`] = false;
    updates[`${username}/role`] = "waiting";
  });
  
  await realtimeDb.ref("players").update(updates);
  gameMasterUI.classList.add("hidden");
  waitingRoomUI.classList.remove("hidden");
});