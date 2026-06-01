const showsUrl = "https://api.tvmaze.com/shows";

// Cache to avoid fetching the same URL more than once
const cache = {};

// Stores all shows fetched from the API (used for the hero slideshow and lookups)
let allShows = [];

// Stores the episodes for the currently selected show
let allEpisodes = [];

// Keeps track of the hero slideshow interval so we can stop it when a show is picked
let heroCycleInterval = null;

function setup() {
  // Initialize Search
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", handleSearch);

  // Initialize Episode Selector
  const episodeSelector = document.getElementById("episode-selector");
  episodeSelector.addEventListener("change", handleSelect);

  // Initialize Show Selector
  const showSelector = document.getElementById("show-selector");
  showSelector.addEventListener("change", handleShowSelect);

  // Fetch all shows on page load
  fetchShows();
}

function fetchShows() {
  cachedFetch(showsUrl)
    .then((shows) => {
      const sorted = shows
        .slice()
        .sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        );

      // Store sorted shows globally so we can look them up later
      allShows = sorted;

      populateShowSelector(sorted);

      // Start cycling the hero banner through the first 3 shows.
      // This gives the page a dynamic, Netflix-style feel before the user picks anything.
      startHeroCycle(sorted);

      // Auto-load the first show alphabetically so the page isn't empty on arrival.
      // We also update the dropdown value to visually reflect which show is selected.
      if (sorted.length > 0) {
        const showSelector = document.getElementById("show-selector");
        showSelector.value = sorted[0].id; // Sync the dropdown to match the auto-loaded show
        loadEpisodesForShow(sorted[0].id);
      }
    })
    .catch(function () {
      document.getElementById("episode-cards").textContent =
        "Something went wrong while loading the show list. Please try again later.";
    });
}

// Cycles the hero banner through the first 5 shows every 5 seconds.
// Stops automatically once the user manually selects a show.
function startHeroCycle(showList) {
  // Take only the first 5 shows for the slideshow
  const heroShows = showList.slice(0, 5);
  let currentIndex = 0;

  // Show the first one immediately
  updateHero(heroShows[currentIndex]);

  // Then rotate every 8 seconds
  heroCycleInterval = setInterval(function () {
    currentIndex = (currentIndex + 1) % heroShows.length;
    updateHero(heroShows[currentIndex]);
  }, 8000);
}

// Updates the hero banner (background image, title, summary) to match the given show.
function updateHero(show) {
  const banner = document.querySelector(".banner");
  const bannerContents = document.querySelector(".banner-contents");

  // Step 1: fade the text out
  bannerContents.style.opacity = "0";

  // Step 2: after the fade-out completes (0.6s), swap all the content
  setTimeout(function () {
    // Swap the background image
    if (show.image) {
      banner.style.backgroundImage = `url(${show.image.original})`;
    }

    // Swap the title
    document.querySelector(".hero-title").textContent = show.name;

    // Swap the summary — uses innerHTML because TVMaze wraps summaries in <p> tags
    document.querySelector(".hero-summary").innerHTML =
      show.summary || "No summary available.";

    // Step 3: fade the text back in
    bannerContents.style.opacity = "1";
  }, 600);
}

function cachedFetch(url) {
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

function populateShowSelector(showList) {
  const selector = document.getElementById("show-selector");
  selector.textContent = "";

  // Add a default placeholder option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- Select a Show --";
  defaultOption.disabled = true;
  selector.appendChild(defaultOption);

  for (const show of showList) {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    selector.appendChild(option);
  }
}

function handleShowSelect(event) {
  const showId = event.target.value;

  // Stop the hero slideshow — the user has made their choice
  clearInterval(heroCycleInterval);

  // Update the hero banner to show the selected show
  const selectedShow = allShows.find((show) => show.id == showId);
  if (selectedShow) {
    updateHero(selectedShow);
  }

  loadEpisodesForShow(showId);
}

function loadEpisodesForShow(showId) {
  const episodesUrl = `https://api.tvmaze.com/shows/${showId}/episodes`;

  // Reset search and episode selector
  document.getElementById("search-input").value = "";
  document.getElementById("search-count").textContent = "";
  resetEpisodeSelector();

  document.getElementById("episode-cards").textContent = "Loading episodes...";

  cachedFetch(episodesUrl)
    .then((data) => {
      allEpisodes = data;
      makePageForEpisodes(allEpisodes);
      populateEpisodeSelector(allEpisodes);
    })
    .catch(function () {
      document.getElementById("episode-cards").textContent =
        "Something went wrong while loading the episodes. Please try again later.";
    });
}

function resetEpisodeSelector() {
  const selector = document.getElementById("episode-selector");
  selector.textContent = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = "All Episodes";
  selector.appendChild(defaultOption);
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
    image.src = episode.image
      ? episode.image.medium
      : "assets/images/no-image.png";
    image.alt = `Still image from episode: ${episode.name}`;

    const summary = document.createElement("p");
    summary.innerHTML = episode.summary || "No summary available.";

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);

    episodeCards.appendChild(card);
  }
}

// Function to populate the episode dropdown menu
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

// Function to handle selection from the episode dropdown
function handleSelect(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    makePageForEpisodes(allEpisodes);
  } else {
    const selectedEpisode = allEpisodes.filter(
      (episode) => episode.id == selectedId,
    );
    makePageForEpisodes(selectedEpisode);
  }

  // Clear the search input when an episode is selected
  document.getElementById("search-input").value = "";
  document.getElementById("search-count").textContent = "";
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

  // Show count of matching episodes
  const searchCount = document.getElementById("search-count");
  if (searchTerm.length > 0) {
    searchCount.textContent = `${filteredEpisodes.length} / ${allEpisodes.length} episodes`;
  } else {
    searchCount.textContent = "";
  }

  // Reset episode selector to "All Episodes" when searching
  document.getElementById("episode-selector").value = "all";
}

window.onload = setup;
