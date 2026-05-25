function setup() {
  const allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);
}

function makePageForEpisodes(episodeList) {
  const episodeCards = document.getElementById("episode-cards");
  episodeCards.textContent = "";

  for (const episode of episodeList) {
    const card = document.createElement("div");
    card.className = "episode-card";

    const seasonCode = String(episode.season).padStart(2, "0");
    const episodeCode = String(episode.number).padStart(2, "0");

    card.innerHTML = `
      <h2>${episode.name} - S${seasonCode}E${episodeCode}</h2>
      <img src="${episode.image.medium}" alt="${episode.name}">
      <p>${episode.summary}</p>
    `;

    episodeCards.appendChild(card);
  }
}

window.onload = setup;

/*
1. All episodes must be shown
2. For each episode, _at least_ following must be displayed:
   1. The name of the episode
   2. The season number eg. 02
   3. The episode number eg. 07
   4. The medium-sized image for the episode
   5. The summary text of the episode
3. Combine season number and episode number into an **episode code**:
   1. Each part should be zero-padded to two digits.
   2. Example: `S02E07` would be the code for the 7th episode of the 2nd season. `S2E7` would be incorrect.
4. Your page should state somewhere that the data has (originally) come from [TVMaze.com](https://tvmaze.com/), and link back to that site (or the specific episode on that site). See [tvmaze.com/api#licensing](https://www.tvmaze.com/api#licensing).
*/
