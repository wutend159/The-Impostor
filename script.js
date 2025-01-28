// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// Join Game
document.getElementById("joinGame").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  if (username) {
    currentPlayer = username;
    players.push(username);
    updatePlayerList();

    // If this is the first player, make them the Game Master
    if (players.length === 1) {
      gameMaster = username;
      document.getElementById("gameMasterSection").classList.remove("hidden");
    }

    // Sync players with Firestore
    try {
      await setDoc(doc(db, "players", username), {
        username: username,
        role: "waiting",
        word: ""
      });
      console.log("Player added to Firestore:", username);
    } catch (error) {
      console.error("Error adding player to Firestore:", error);
    }
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
async function assignRoles() {
  const impostors = chooseImpostors(players, impostorCount);
  for (const player of players) {
    const isImpostor = impostors.includes(player);
    const role = isImpostor ? "impostor" : "player";
    const playerWord = isImpostor ? "Impostor" : word;

    try {
      await updateDoc(doc(db, "players", player), {
        role: role,
        word: playerWord
      });
      console.log("Role assigned to player:", player, "Role:", role);
    } catch (error) {
      console.error("Error assigning role to player:", error);
    }
  }
  alert("Roles have been assigned. Check your role!");
}

// Listen for Role Updates
onSnapshot(doc(db, "players", currentPlayer), (doc) => {
  const data = doc.data();
  if (data.role !== "waiting") {
    document.getElementById("waitingRoom").classList.add("hidden");
    document.getElementById("gameSection").classList.remove("hidden");

    document.getElementById("roleDisplay").textContent = `You are the ${data.role}!`;
    document.getElementById("wordDisplay").textContent = data.role === "impostor" ? "You do not know the word." : `The word is: ${data.word}`;
  }
});
