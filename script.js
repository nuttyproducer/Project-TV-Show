// Global variable to store all episodes
let allEpisodes = [];

function setup() {
  allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);

  // Initialize Search
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  // Initialize Selector
  const episodeSelector = document.getElementById("episode-selector");
  episodeSelector.addEventListener("change", handleSelect);

  // Populate the dropdown list
  populateEpisodeSelector(allEpisodes);
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
    summary.innerHTML = episode.summary;

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);

    episodeCards.appendChild(card);
  }
}

// Function to populate the dropdown menu
function populateEpisodeSelector(episodeList) {
  const selector = document.getElementById("episode-selector");

  for (const episode of episodeList) {
    const option = document.createElement("option");
    option.value = episode.id;

    const seasonCode = String(episode.season).padStart(2, "0");
    const episodeCode = String(episode.number).padStart(2, "0");

    option.textContent = `S${seasonCode}E${episodeCode} - ${episode.name}`;
    selector.appendChild(option);
  }
}

// Function to handle selection from the dropdown
function handleSelect(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    makePageForEpisodes(allEpisodes);
  } else {
    // Filter to find the single episode by ID
    const selectedEpisode = allEpisodes.filter(
      (episode) => episode.id == selectedId,
    );
    makePageForEpisodes(selectedEpisode);
  }

  // Clear the search input when an episode is selected
  document.getElementById("search-input").value = "";
}

function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();

  const filteredEpisodes = allEpisodes.filter((episode) => {
    const nameMatch = episode.name.toLowerCase().includes(searchTerm);
    const summaryMatch = episode.summary
      ? episode.summary.toLowerCase().includes(searchTerm)
      : false;
    return nameMatch || summaryMatch;
  });

  makePageForEpisodes(filteredEpisodes);

  // Reset selector to "All Episodes" when searching
  document.getElementById("episode-selector").value = "all";
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
