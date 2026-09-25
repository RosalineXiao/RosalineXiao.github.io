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

function initialiseFactoryPlayer() {
  const player = document.querySelector("[data-factory-player]");
  if (!player) return;

  const poster = player.querySelector("[data-factory-poster]");
  const stage = player.querySelector("[data-factory-stage]");
  const canvas = player.querySelector("[data-factory-canvas]");
  const loading = player.querySelector("[data-factory-loading]");
  const loadingText = player.querySelector("[data-factory-loading-text]");
  const progress = player.querySelector("[data-factory-progress]");
  const status = player.querySelector("[data-factory-status]");
  const launchButton = player.querySelector("[data-factory-launch]");
  const retryButton = player.querySelector("[data-factory-retry]");
  const buildRoot = "assets/portfolio/ev-battery-factory/webgl";
  const loaderUrl = new URL(`${buildRoot}/Build/PortfolioWebGLNavigationFix.loader.js`, document.baseURI).href;
  const loaderBuildFiles = [
    {
      name: "simulation data",
      paths: Array.from({ length: 11 }, (_, index) => `${buildRoot}/Build/PortfolioWebGLNavigationFix.data.gz.part-${String(index + 1).padStart(2, "0")}`),
      type: "application/octet-stream",
      key: "dataUrl",
    },
    { name: "Unity framework", path: `${buildRoot}/Build/PortfolioWebGLNavigationFix.framework.js.gz`, type: "text/javascript", key: "frameworkUrl" },
    {
      name: "3D runtime",
      paths: Array.from({ length: 5 }, (_, index) => `${buildRoot}/Build/PortfolioWebGLNavigationFix.wasm.gz.part-${String(index + 1).padStart(2, "0")}`),
      type: "application/wasm",
      key: "codeUrl",
    },
  ];
  const objectUrls = [];
  let loaderPromise = null;
  let isLoading = false;
  let unityInstance = null;

  const setStatus = (message) => {
    status.textContent = message;
  };

  const setProgress = (value) => {
    const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
    progress.value = percent;
    progress.textContent = `${percent}%`;
  };

  const releaseObjectUrls = () => {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.length = 0;
  };

  const ensureUnityLoader = () => {
    if (typeof window.createUnityInstance === "function") return Promise.resolve();
    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = loaderUrl;
      script.async = true;
      script.onload = () => typeof window.createUnityInstance === "function"
        ? resolve()
        : reject(new Error("The Unity loader did not initialise."));
      script.onerror = () => {
        script.remove();
        loaderPromise = null;
        reject(new Error("The Unity loader could not be downloaded."));
      };
      document.head.appendChild(script);
    });

    return loaderPromise;
  };

  const loadBuildFile = async (file, onPartProgress) => {
    const paths = file.paths || [file.path];
    const compressedParts = [];

    for (const [index, path] of paths.entries()) {
      loadingText.textContent = paths.length > 1
        ? `Downloading simulation data (${index + 1} of ${paths.length})…`
        : `Downloading and unpacking ${file.name}…`;
      setStatus(paths.length > 1
        ? `Downloading factory data file ${index + 1} of ${paths.length}.`
        : `Downloading and unpacking the ${file.name}.`);
      const response = await fetch(new URL(path, document.baseURI));
      if (!response.ok) throw new Error(`Could not download the ${file.name} (HTTP ${response.status}).`);
      compressedParts.push(await response.blob());
      onPartProgress?.((index + 1) / paths.length);
    }

    const compressedBlob = compressedParts.length === 1 ? compressedParts[0] : new Blob(compressedParts);
    const signature = new Uint8Array(await compressedBlob.slice(0, 2).arrayBuffer());
    const isGzip = signature[0] === 0x1f && signature[1] === 0x8b;
    let decodedBlob = compressedBlob;

    if (isGzip) {
      if (typeof DecompressionStream !== "function") {
        throw new Error("This browser cannot unpack the compressed factory build. Try a recent version of Chrome, Edge, Firefox or Safari.");
      }

      try {
        const reader = compressedBlob.stream().pipeThrough(new DecompressionStream("gzip")).getReader();
        const decodedParts = [];
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          decodedParts.push(chunk.value);
        }
        decodedBlob = new Blob(decodedParts, { type: file.type });
      } catch (error) {
        console.error(`Could not decompress the ${file.name}.`, error);
        throw new Error(`The compressed ${file.name} could not be unpacked. ${error.message || "Check the downloaded build file."}`);
      }
    }

    const objectUrl = URL.createObjectURL(decodedBlob.slice(0, decodedBlob.size, file.type));
    objectUrls.push(objectUrl);
    return objectUrl;
  };

  const startFactory = async () => {
    if (isLoading || unityInstance) return;
    isLoading = true;
    player.dataset.state = "loading";
    launchButton.disabled = true;
    retryButton.hidden = true;
    loading.hidden = false;
    setProgress(0);
    setStatus("Loading the interactive factory. Large build files are downloaded only after launch.");

    try {
      loadingText.textContent = "Preparing the Unity player…";
      await ensureUnityLoader();

      const config = {
        streamingAssetsUrl: new URL(`${buildRoot}/StreamingAssets/`, document.baseURI).href,
        companyName: "DefaultCompany",
        productName: "test_CAD",
        productVersion: "0.1",
        devicePixelRatio: 1,
        matchWebGLToCanvasSize: true,
        showBanner: (message, type) => {
          if (type === "error") setStatus(`Factory runtime: ${message}`);
        },
      };

      for (const [index, file] of loaderBuildFiles.entries()) {
        config[file.key] = await loadBuildFile(file, (partProgress) => {
          setProgress(((index + partProgress) / loaderBuildFiles.length) * 0.14);
        });
        setProgress(((index + 1) / loaderBuildFiles.length) * 0.14);
      }

      loadingText.textContent = "Starting the factory scene…";
      setStatus("Starting the Unity factory scene…");
      stage.hidden = false;
      canvas.focus({ preventScroll: true });

      unityInstance = await window.createUnityInstance(canvas, config, (value) => {
        setProgress(0.14 + value * 0.86);
      });

      poster.hidden = true;
      loading.hidden = true;
      launchButton.hidden = true;
      retryButton.hidden = true;
      player.dataset.state = "ready";
      setProgress(1);
      setStatus("The interactive factory is ready. Select the scene to explore the production flow.");
      releaseObjectUrls();
    } catch (error) {
      const rawErrorMessage = typeof error === "string" ? error : error?.message || String(error || "Unknown player error.");
      const errorMessage = rawErrorMessage.split(/\r?\n/)[0] || "The interactive factory could not be loaded.";
      console.error("The interactive factory did not start.", error);
      stage.hidden = true;
      poster.hidden = false;
      loading.hidden = true;
      launchButton.hidden = true;
      retryButton.hidden = false;
      retryButton.disabled = false;
      player.dataset.state = "error";
      setStatus(`${errorMessage} Your case study and factory screenshots are still available.`);
      releaseObjectUrls();
    } finally {
      launchButton.disabled = false;
      isLoading = false;
    }
  };

  launchButton.addEventListener("click", startFactory);
  retryButton.addEventListener("click", startFactory);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    setStatus("The factory graphics context was interrupted. Reload the page to try the interactive build again; the screenshots and case study remain available.");
  });
}

document.querySelectorAll("[data-project-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    selectProjectTab(button.dataset.projectJump, { updateHash: true, scroll: true });
  });
});

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
initialiseFactoryPlayer();
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
