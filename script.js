// Cache for API responses — never fetch the same URL twice
const cache = {};

// Current state
let allShows = [];
let currentShowId = null;
let allEpisodes = [];

// ─── Setup ────────────────────────────────────────────────────────────────────

function setup() {
  // Wire up the show selector dropdown
  const showSelector = document.getElementById("show-selector");
  showSelector.addEventListener("change", handleShowChange);

  // Wire up the live search input
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  // Wire up the episode selector dropdown
  const episodeSelector = document.getElementById("episode-selector");
  episodeSelector.addEventListener("change", handleSelect);

  // Kick off the API fetch for shows
  fetchShows();
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

function fetchWithCache(url) {
  if (cache[url]) {
    return Promise.resolve(cache[url]);
  }
  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      cache[url] = data;
      return data;
    });
}

function fetchShows() {
  document.getElementById("episode-cards").textContent = "Loading shows...";

  fetchWithCache("https://api.tvmaze.com/shows")
    .then((shows) => {
      allShows = shows.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      );
      populateShowSelector(allShows);
    })
    .catch(() => {
      document.getElementById("episode-cards").textContent =
        "Failed to load shows. Please try again later.";
    });
}

function fetchEpisodes(showId) {
  document.getElementById("episode-cards").textContent = "Loading episodes...";

  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;

  fetchWithCache(url)
    .then((episodes) => {
      allEpisodes = episodes;
      makePageForEpisodes(allEpisodes);
      populateEpisodeSelector(allEpisodes);
      updateBanner(showId);
    })
    .catch(() => {
      document.getElementById("episode-cards").textContent =
        "Failed to load episodes. Please try again later.";
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

// ─── Show Selector ───────────────────────────────────────────────────────────

function populateShowSelector(shows) {
  const selector = document.getElementById("show-selector");
  selector.textContent = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Select a show...";
  selector.appendChild(emptyOption);

  for (const show of shows) {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    selector.appendChild(option);
  }
}

function handleShowChange(event) {
  const showId = event.target.value;

  if (showId === "") {
    document.getElementById("episode-cards").textContent = "Select a show to begin";
    return;
  }

  currentShowId = parseInt(showId, 10);

  // Clear episode selector and search when changing shows
  document.getElementById("episode-selector").value = "all";
  document.getElementById("search-input").value = "";
  document.getElementById("search-count").textContent = "";

  // Fetch episodes for the selected show
  fetchEpisodes(currentShowId);
}

function updateBanner(showId) {
  const show = allShows.find((s) => s.id === showId);
  if (!show) return;

  document.querySelector(".hero-title").textContent = show.name;
  document.querySelector(".hero-summary").innerHTML =
    show.summary || "No summary available.";
}

// ─── Episode Selector ─────────────────────────────────────────────────────────

// Populates the episode dropdown with one option per episode
function populateEpisodeSelector(episodeList) {
  const selector = document.getElementById("episode-selector");

  // Remove all options except the first one ("All Episodes")
  while (selector.options.length > 1) {
    selector.remove(1);
  }

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
