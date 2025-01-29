// Firebase configuration (replace with your own)
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
const realtimeDb = firebase.database(); // Initialize Realtime Database

let players = [];
let gameMaster = null;
let word = "";
let impostorCount = 1;
let currentPlayer = null;

// Join Game
document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  console.log("Join Game button clicked. Username:", username); // Debugging log
  if (username) {
    currentPlayer = username;
    players.push(username);
    console.log("Players list updated:", players); // Debugging log
    updatePlayerList();

    // Hide setup and show waiting room
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("waitingRoom").classList.remove("hidden");

    // If this is the first player, make them the Game Master
    if (players.length === 1) {
      gameMaster = username;
      console.log("Game Master set to:", gameMaster); // Debugging log
      document.getElementById("gameMasterSection").classList.remove("hidden");
    }

    // Add player to Realtime Database
    addPlayerToRealtimeDb(username);
  }
});

// Start Round
document.getElementById("startRound").addEventListener("click", () => {
  word = document.getElementById("word").value;
  impostorCount = parseInt(document.getElementById("impostorCount").value);
  if (word && impostorCount > 0) {
    assignRoles();
  }
});

// Add Player to Realtime Database
function addPlayerToRealtimeDb(username) {
  realtimeDb.ref("players/" + username).set({
    username: username,
    role: "waiting",
    word: ""
  }).then(() => {
    console.log("Player added to Realtime Database:", username); // Debugging log
  }).catch((error) => {
    console.error("Error adding player to Realtime Database:", error); // Debugging log
  });
}

// Assign Roles
function assignRoles() {
  const impostors = chooseImpostors(players, impostorCount);
  players.forEach((player) => {
    const isImpostor = impostors.includes(player);
    const role = isImpostor ? "impostor" : "player";
    const playerWord = isImpostor ? "Impostor" : word;

    // Update Realtime Database with roles and words
    realtimeDb.ref("players/" + player).update({
      role: role,
      word: playerWord
    }).then(() => {
      console.log("Role assigned to player:", player, "Role:", role); // Debugging log
    }).catch((error) => {
      console.error("Error assigning role to player:", error); // Debugging log
    });
  });

  // Notify players to check their roles
  alert("Roles have been assigned. Check your role!");
}

// Choose Impostors
function chooseImpostors(players, count) {
  const shuffled = players.slice(1).sort(() => 0.5 - Math.random()); // Exclude Game Master
  return shuffled.slice(0, count);
}

// Update Player List
function updatePlayerList() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = players.map(player => `<li>${player}</li>`).join("");
}

// Listen for Role Updates
realtimeDb.ref("players/" + currentPlayer).on("value", (snapshot) => {
  const data = snapshot.val();
  if (data && data.role !== "waiting") {
    document.getElementById("waitingRoom").classList.add("hidden");
    document.getElementById("gameSection").classList.remove("hidden");

    document.getElementById("roleDisplay").textContent = `You are the ${data.role}!`;
    document.getElementById("wordDisplay").textContent = data.role === "impostor" ? "You do not know the word." : `The word is: ${data.word}`;
  }
});
