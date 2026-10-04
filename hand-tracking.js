/* ==================================================================
   VIRTUAL CHEMISTRY LAB — hand-tracking.js  (OPTIONAL MODULE)
   ==================================================================
   Lets a student control the lab with hand gestures instead of a
   mouse/finger: show an open hand over a chemical bottle, close your
   fist to "grab" it, move your hand to a piece of glassware, then
   open your hand again to "release" (pour) it.

   WHY THIS FILE IS SEPARATE FROM script.js:
   Reliable hand/finger tracking realistically requires a trained ML
   model — there's no accurate vanilla-JS way to tell "open hand" from
   "closed fist" from a raw camera frame. This file loads Google's
   MediaPipe Hand Landmarker (free, runs 100% on-device — no video or
   image ever leaves the browser) to do that part. Keeping it in its
   own file/module means script.js stays pure vanilla JS exactly as
   originally specified, and the whole app works perfectly with this
   file deleted — hand control is purely an optional bonus layered
   on top of the mouse/touch drag-and-drop that already works.

   HOW IT TALKS TO script.js:
   Only through one custom DOM event, 'handtrack:drop', fired with
   { apparatusId, chemId } — script.js listens for that event and
   feeds it into the exact same handleAddChemical() pipeline used by
   mouse dragging and tap-to-apply. Zero other coupling between the
   two files.

   Table of contents:
     1. DOM references & guards
     2. Lazy MediaPipe loading (only happens if the student opts in)
     3. Camera start/stop
     4. Per-frame detection loop
     5. Gesture recognition (simple, robust "curled fingers" heuristic)
     6. Grab / carry / release state machine
     7. Small drawing/status helpers
   ================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------
     1. DOM REFERENCES & GUARDS
     If this page doesn't have the hand-tracking markup (e.g. someone
     removed it, or we're on a different page), bail out quietly —
     the rest of the app must never depend on this file existing.
  ---------------------------------------------------------------- */
  const toggleBtn = document.getElementById('handTrackToggle');
  const previewBox = document.getElementById('handTrackPreview');
  const videoEl = document.getElementById('handTrackVideo');
  const canvasEl = document.getElementById('handTrackCanvas');
  const cursorEl = document.getElementById('handCursor');
  const statusEl = document.getElementById('handTrackStatus');

  if (!toggleBtn || !videoEl || !canvasEl || !cursorEl) return;

  const ctx = canvasEl.getContext('2d');

  // ---- Module state ----
  let handLandmarker = null;   // the loaded MediaPipe model (lazy)
  let stream = null;           // active MediaStream from the webcam
  let running = false;         // is the detection loop active
  let rafId = null;
  let lastVideoTime = -1;
  let isGrabbing = false;      // are we currently "holding" a bottle
  let heldChemId = null;
  let heldGhostEl = null;      // the floating bottle clone that follows the hand
  let heldClickableEl = null;  // element being "hovered" for click (button, input, etc.)
  let isScrolling = false;     // fist closed over empty space = "grab the page" and drag it
  let scrollStartY = 0;        // hand's screenY when the page-drag started
  let scrollStartWindowY = 0;  // window.scrollY at that same moment


  /* ----------------------------------------------------------------
     2. LAZY MEDIAPIPE LOADING
     The ~few-MB model only downloads the first time the student
     clicks the toggle — everyone else never pays that cost.
  ---------------------------------------------------------------- */
  async function ensureModel() {
    if (handLandmarker) return handLandmarker;
    setStatus('Loading hand-tracking model…');

    const { HandLandmarker, FilesetResolver } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
    );
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      numHands: 1,
      runningMode: 'VIDEO',
    });
    return handLandmarker;
  }


  /* ----------------------------------------------------------------
     3. CAMERA START / STOP
  ---------------------------------------------------------------- */
  async function start() {
    try {
      setStatus('Requesting camera…');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();

      await ensureModel();

      previewBox.hidden = false;
      cursorEl.hidden = false;
      running = true;
      toggleBtn.classList.add('is-active');
      toggleBtn.setAttribute('aria-pressed', 'true');
      setStatus('Show an open hand to the camera');
      loop();
    } catch (err) {
      console.error('[hand-tracking] failed to start:', err);
      const msg =
        err && err.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : 'Hand tracking unavailable (camera or model failed to load)';
      setStatus(msg, true);
      stop();
    }
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    previewBox.hidden = true;
    cursorEl.hidden = true;
    toggleBtn.classList.remove('is-active');
    toggleBtn.setAttribute('aria-pressed', 'false');
    releaseHeld();
    clearZoneHighlights();
  }

  toggleBtn.addEventListener('click', () => {
    running ? stop() : start();
  });

  // Note: We no longer auto-stop when leaving a page, since hand control
  // is now available on all pages (not just the lab). The user can manually
  // toggle the hand control button off anytime, or it will stop if the page
  // itself closes.


  /* ----------------------------------------------------------------
     4. PER-FRAME DETECTION LOOP
  ---------------------------------------------------------------- */
  function loop() {
    if (!running) return;

    if (canvasEl.width !== videoEl.videoWidth && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
    }

    if (videoEl.currentTime !== lastVideoTime) {
      lastVideoTime = videoEl.currentTime;
      const result = handLandmarker.detectForVideo(videoEl, performance.now());
      processResult(result);
    }
    rafId = requestAnimationFrame(loop);
  }

  function processResult(result) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!result.landmarks || result.landmarks.length === 0) {
      cursorEl.classList.add('is-lost');
      return;
    }
    cursorEl.classList.remove('is-lost');

    const lm = result.landmarks[0]; // track the first detected hand only
    drawSkeleton(lm);

    // Palm center (average of wrist + 4 knuckles) is a much steadier
    // anchor point than any single landmark, especially the fingertips.
    const palm = averagePoints([lm[0], lm[5], lm[9], lm[13], lm[17]]);

    // Map a smaller central region of the camera frame to the FULL
    // screen, so the student doesn't have to wave their hand to the
    // literal edge of the webcam view to reach the screen's corners.
    const screenX = mapRange(1 - palm.x, 0.12, 0.88, 0, window.innerWidth); // mirrored
    const screenY = mapRange(palm.y, 0.08, 0.92, 0, window.innerHeight);

    cursorEl.style.left = `${screenX}px`;
    cursorEl.style.top = `${screenY}px`;

    const grabbing = isFist(lm);
    cursorEl.classList.toggle('is-grabbing', grabbing);

    handleGrabState(grabbing, screenX, screenY);
  }


  /* ----------------------------------------------------------------
     5. GESTURE RECOGNITION
     A simple, robust heuristic: for each of the 4 main fingers, a
     curled finger has its TIP closer to the wrist than its own
     knuckle (MCP) is. If most fingers are curled, call it a fist.
     (The thumb is excluded — it's less reliable with this method.)
  ---------------------------------------------------------------- */
  function isFist(lm) {
    const wrist = lm[0];
    const fingerJoints = [
      [8, 5],   // index: tip, MCP
      [12, 9],  // middle
      [16, 13], // ring
      [20, 17], // pinky
    ];
    let curled = 0;
    fingerJoints.forEach(([tipIdx, mcpIdx]) => {
      const tipDist = dist(lm[tipIdx], wrist);
      const mcpDist = dist(lm[mcpIdx], wrist);
      if (tipDist < mcpDist * 1.05) curled++;
    });
    return curled >= 3; // majority vote, tolerant of one noisy finger
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function averagePoints(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }
  function mapRange(value, inMin, inMax, outMin, outMax) {
    const clamped = Math.min(Math.max(value, inMin), inMax);
    return ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }


  /* ----------------------------------------------------------------
     6. GRAB / CARRY / RELEASE STATE MACHINE
     Handles two cases:
     (a) Bottle grabbing (original feature)
     (b) Button/element clicking (new feature) — fist over a button triggers a click
  ---------------------------------------------------------------- */
  function handleGrabState(grabbing, screenX, screenY) {
    const under = document.elementFromPoint(screenX, screenY);

    // Check for clickable element (button, checkbox, input, etc.)
    const clickableEl = under && under.closest('button, [role="button"], input[type="checkbox"], input[type="text"], input[type="password"]');
    
    // Check for draggable chemical bottle
    const bottleEl = under && under.closest('.chem-bottle');

    if (grabbing && !isGrabbing && !isScrolling) {
      // Fist just closed — pick up a bottle, hover a clickable, OR (if
      // neither is under the hand) grab the page itself to scroll it —
      // the same "close fist to hold, open to let go" gesture used for
      // bottles, just applied to the page so scrolling never needs the
      // mouse/touch either.
      if (bottleEl) {
        isGrabbing = true;
        heldChemId = bottleEl.dataset.chemicalId;
        heldGhostEl = bottleEl.cloneNode(true);
        heldGhostEl.classList.add('bottle-drag-clone');
        heldGhostEl.querySelectorAll('.bottle-info-btn').forEach((b) => b.remove());
        document.body.appendChild(heldGhostEl);
        bottleEl.classList.add('is-dragging');
        setStatus('Grabbed bottle — move to glassware, then open your hand');
      } else if (clickableEl) {
        isGrabbing = true;
        heldClickableEl = clickableEl;
        clickableEl.classList.add('is-hand-hovered');
        setStatus('Hovering over ' + (clickableEl.textContent || clickableEl.type || 'element') + ' — open hand to click');
      } else {
        isScrolling = true;
        scrollStartY = screenY;
        scrollStartWindowY = window.scrollY;
        cursorEl.classList.add('is-scrolling');
        setStatus('Grabbed the page — move your hand up/down to scroll');
      }
    } else if (isScrolling) {
      // Dragging the page: move the hand, the page follows it — exactly
      // like dragging a touchscreen with a finger.
      if (grabbing) {
        const delta = scrollStartY - screenY;
        window.scrollTo(0, scrollStartWindowY + delta);
      } else {
        isScrolling = false;
        cursorEl.classList.remove('is-scrolling');
        setStatus('Show an open hand to the camera');
      }
    } else if (isGrabbing) {
      // Currently grabbing something

      // If holding a bottle, keep the ghost following the hand
      if (heldGhostEl) {
        heldGhostEl.style.left = `${screenX}px`;
        heldGhostEl.style.top = `${screenY}px`;

        const zone = under && under.closest('.apparatus[data-role="dropzone"]:not(.is-hidden-tool)');
        clearZoneHighlights();
        if (zone) zone.classList.add('is-drag-over');
      } 
      // If hovering over a clickable, update the hover state
      else if (heldClickableEl) {
        const stillOverSame = under && under.closest('button, [role="button"], input[type="checkbox"], input[type="text"], input[type="password"]') === heldClickableEl;
        if (!stillOverSame) {
          heldClickableEl.classList.remove('is-hand-hovered');
          heldClickableEl = null;
        }
      }

      // When hand opens, release or click
      if (!grabbing) {
        if (heldGhostEl) {
          // Release bottle
          const zone = under && under.closest('.apparatus[data-role="dropzone"]:not(.is-hidden-tool)');
          if (zone) {
            document.dispatchEvent(
              new CustomEvent('handtrack:drop', { detail: { apparatusId: zone.id, chemId: heldChemId } })
            );
            setStatus('Released! ✨');
          } else {
            setStatus('Released away from glassware');
          }
          releaseHeld();
        } else if (heldClickableEl) {
          // Click the element
          heldClickableEl.classList.remove('is-hand-hovered');
          heldClickableEl.click();
          setStatus('Clicked!');
          heldClickableEl = null;
        }
        isGrabbing = false;
      }
    }
  }

  function releaseHeld() {
    isGrabbing = false;
    isScrolling = false;
    cursorEl.classList.remove('is-scrolling');
    heldChemId = null;
    if (heldGhostEl) {
      heldGhostEl.remove();
      heldGhostEl = null;
    }
    document.querySelectorAll('.chem-bottle.is-dragging').forEach((b) => b.classList.remove('is-dragging'));
    clearZoneHighlights();
  }

  function clearZoneHighlights() {
    document.querySelectorAll('.apparatus.is-drag-over').forEach((z) => z.classList.remove('is-drag-over'));
  }


  /* ----------------------------------------------------------------
     7. SMALL HELPERS
  ---------------------------------------------------------------- */
  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', !!isError);
  }

  // Light skeleton dots on the mini preview — just enough feedback for
  // the student to confirm tracking is alive and roughly calibrated.
  function drawSkeleton(landmarks) {
    ctx.fillStyle = 'rgba(0, 184, 217, 0.9)';
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * canvasEl.width, p.y * canvasEl.height, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
})();
