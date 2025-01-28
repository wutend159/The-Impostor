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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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

    // Sync players with Firestore
    db.collection("players").doc(username).set({
      username: username,
      role: "waiting",
      word: ""
    }).then(() => {
      console.log("Player added to Firestore:", username); // Debugging log
    }).catch((error) => {
      console.error("Error adding player to Firestore:", error); // Debugging log
    });
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

// Assign Roles
function assignRoles() {
  const impostors = chooseImpostors(players, impostorCount);
  players.forEach((player) => {
    const isImpostor = impostors.includes(player);
    const role = isImpostor ? "impostor" : "player";
    const playerWord = isImpostor ? "Impostor" : word;

    // Update Firestore with roles and words
    db.collection("players").doc(player).update({
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
db.collection("players").doc(currentPlayer).onSnapshot((doc) => {
  const data = doc.data();
  if (data.role !== "waiting") {
    document.getElementById("waitingRoom").classList.add("hidden");
    document.getElementById("gameSection").classList.remove("hidden");

    document.getElementById("roleDisplay").textContent = `You are the ${data.role}!`;
    document.getElementById("wordDisplay").textContent = data.role === "impostor" ? "You do not know the word." : `The word is: ${data.word}`;
  }
});
