// I use this to remember API results so I don't fetch the same thing twice.
// Key = the URL, value = the data we got back.
const cache = {};

// All the shows we got from TVMaze.
let allShows = [];

// The episodes of the show the user clicked on.
let allEpisodes = [];


// I created genre buckets for the Netflix-style rows.
// I really had to find a way to group multiple genres into one row — just my UI preference :D
const genreBuckets = [
  { label: "Drama",                 genres: ["Drama", "Legal", "Medical", "History", "War"] },
  { label: "Comedy",                genres: ["Comedy", "Music"] },
  { label: "Action & Adventure",    genres: ["Action", "Adventure", "Sports", "Espionage", "Western"] },
  { label: "Crime & Thriller",      genres: ["Crime", "Thriller", "Mystery", "Horror"] },
  { label: "Sci-Fi & Fantasy",      genres: ["Science-Fiction", "Fantasy", "Supernatural", "Anime"] },
  { label: "Romance",               genres: ["Romance"] },
  { label: "Documentary & Reality", genres: ["Nature", "DIY", "Food", "Travel"] },
  { label: "Family & Kids",         genres: ["Children", "Family"] },
];


// --- SETUP ---
// This runs once when the page loads. I hook up all the buttons and inputs here.

function setup() {
  // Shows page — search box and sort dropdown
  document.getElementById("shows-search").addEventListener("input", handleShowsSearch);

  // Episodes page — back button, search box, and jump-to-episode dropdown
  document.getElementById("back-to-shows").addEventListener("click", showShowsView);
  document.getElementById("search-input").addEventListener("input", handleEpisodeSearch);
  document.getElementById("episode-selector").addEventListener("change", handleEpisodeJump);

  // Kick everything off by fetching all the shows
  fetchShows();
}

window.onload = setup;


// --- FETCHING DATA ---

// I made this helper so I never fetch the same URL twice.
// If we already have the data saved in cache, just use that instead.
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
  fetchWithCache("https://api.tvmaze.com/shows")
    .then((shows) => {
      allShows = shows;
      renderGenreRows();
      startHeroRotation();
    })
    .catch(() => {
      document.getElementById("genre-rows").innerHTML =
        '<p class="no-results">Could not load shows. Please try again later.</p>';
    });
}

function fetchEpisodes(showId) {
  const cardsBox = document.getElementById("episode-cards");
  cardsBox.innerHTML = '<p class="no-results">Loading episodes...</p>';

  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;
  fetchWithCache(url)
    .then((episodes) => {
      allEpisodes = episodes;
      renderEpisodes(allEpisodes);
      fillEpisodeSelector(allEpisodes);
      updateEpisodeCount(allEpisodes.length, allEpisodes.length);
    })
    .catch(() => {
      cardsBox.innerHTML =
        '<p class="no-results">Could not load episodes. Please try again later.</p>';
    });
}


// --- HERO BANNER (the big rotating image at the top) ---

// I store the timer here so I can stop it later when the user navigates away.
let heroTimer = null;

function startHeroRotation() {
  stopHeroRotation();

  // I noticed some shows don't have images, so I filter those out first.
  // If none of them have images at all, I just skip the hero section entirely.
  const showsWithImages = allShows.filter((s) => s.image);
  if (showsWithImages.length === 0) return;

  // I make a shuffled copy so the hero shows up in a random order each visit.
  // .slice() makes a copy first so I don't mess up the original array.
  const shuffled = showsWithImages.slice().sort(() => Math.random() - 0.5);
  let index = 0;

  // Show the first one straight away
  showHero(shuffled[0]);

  // Then every 8 seconds, move to the next show in the shuffled list.
  // When we reach the end, % brings us back to the start (so it loops forever).
  heroTimer = setInterval(() => {
    index = (index + 1) % shuffled.length;
    switchHero(shuffled[index]);
  }, 8000);
}

function stopHeroRotation() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

// Put the show's title, summary and background image into the hero section.
function showHero(show) {
  // I try the big (original) image first. If that doesn't exist, I fall back to the smaller (medium) one.
  // TVMaze sometimes only has one of them, so this way it always works.
  const imageUrl = show.image.original || show.image.medium;
  document.getElementById("hero-title").textContent = show.name;
  document.getElementById("hero-summary").innerHTML = show.summary || "";
  document.getElementById("hero-bg").style.backgroundImage = `url("${imageUrl}")`;
}

// Swap to a new show with a fade effect: text fades out → image fades out → swap → image fades in → text fades in.
function switchHero(show) {
  const text = document.getElementById("hero-contents");
  const bg = document.getElementById("hero-bg");

  // Step 1: fade the text out
  text.classList.add("is-fading");

  // Step 2: after 300ms, start fading the background image out too
  setTimeout(() => {
    bg.classList.add("is-fading");

    // Step 3: after another 400ms, swap in the new show and fade the image back in
    setTimeout(() => {
      showHero(show);
      bg.classList.remove("is-fading");

      // Step 4: after another 400ms, fade the text back in
      setTimeout(() => {
        text.classList.remove("is-fading");
      }, 400);
    }, 400);
  }, 300);
}


// --- SWITCHING BETWEEN PAGES ---

function showShowsView() {
  document.getElementById("episodes-view").classList.add("hidden");
  document.getElementById("shows-view").classList.remove("hidden");
  startHeroRotation();
  window.scrollTo(0, 0);
}

function showEpisodesView() {
  stopHeroRotation();
  document.getElementById("shows-view").classList.add("hidden");
  document.getElementById("episodes-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}


// --- SHOWS PAGE ---

// Sort the shows A-Z so the list stays easy to scan.
function sortShows(shows) {
  const sorted = shows.slice(); // copy first so I don't change the original
  sorted.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return sorted;
}

// Check if a show belongs in a genre bucket.
// A show can have multiple genres, so I check if any of them match.
function showMatchesBucket(show, bucket) {
  const showGenres = show.genres || [];
  for (const genre of showGenres) {
    if (bucket.genres.includes(genre)) return true;
  }
  return false;
}

// Build the Netflix-style genre rows on the Shows page.
function renderGenreRows() {
  document.getElementById("shows-flat").classList.add("hidden");
  const rowsBox = document.getElementById("genre-rows");
  rowsBox.classList.remove("hidden");
  rowsBox.innerHTML = "";

  const sortedShows = sortShows(allShows);

  // Go through each genre bucket and build a scrollable row of cards
  for (const bucket of genreBuckets) {
    const showsInBucket = sortedShows.filter((show) => showMatchesBucket(show, bucket));

    // If no shows fit this bucket, skip it entirely
    if (showsInBucket.length === 0) continue;

    const row = document.createElement("section");
    row.className = "genre-row";

    const title = document.createElement("h2");
    title.className = "genre-row-title";
    title.textContent = bucket.label;

    const scroller = document.createElement("div");
    scroller.className = "genre-row-scroll";
    for (const show of showsInBucket) {
      scroller.appendChild(createShowCard(show));
    }

    row.appendChild(title);
    row.appendChild(scroller);
    rowsBox.appendChild(row);
  }
}

// Build one show card. Clicking it opens that show's episodes.
function createShowCard(show) {
  const card = document.createElement("article");
  card.className = "show-card";

  const image = document.createElement("div");
  image.className = "show-card-img";
  if (show.image) {
    image.style.backgroundImage = `url("${show.image.medium}")`;
  }

  const body = document.createElement("div");
  body.className = "show-card-body";

  const title = document.createElement("h3");
  title.className = "show-card-title";
  title.textContent = show.name;

  // Small info line: rating, runtime, status
  const meta = document.createElement("div");
  meta.className = "show-card-meta";

  if (show.rating && show.rating.average) {
    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = `★ ${show.rating.average}`;
    meta.appendChild(rating);
  }
  if (show.runtime) {
    const runtime = document.createElement("span");
    runtime.textContent = `${show.runtime} min`;
    meta.appendChild(runtime);
  }
  if (show.status) {
    const status = document.createElement("span");
    status.textContent = show.status;
    meta.appendChild(status);
  }

  const summary = document.createElement("p");
  summary.className = "show-card-summary";
  // I use innerHTML here on purpose — TVMaze summaries already contain HTML tags like <p>
  summary.innerHTML = show.summary || "No summary available.";

  body.appendChild(title);
  body.appendChild(meta);
  body.appendChild(summary);
  card.appendChild(image);
  card.appendChild(body);

  card.addEventListener("click", () => openShow(show));

  return card;
}

function openShow(show) {
  // Reset the episodes page before showing it
  document.getElementById("episodes-header").innerHTML = `<h2>${show.name}</h2>`;
  document.getElementById("search-input").value = "";
  document.getElementById("episode-selector").value = "all";
  document.getElementById("search-count").textContent = "";

  showEpisodesView();
  fetchEpisodes(show.id);
}

// Filter shows as the user types in the search box.
function handleShowsSearch(event) {
  const term = event.target.value.trim().toLowerCase();
  const countEl = document.getElementById("shows-count");

  // If the search box is empty, go back to the normal genre rows
  if (term === "") {
    if (countEl) countEl.textContent = "";
    renderGenreRows();
    return;
  }

  // Keep only shows where the search term appears in the name, summary, or genres
  const matches = allShows.filter((show) => {
    const name = (show.name || "").toLowerCase();
    const summary = (show.summary || "").toLowerCase();
    const genres = (show.genres || []).join(" ").toLowerCase();
    return name.includes(term) || summary.includes(term) || genres.includes(term);
  });

  // Hide the genre rows and show a flat grid of search results instead
  document.getElementById("genre-rows").classList.add("hidden");
  document.getElementById("shows-flat").classList.remove("hidden");

  const grid = document.getElementById("shows-grid");
  grid.innerHTML = "";

  if (matches.length === 0) {
    grid.innerHTML = '<p class="no-results">No shows match your search.</p>';
  } else {
    for (const show of sortShows(matches)) {
      grid.appendChild(createShowCard(show));
    }
  }

  if (countEl) {
    countEl.textContent = `${matches.length} / ${allShows.length} shows`;
  }
}


// --- EPISODES PAGE ---

function renderEpisodes(episodes) {
  const container = document.getElementById("episode-cards");
  container.innerHTML = "";

  if (episodes.length === 0) {
    container.innerHTML = '<p class="no-results">No episodes match.</p>';
    return;
  }

  for (const episode of episodes) {
    const card = document.createElement("article");
    card.className = "episode-card";
    // I store the episode id here so I can find this card later when the user jumps to it
    card.dataset.episodeId = episode.id;

    // Format the season and episode number like S01E04
    const seasonCode = String(episode.season).padStart(2, "0");
    const episodeCode = String(episode.number).padStart(2, "0");

    const title = document.createElement("h2");
    title.textContent = `${episode.name} - S${seasonCode}E${episodeCode}`;

    const image = document.createElement("img");
    image.src = episode.image ? episode.image.medium : "assets/images/no-image.png";
    image.alt = `Still image from episode: ${episode.name}`;

    const summary = document.createElement("p");
    summary.innerHTML = episode.summary || "No summary available.";

    card.appendChild(title);
    card.appendChild(image);
    card.appendChild(summary);
    container.appendChild(card);
  }
}

// Fill the "Jump to episode..." dropdown with all the episodes.
function fillEpisodeSelector(episodes) {
  const selector = document.getElementById("episode-selector");
  selector.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "all";
  placeholder.textContent = "Jump to episode...";
  selector.appendChild(placeholder);

  for (const episode of episodes) {
    const option = document.createElement("option");
    option.value = episode.id;
    const seasonCode = String(episode.season).padStart(2, "0");
    const episodeCode = String(episode.number).padStart(2, "0");
    option.textContent = `S${seasonCode}E${episodeCode} - ${episode.name}`;
    selector.appendChild(option);
  }
}

// When the user picks an episode from the dropdown, scroll to that card.
// I don't filter anything — all episodes stay on the page, we just scroll down to the right one.
function handleEpisodeJump(event) {
  const id = event.target.value;
  if (id === "all") return;

  // If the user was searching, clear that first so all episodes are visible
  const searchInput = document.getElementById("search-input");
  if (searchInput.value !== "") {
    searchInput.value = "";
    renderEpisodes(allEpisodes);
    updateEpisodeCount(allEpisodes.length, allEpisodes.length);
  }

  // Find the card with this episode id and scroll it into view
  const card = document.querySelector(`.episode-card[data-episode-id="${id}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Filter episodes as the user types in the search box. 
function handleEpisodeSearch(event) {
  const term = event.target.value.toLowerCase();

  const matches = allEpisodes.filter((episode) => {
    const nameHit = episode.name.toLowerCase().includes(term);
    const summaryHit = episode.summary
      ? episode.summary.toLowerCase().includes(term)
      : false;
    return nameHit || summaryHit;
  });

  renderEpisodes(matches);
  updateEpisodeCount(matches.length, allEpisodes.length);

  // Reset the dropdown while the user is searching
  document.getElementById("episode-selector").value = "all";
}

function updateEpisodeCount(shown, total) {
  document.getElementById("search-count").textContent = `${shown} / ${total} episodes`;
}