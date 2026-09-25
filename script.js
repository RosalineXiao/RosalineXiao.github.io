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
const pineconeCopy = document.querySelector("[data-pinecone-copy]");
const arToggle = document.querySelector("[data-ar-toggle]");
const arPanel = document.querySelector("[data-ar-panel]");
const arClose = document.querySelector("[data-ar-close]");
const arVideo = document.querySelector("[data-ar-video]");
const arCanvas = document.querySelector("[data-ar-canvas]");
const arStatus = document.querySelector("[data-ar-status]");
const siteHeader = document.querySelector("[data-header]");

const pineconeScaleLayout = [
  { side: -1, y: 25, open: 7, close: 0.68, twist: 0.2, fold: 0.6 },
  { side: 1, y: 30.5, open: 10, close: 0.7, twist: -0.3, fold: 1.1 },
  { side: -1, y: 36, open: 12, close: 0.64, twist: -0.6, fold: 1.6 },
  { side: 1, y: 41.5, open: 16, close: 0.63, twist: 0.7, fold: 0.8 },
  { side: -1, y: 47, open: 18, close: 0.6, twist: 0.8, fold: 1.2 },
  { side: 1, y: 52.5, open: 21, close: 0.58, twist: -0.5, fold: 1.9 },
  { side: -1, y: 58, open: 23, close: 0.56, twist: -0.2, fold: 0.9 },
  { side: 1, y: 63.5, open: 25, close: 0.55, twist: 0.5, fold: 1.5 },
  { side: -1, y: 69, open: 26, close: 0.57, twist: 0.6, fold: 0.7 },
  { side: 1, y: 74.5, open: 26, close: 0.56, twist: -0.7, fold: 1.8 },
  { side: -1, y: 80, open: 25, close: 0.6, twist: -0.4, fold: 1.2 },
  { side: 1, y: 85.5, open: 22, close: 0.63, twist: 0.6, fold: 0.8 },
  { side: -1, y: 91, open: 20, close: 0.64, twist: 0.5, fold: 1.4 },
  { side: 1, y: 96.5, open: 15, close: 0.69, twist: -0.5, fold: 1.1 },
  { side: -1, y: 102, open: 12, close: 0.7, twist: -0.3, fold: 0.6 },
];

let pineconeAnimating = false;
let pineconeIsClosed = false;
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

function pineconeScalePath(scale, closed) {
  const reach = scale.open * (closed ? scale.close : 1);
  const tipX = 42 + scale.side * reach;
  const tipY = scale.y + (closed
    ? -2.1 - scale.fold + scale.twist * 0.18
    : 4.2 + scale.twist);
  const values = [
    42 + scale.side * 2.2, scale.y - 4.4,
    42 + scale.side * (3.2 + reach * 0.15), scale.y - 8.4,
    tipX - scale.side * reach * 0.24, tipY - 6.1,
    tipX, tipY - 2,
    tipX + scale.side * 2.2, tipY + 0.8,
    tipX + scale.side * 0.1, tipY + 3.6,
    tipX - scale.side * reach * 0.15, tipY + 7.1,
    42 + scale.side * reach * 0.5, scale.y + 10 + scale.fold * 0.35,
    42 - scale.side * 2.2, scale.y + 4.4,
  ];
  const number = (value) => Number(value.toFixed(2)).toString();
  return "M " + number(values[0]) + " " + number(values[1]) +
    " C " + values.slice(2, 8).map(number).join(" ") +
    " Q " + values.slice(8, 12).map(number).join(" ") +
    " C " + values.slice(12, 18).map(number).join(" ") + " Z";
}

function pineconeScaleRidgePath(scale, closed) {
  const reach = scale.open * (closed ? scale.close : 1);
  const tipX = 42 + scale.side * reach;
  const tipY = scale.y + (closed
    ? -2.1 - scale.fold + scale.twist * 0.18
    : 4.2 + scale.twist);
  const startX = 42 + scale.side * reach * 0.36;
  const middleX = 42 + scale.side * reach * 0.62;
  const endX = 42 + scale.side * reach * 0.82;
  const endY = scale.y + (closed ? -0.9 - scale.fold * 0.3 : 2.5 + scale.twist * 0.5);
  const number = (value) => Number(value.toFixed(2)).toString();
  return "M " + number(startX) + " " + number(scale.y + 0.1) +
    " C " + [middleX, scale.y - 2.2, endX, endY - 2.4, tipX, tipY].map(number).join(" ");
}

function tokenizePineconePath(pathData) {
  return pathData.match(/[a-z]|-?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || [];
}

function createPineconeScales() {
  const group = pineconeButton?.querySelector("[data-pinecone-scales]");
  if (!group) return [];

  return pineconeScaleLayout.map((scale, index) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const ridge = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("pine-scale", "tone-" + (index % 4));
    path.setAttribute("d", pineconeScalePath(scale, false));
    ridge.classList.add("pine-scale-ridge");
    ridge.setAttribute("d", pineconeScaleRidgePath(scale, false));
    group.append(path);
    group.append(ridge);

    const openTokens = tokenizePineconePath(path.getAttribute("d"));
    const closedTokens = tokenizePineconePath(pineconeScalePath(scale, true));
    const openRidgeTokens = tokenizePineconePath(ridge.getAttribute("d"));
    const closedRidgeTokens = tokenizePineconePath(pineconeScaleRidgePath(scale, true));
    return {
      path,
      ridge,
      openTokens,
      closedTokens,
      openRidgeTokens,
      closedRidgeTokens,
      delay: index * 18,
    };
  });
}

const pineconeScalePoses = createPineconeScales();

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

function renderPineconePose(closed) {
  pineconeScalePoses.forEach((pose) => {
    const tokens = closed ? pose.closedTokens : pose.openTokens;
    const ridgeTokens = closed ? pose.closedRidgeTokens : pose.openRidgeTokens;
    pose.path.setAttribute("d", tokens.join(" "));
    pose.ridge.setAttribute("d", ridgeTokens.join(" "));
  });
}

function interpolatePineconePose(pose, closed, progress) {
  const from = closed ? pose.openTokens : pose.closedTokens;
  const to = closed ? pose.closedTokens : pose.openTokens;
  const eased = progress * progress * (3 - 2 * progress);
  const pathData = from.map((token, index) => {
    const start = Number(token);
    const end = Number(to[index]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return token;
    return (start + (end - start) * eased).toFixed(2);
  }).join(" ");
  pose.path.setAttribute("d", pathData);

  const ridgeFrom = closed ? pose.openRidgeTokens : pose.closedRidgeTokens;
  const ridgeTo = closed ? pose.closedRidgeTokens : pose.openRidgeTokens;
  const ridgeData = ridgeFrom.map((token, index) => {
    const start = Number(token);
    const end = Number(ridgeTo[index]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return token;
    return (start + (end - start) * eased).toFixed(2);
  }).join(" ");
  pose.ridge.setAttribute("d", ridgeData);
}

function finishPineconeMotion(closed) {
  renderPineconePose(closed);
  pineconeButton.classList.remove("is-watering");
  pineconeButton.classList.toggle("is-closed", closed);
  pineconeButton.classList.toggle("is-responding", closed);
  pineconeStation?.classList.toggle("is-responding", closed);
  document.body.classList.toggle("night-mode", closed);
  document.body.classList.remove("pinecone-dimming");
  pineconeAnimating = false;
}

function waterPinecone() {
  if (!pineconeButton || pineconeAnimating || pineconeScalePoses.length === 0) return;

  const targetClosed = !pineconeIsClosed;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  pineconeAnimating = true;
  pineconeIsClosed = targetClosed;
  pineconeButton.setAttribute("aria-pressed", String(targetClosed));
  pineconeButton.setAttribute("aria-label", targetClosed ? "Open the pinecone" : "Water the pinecone");
  if (pineconeCopy) {
    pineconeCopy.textContent = targetClosed
      ? "A little water makes my scales close. This is a sped-up glimpse of a much slower natural response."
      : "Hi, I'm a little pinecone. Give me some water and watch what happens.";
  }

  document.body.classList.add("pinecone-dimming");
  pineconeStation?.classList.add("is-responding");
  pineconeButton.classList.add("is-responding");
  if (targetClosed && !reducedMotion) {
    pineconeButton.classList.add("is-watering");
  } else {
    pineconeButton.classList.remove("is-watering");
  }

  if (!targetClosed) {
    document.body.classList.remove("night-mode");
    pineconeButton.classList.remove("is-closed");
  }

  if (reducedMotion) {
    finishPineconeMotion(targetClosed);
    return;
  }

  const startDelay = targetClosed ? 240 : 0;
  const duration = targetClosed ? 920 : 1020;
  const maxDelay = Math.max(0, ...pineconeScalePoses.map((pose) => pose.delay));
  const startedAt = performance.now();
  let nightModeStarted = false;

  function animate(now) {
    const elapsed = now - startedAt;
    if (targetClosed && !nightModeStarted && elapsed >= 520) {
      document.body.classList.add("night-mode");
      nightModeStarted = true;
    }

    const poseElapsed = elapsed - startDelay;
    let complete = true;
    pineconeScalePoses.forEach((pose) => {
      const delay = targetClosed ? pose.delay : maxDelay - pose.delay;
      const progress = Math.max(0, Math.min(1, (poseElapsed - delay) / duration));
      interpolatePineconePose(pose, targetClosed, progress);
      if (progress < 1) complete = false;
    });

    if (complete) {
      finishPineconeMotion(targetClosed);
    } else {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
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
        waterPinecone();
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

    waterPinecone();
  });

  pineconeButton.addEventListener("pointerdown", (event) => {
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

    pressStartY = null;
  });

  pineconeButton.addEventListener("pointercancel", () => {
    clearLongPressTimer();
    isDraggingPinecone = false;
    pressStartY = null;
    pineconeStation?.classList.remove("is-dragging");
  });
}

arToggle?.addEventListener("click", openArPanel);
arClose?.addEventListener("click", closeArPanel);
