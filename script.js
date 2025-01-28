let players = [];
let gameMaster = null;
let word = "";
let impostorCount = 1;

document.getElementById("joinGame").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  if (username) {
    players.push(username);
    alert(`${username} joined the game!`);
    if (players.length === 1) {
      // First player is the Game Master
      gameMaster = username;
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("gameMasterSection").classList.remove("hidden");
    }
  }
});

document.getElementById("startRound").addEventListener("click", () => {
  word = document.getElementById("word").value;
  impostorCount = parseInt(document.getElementById("impostorCount").value);
  if (word && impostorCount > 0) {
    startRound();
  }
});

function startRound() {
  const impostors = chooseImpostors(players, impostorCount);
  players.forEach((player) => {
    if (player === gameMaster) return; // Game Master doesn't play
    const isImpostor = impostors.includes(player);
    displayRole(player, isImpostor);
  });
  document.getElementById("gameMasterSection").classList.add("hidden");
  document.getElementById("playerSection").classList.remove("hidden");
}

function chooseImpostors(players, count) {
  const shuffled = players.slice(1).sort(() => 0.5 - Math.random()); // Exclude Game Master
  return shuffled.slice(0, count);
}

function displayRole(player, isImpostor) {
  if (player === document.getElementById("username").value) {
    const roleDisplay = document.getElementById("roleDisplay");
    const wordDisplay = document.getElementById("wordDisplay");
    if (isImpostor) {
      roleDisplay.textContent = "You are the Impostor!";
      wordDisplay.textContent = "You do not know the word.";
    } else {
      roleDisplay.textContent = "You are a Player!";
      wordDisplay.textContent = `The word is: ${word}`;
    }
  }
}
