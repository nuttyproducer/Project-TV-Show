const url = "https://api.tvmaze.com/shows/82/episodes";

function setup() {
  //Show loading message in the cards area
  document.getElementById("episode-cards").textContent = "Loading episodes...";

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      makePageForEpisodes(data);
    })
    .catch(function () {
      document.getElementById("episode-cards").textContent =
        "Something went wrong while loading the episodes. Please try again later";
    });
}

function makePageForEpisodes(episodeList) {
  const episodeCards = document.getElementById("episode-cards");
  episodeCards.textContent = "";

  for (const episode of episodeList) {
    const card = document.createElement("article");
    card.className = "episode-card";

    const seasonCode = String(episode.season).padStart(2, "0");
    const episodeCode = String(episode.number).padStart(2, "0");

    const title = document.createElement("h2");
    title.textContent = `${episode.name} - S${seasonCode}E${episodeCode}`;

    const image = document.createElement("img");
    image.src = episode.image.medium;
    image.alt = `Still image from episode: ${episode.name}`;

    const summary = document.createElement("p");
    summary.innerHTML = episode.summary; // innerHTML needed here because TVMaze returns HTML tags in the summary

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);

    episodeCards.appendChild(card);
  }
}

window.onload = setup;
