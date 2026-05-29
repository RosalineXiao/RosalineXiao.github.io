const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll(".project-card");
const portfolioCards = document.querySelectorAll(".portfolio-card");
const projectDetails = document.querySelectorAll(".project-detail");
const activityGalleries = document.querySelectorAll("[data-activity-gallery]");
const photoAlbums = document.querySelectorAll("[data-photo-album]");
const photoPreviewButtons = document.querySelectorAll("[data-lightbox-src]");
const photoLightbox = document.querySelector("[data-photo-lightbox]");
const photoLightboxImage = document.querySelector("[data-lightbox-image]");
const photoLightboxClose = document.querySelector("[data-lightbox-close]");
const pineconeStation = document.querySelector("[data-pinecone-station]");
const pineconeButton = document.querySelector("[data-pinecone]");
const arToggle = document.querySelector("[data-ar-toggle]");
const arPanel = document.querySelector("[data-ar-panel]");
const arClose = document.querySelector("[data-ar-close]");
const arVideo = document.querySelector("[data-ar-video]");
const arCanvas = document.querySelector("[data-ar-canvas]");
const arStatus = document.querySelector("[data-ar-status]");
const siteHeader = document.querySelector("[data-header]");

let pineconeClosed = false;
let pineconeAnimating = false;
let touchStartY = null;
let pressStartY = null;
let longPressTimer = null;
let isDraggingPinecone = false;
let suppressPineconeClick = false;
let dragOffset = { x: 0, y: 0 };
let arStream = null;
let gestureRecognizer = null;
let arRunning = false;
let pinchWasClosed = false;
let lastPhotoTrigger = null;

function syncHeaderState() {
  if (!siteHeader) return;
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 24);
}

function applyFilter(filter) {
  projectCards.forEach((card) => {
    const isVisible = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("hidden", !isVisible);
  });

  if (portfolioCards.length > 0) {
    const activeCard = Array.from(portfolioCards).find(
      (card) => !card.classList.contains("hidden") && card.classList.contains("active")
    );
    const fallbackCard = Array.from(portfolioCards).find((card) => !card.classList.contains("hidden"));
    const nextCard = activeCard || fallbackCard;

    if (nextCard) {
      selectProjectTab(getProjectIdFromCard(nextCard), { updateHash: false, scroll: false });
    }
  }
}

function getProjectIdFromCard(card) {
  return card?.getAttribute("href")?.replace("#", "") || "";
}

function selectProjectTab(projectId, options = {}) {
  if (!projectId || projectDetails.length === 0) return;

  const target = document.getElementById(projectId);
  if (!target) return;

  portfolioCards.forEach((card) => {
    const isActive = getProjectIdFromCard(card) === projectId;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-selected", String(isActive));
    card.setAttribute("tabindex", isActive ? "0" : "-1");
  });

  projectDetails.forEach((detail) => {
    const isActive = detail.id === projectId;
    detail.classList.toggle("active", isActive);
    detail.toggleAttribute("hidden", !isActive);
  });

  if (options.updateHash) {
    window.history.replaceState(null, "", `#${projectId}`);
  }

  if (options.scroll) {
    document.querySelector(".portfolio-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function initialiseProjectTabs() {
  if (portfolioCards.length === 0 || projectDetails.length === 0) return;

  portfolioCards.forEach((card) => {
    const projectId = getProjectIdFromCard(card);
    card.setAttribute("role", "tab");
    card.setAttribute("aria-controls", projectId);
    card.setAttribute("aria-selected", "false");

    card.addEventListener("click", (event) => {
      event.preventDefault();
      selectProjectTab(projectId, { updateHash: true, scroll: true });
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectProjectTab(projectId, { updateHash: true, scroll: true });
      }
    });
  });

  projectDetails.forEach((detail) => {
    detail.setAttribute("role", "tabpanel");
  });

  const hashProject = window.location.hash.replace("#", "");
  const firstCard = Array.from(portfolioCards).find((card) => !card.classList.contains("hidden"));
  const initialProject = document.getElementById(hashProject) ? hashProject : getProjectIdFromCard(firstCard);
  selectProjectTab(initialProject, { updateHash: false, scroll: false });

  if (hashProject && hashProject === initialProject) {
    window.setTimeout(() => {
      document.querySelector(".portfolio-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }
}

function initialiseActivityGalleries() {
  activityGalleries.forEach((gallery) => {
    const slider = gallery.parentElement?.querySelector("[data-gallery-slider]");
    if (!slider) return;

    const getMaxScroll = () => Math.max(0, gallery.scrollWidth - gallery.clientWidth);

    const syncSlider = () => {
      const maxScroll = getMaxScroll();
      slider.value = maxScroll ? Math.round((gallery.scrollLeft / maxScroll) * 100) : 0;
    };

    slider.addEventListener("input", () => {
      gallery.scrollLeft = getMaxScroll() * (Number(slider.value) / 100);
    });

    gallery.addEventListener("scroll", syncSlider, { passive: true });
    window.addEventListener("resize", syncSlider);
    syncSlider();
  });
}

function initialisePhotoAlbums() {
  photoAlbums.forEach((album) => {
    const button = album.querySelector(".album-cover");
    const panel = album.querySelector(".album-expanded");
    if (!button || !panel) return;

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      panel.toggleAttribute("hidden", isOpen);
    });
  });
}

function openPhotoLightbox(button) {
  if (!photoLightbox || !photoLightboxImage) return;

  lastPhotoTrigger = button;
  photoLightboxImage.src = button.dataset.lightboxSrc;
  photoLightboxImage.alt = button.dataset.lightboxAlt || "Large photography preview";
  photoLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  photoLightboxClose?.focus();
}

function closePhotoLightbox() {
  if (!photoLightbox || !photoLightboxImage || photoLightbox.hidden) return;

  photoLightbox.hidden = true;
  photoLightboxImage.removeAttribute("src");
  photoLightboxImage.alt = "";
  document.body.classList.remove("lightbox-open");
  lastPhotoTrigger?.focus();
}

function initialisePhotoProtection() {
  photoPreviewButtons.forEach((button) => {
    button.addEventListener("click", () => openPhotoLightbox(button));
  });

  photoLightboxClose?.addEventListener("click", closePhotoLightbox);

  photoLightbox?.addEventListener("click", (event) => {
    if (event.target === photoLightbox) {
      closePhotoLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePhotoLightbox();
    }
  });

  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".photo-section img, .photo-lightbox")) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target.closest(".photo-section img, .photo-lightbox img")) {
      event.preventDefault();
    }
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    applyFilter(button.dataset.filter);
  });
});

initialiseProjectTabs();
initialiseActivityGalleries();
initialisePhotoAlbums();
initialisePhotoProtection();
syncHeaderState();
window.addEventListener("scroll", syncHeaderState, { passive: true });
window.addEventListener("resize", syncHeaderState);

function setArStatus(message) {
  if (arStatus) {
    arStatus.textContent = message;
  }
}

function closePinecone() {
  if (!pineconeButton || pineconeAnimating || pineconeClosed) return;

  pineconeAnimating = true;
  pineconeButton.classList.add("is-watering");

  window.setTimeout(() => {
    document.body.classList.add("pinecone-dimming");
    pineconeButton.classList.add("is-closed");
  }, 640);

  window.setTimeout(() => {
    document.body.classList.add("night-mode");
    pineconeButton.classList.add("is-off");
    pineconeClosed = true;
  }, 1120);

  window.setTimeout(() => {
    pineconeButton.classList.remove("is-watering");
    document.body.classList.remove("pinecone-dimming");
    pineconeAnimating = false;
  }, 1900);
}

function openPinecone() {
  if (!pineconeButton || pineconeAnimating || !pineconeClosed) return;

  pineconeAnimating = true;
  document.body.classList.remove("night-mode");
  pineconeButton.classList.remove("is-off");
  pineconeButton.classList.remove("is-closed");

  window.setTimeout(() => {
    pineconeClosed = false;
    pineconeAnimating = false;
  }, 900);
}

function togglePinecone() {
  if (pineconeClosed) {
    openPinecone();
  } else {
    closePinecone();
  }
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function fingertipClusterRadius(landmarks) {
  const tips = [4, 8, 12, 16, 20].map((index) => landmarks[index]);
  const center = tips.reduce(
    (sum, point) => ({
      x: sum.x + point.x / tips.length,
      y: sum.y + point.y / tips.length,
    }),
    { x: 0, y: 0 }
  );

  return tips.reduce((sum, point) => sum + distance(point, center), 0) / tips.length;
}

function drawHandLandmarks(landmarks) {
  if (!arCanvas || !arVideo) return;

  const overlay = arCanvas.getContext("2d");
  const rect = arVideo.getBoundingClientRect();
  arCanvas.width = Math.max(1, Math.floor(rect.width));
  arCanvas.height = Math.max(1, Math.floor(rect.height));
  overlay.clearRect(0, 0, arCanvas.width, arCanvas.height);
  overlay.fillStyle = "rgba(185, 221, 87, 0.9)";

  landmarks.forEach((point) => {
    overlay.beginPath();
    overlay.arc(point.x * arCanvas.width, point.y * arCanvas.height, 3, 0, Math.PI * 2);
    overlay.fill();
  });
}

async function loadGestureRecognizer() {
  if (gestureRecognizer) return gestureRecognizer;

  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18");
  const filesetResolver = await vision.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
  );

  const options = (delegate) => ({
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate,
    },
    runningMode: "VIDEO",
    numHands: 1,
  });

  try {
    gestureRecognizer = await vision.GestureRecognizer.createFromOptions(filesetResolver, options("GPU"));
  } catch (error) {
    gestureRecognizer = await vision.GestureRecognizer.createFromOptions(filesetResolver, options("CPU"));
  }

  return gestureRecognizer;
}

async function detectGestureLoop() {
  if (!arRunning || !arVideo || !gestureRecognizer) return;

  if (arVideo.readyState >= 2) {
    const results = gestureRecognizer.recognizeForVideo(arVideo, performance.now());
    const landmarks = results.landmarks?.[0];

    if (landmarks) {
      drawHandLandmarks(landmarks);
      const clusterRadius = fingertipClusterRadius(landmarks);
      const isPinched = clusterRadius < 0.075;

      if (isPinched) {
        pinchWasClosed = true;
        setArStatus("Pinch");
      } else if (pinchWasClosed) {
        pinchWasClosed = false;
        setArStatus("Release");
        togglePinecone();
      } else {
        setArStatus("Camera");
      }
    }
  }

  requestAnimationFrame(detectGestureLoop);
}

async function openArPanel() {
  if (!arPanel || !arVideo) return;

  arPanel.hidden = false;
  setArStatus("Camera");

  try {
    arStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false,
    });
    arVideo.srcObject = arStream;
    await arVideo.play();
    setArStatus("Loading");
    await loadGestureRecognizer();
    arRunning = true;
    pinchWasClosed = false;
    setArStatus("Camera");
    requestAnimationFrame(detectGestureLoop);
  } catch (error) {
    setArStatus("Unavailable");
  }
}

function closeArPanel() {
  arRunning = false;
  pinchWasClosed = false;

  if (arStream) {
    arStream.getTracks().forEach((track) => track.stop());
    arStream = null;
  }

  if (arVideo) {
    arVideo.srcObject = null;
  }

  if (arCanvas) {
    const overlay = arCanvas.getContext("2d");
    overlay.clearRect(0, 0, arCanvas.width, arCanvas.height);
  }

  if (arPanel) {
    arPanel.hidden = true;
  }
}

function clearLongPressTimer() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function movePineconeStation(clientX, clientY) {
  if (!pineconeStation) return;

  const parentRect = pineconeStation.offsetParent.getBoundingClientRect();
  const stationRect = pineconeStation.getBoundingClientRect();
  const maxX = parentRect.width - stationRect.width - 8;
  const maxY = parentRect.height - stationRect.height - 8;
  const x = Math.min(Math.max(8, clientX - parentRect.left - dragOffset.x), maxX);
  const y = Math.min(Math.max(8, clientY - parentRect.top - dragOffset.y), maxY);

  pineconeStation.style.left = `${x}px`;
  pineconeStation.style.top = `${y}px`;
  pineconeStation.style.right = "auto";
  pineconeStation.style.bottom = "auto";
}

function startPineconeDrag(event) {
  if (!pineconeStation || !pineconeButton) return;

  const stationRect = pineconeStation.getBoundingClientRect();
  dragOffset = {
    x: event.clientX - stationRect.left,
    y: event.clientY - stationRect.top,
  };
  isDraggingPinecone = true;
  suppressPineconeClick = true;
  pineconeStation.classList.add("is-dragging");

  try {
    pineconeButton.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Synthetic pointer events used in tests do not own capture.
  }
}

if (pineconeButton) {
  pineconeButton.addEventListener("click", (event) => {
    if (suppressPineconeClick) {
      event.preventDefault();
      suppressPineconeClick = false;
      return;
    }

    togglePinecone();
  });

  pineconeButton.addEventListener("pointerdown", (event) => {
    touchStartY = event.clientY;
    pressStartY = event.clientY;
    suppressPineconeClick = false;
    clearLongPressTimer();
    longPressTimer = window.setTimeout(() => startPineconeDrag(event), 420);
  });

  pineconeButton.addEventListener("pointermove", (event) => {
    if (isDraggingPinecone) {
      event.preventDefault();
      movePineconeStation(event.clientX, event.clientY);
      return;
    }

    if (pressStartY !== null && Math.abs(event.clientY - pressStartY) > 10) {
      clearLongPressTimer();
    }
  });

  pineconeButton.addEventListener("pointerup", (event) => {
    clearLongPressTimer();

    if (isDraggingPinecone) {
      isDraggingPinecone = false;
      pineconeStation?.classList.remove("is-dragging");
      return;
    }

    if (touchStartY !== null) {
      const deltaY = event.clientY - touchStartY;

      if (deltaY < -24) {
        suppressPineconeClick = true;
        closePinecone();
      } else if (deltaY > 24) {
        suppressPineconeClick = true;
        openPinecone();
      }
    }

    touchStartY = null;
    pressStartY = null;
  });

  pineconeButton.addEventListener("pointercancel", () => {
    clearLongPressTimer();
    isDraggingPinecone = false;
    touchStartY = null;
    pressStartY = null;
    pineconeStation?.classList.remove("is-dragging");
  });
}

arToggle?.addEventListener("click", openArPanel);
arClose?.addEventListener("click", closeArPanel);
