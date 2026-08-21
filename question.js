const params = new URLSearchParams(window.location.search);

const level = params.get("level");

const levelDisplay = document.getElementById("levelDisplay");

levelDisplay.textContent = "Level " + level;