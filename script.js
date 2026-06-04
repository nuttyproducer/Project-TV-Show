// TVMaze API endpoint for Game of Thrones episodes
const url = "https://api.tvmaze.com/shows/82/episodes";

// Stores all fetched episodes so we never need to re-fetch during the same visit
let allEpisodes = [];

// ─── Setup ────────────────────────────────────────────────────────────────────

function setup() {
  // Wire up the live search input
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  // Wire up the episode selector dropdown
  const episodeSelector = document.getElementById("episode-selector");
  episodeSelector.addEventListener("change", handleSelect);

  // Kick off the API fetch
  fetchEpisodes();
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

function fetchEpisodes() {
  // Show a loading message so the user knows something is happening
  document.getElementById("episode-cards").textContent = "Loading episodes...";

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      // Store episodes globally — this is the only time we fetch
      allEpisodes = data;
      makePageForEpisodes(allEpisodes);
      populateEpisodeSelector(allEpisodes);
    })
    .catch(function () {
      // Show a visible error message — console.log is not enough for real users
      document.getElementById("episode-cards").textContent =
        "Something went wrong while loading the episodes. Please try again later.";
    });
}

// ─── Rendering ────────────────────────────────────────────────────────────────

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
    // Some episodes may not have an image — fall back to a placeholder
    image.src = episode.image ? episode.image.medium : "assets/images/no-image.png";
    image.alt = `Still image from episode: ${episode.name}`;

    const summary = document.createElement("p");
    // innerHTML is intentional — TVMaze wraps summaries in HTML tags
    summary.innerHTML = episode.summary || "No summary available.";

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);

    episodeCards.appendChild(card);
  }
}

// ─── Episode Selector ─────────────────────────────────────────────────────────

// Populates the episode dropdown with one option per episode
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

// Handles the user picking an episode from the dropdown
function handleSelect(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    // "All Episodes" selected — show everything
    makePageForEpisodes(allEpisodes);
  } else {
    // Find the single episode that matches the selected ID
    const selectedEpisode = allEpisodes.filter(
      (episode) => episode.id == selectedId,
    );
    makePageForEpisodes(selectedEpisode);
  }

  // Clear the search box when an episode is picked directly
  document.getElementById("search-input").value = "";
  document.getElementById("search-count").textContent = "";
}

// ─── Search ───────────────────────────────────────────────────────────────────

// Filters episodes in real-time as the user types
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();

  const filteredEpisodes = allEpisodes.filter((episode) => {
    const nameMatch = episode.name.toLowerCase().includes(searchTerm);
    // Guard against episodes that have no summary
    const summaryMatch = episode.summary
      ? episode.summary.toLowerCase().includes(searchTerm)
      : false;
    return nameMatch || summaryMatch;
  });

  makePageForEpisodes(filteredEpisodes);

  // Show a count so the user knows how many results matched
  const searchCount = document.getElementById("search-count");
  if (searchTerm.length > 0) {
    searchCount.textContent = `${filteredEpisodes.length} / ${allEpisodes.length} episodes`;
  } else {
    searchCount.textContent = "";
  }

  // Reset the episode dropdown back to "All Episodes" while searching
  document.getElementById("episode-selector").value = "all";
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.onload = setup;
