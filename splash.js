const splashVideo = document.getElementById("splash-video");
const splashOverlay = document.getElementById("splash-overlay");
const mainContent = document.getElementById("main-content");

document.body.style.overflow = "hidden";

splashVideo.addEventListener("ended", function () {
  splashOverlay.classList.add("fade-out");
  mainContent.classList.add("fade-in");
  splashOverlay.addEventListener(
    "transitionend",
    function () {
      splashOverlay.style.display = "none";
      document.body.style.overflow = "";
    },
    { once: true },
  );
});
