// HIGH RES REACTION DIFFUSION TOOL — RESPONSIVE + 2000PX PNG EXPORT + SAVE MODEL

let mainCanvas;

let a, b, paint;
let nextA, nextB, nextPaint;
let pg;

let simW, simH;
let canvasW, canvasH;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

let topMargin = 72;
let bottomMargin = 170;

let dA = 1.0;
let dB = 0.5;

let feed = 0.055;
let k = 0.062;

let speedSlider;
let thicknessSlider;
let brushSizeSlider;
let feedSlider;
let killSlider;

let reactionColorPicker;
let backgroundColorPicker;
let patternSelect;
let gridPresetSelect;

let updateAccumulator = 0;

let lastSeedX = null;
let lastSeedY = null;

let frozen = false;
let savingImage = false;

let exportSize = 2000;

let randomFKActive = false;
let randomFKTime = 0;
let randomFeedAmount = 0.006;
let randomKillAmount = 0.004;

let wallHardMargin = 8;
let wallFadeMargin = 18;
let seedMargin = 24;

let savedModels = [];
let lastSavedModelName = null;

// ─── mic state ────────────────────────────────────────────────────────────────
let micActive = false;
let micAnalyser = null;
let micDataArray = null;
let micAudioCtx = null;
let micSource = null;
let micVolume = 0;
let micRawVolume = 0;
let micStatusEl = null;

// ─── controls ranges ──────────────────────────────────────────────────────────
let maxSpeedValue = 190;
let maxThicknessValue = 120;

// ─── fullscreen UI state ──────────────────────────────────────────────────────
let uiHidden = false;

const ACCENT = "#e1ff00";
const ACCENT_R = 225;
const ACCENT_G = 255;
const ACCENT_B = 0;

const GRID_PRESETS = [
  { label: "16:9  467×263", simW: 467, simH: 263 },
  { label: "9:16  263×467", simW: 263, simH: 467 },
  { label: "1:1   350×350", simW: 350, simH: 350 },
  { label: "4:3   404×303", simW: 404, simH: 303 },
  { label: "3:4   303×404", simW: 303, simH: 404 },
  { label: "2:1   495×248", simW: 495, simH: 248 },
];

let currentGridPreset = GRID_PRESETS[0];

function calcLayout() {
  let availW, availH;

  if (uiHidden) {
    availW = windowWidth;
    availH = windowHeight;
  } else {
    availW = windowWidth;
    availH = windowHeight - topMargin - bottomMargin;
  }

  simW = currentGridPreset.simW;
  simH = currentGridPreset.simH;

  let presetRatio = simW / simH;
  let availRatio = availW / availH;

  if (availRatio > presetRatio) {
    canvasH = availH;
    canvasW = floor(canvasH * presetRatio);
  } else {
    canvasW = availW;
    canvasH = floor(canvasW / presetRatio);
  }

  if (uiHidden) {
    canvasOffsetX = floor((windowWidth - canvasW) / 2);
    canvasOffsetY = floor((windowHeight - canvasH) / 2);
  } else {
    canvasOffsetX = floor((availW - canvasW) / 2);
    canvasOffsetY = topMargin + floor((availH - canvasH) / 2);
  }
}

function setup() {
  calcLayout();

  mainCanvas = createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(60);
  smooth();

  noiseSeed(floor(random(1000000)));

  createElement("style", `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }

    canvas { display: block; }

    input[type=range] {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
    }

    input[type=range]::-webkit-slider-runnable-track {
      height: 2px;
      background: #e1ff00;
      border-radius: 2px;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 13px;
      height: 13px;
      background: #e1ff00;
      border-radius: 50%;
      margin-top: -5.5px;
      border: none;
      cursor: pointer;
    }

    input[type=range]::-moz-range-track {
      height: 2px;
      background: #e1ff00;
      border-radius: 2px;
    }

    input[type=range]::-moz-range-thumb {
      width: 13px;
      height: 13px;
      background: #e1ff00;
      border-radius: 50%;
      border: none;
      cursor: pointer;
    }

    select {
      background: #000;
      color: #e1ff00;
      border: 1px solid #e1ff00;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }

    select option {
      background: #000;
      color: #e1ff00;
    }

    #mic-flag {
      position: fixed;
      font-family: monospace;
      font-size: 11px;
      color: #e1ff00;
      background: #000;
      border: 1px solid #e1ff00;
      padding: 2px 7px;
      border-radius: 2px;
      pointer-events: none;
      z-index: 999;
      transition: opacity 0.2s;
    }
  `);

  pg = createGraphics(simW, simH);
  pg.pixelDensity(1);
  pg.smooth();

  micStatusEl = createElement("div", "● MIC ON");
  micStatusEl.id("mic-flag");
  micStatusEl.style("display", "none");

  buildUI();
  resetSimulation();
}

function buildUI() {
  let displayVal = uiHidden ? "none" : "";

  if (speedSlider) {
    speedSlider.elt.style.display = displayVal;
    thicknessSlider.elt.style.display = displayVal;
    brushSizeSlider.elt.style.display = displayVal;
    feedSlider.elt.style.display = displayVal;
    killSlider.elt.style.display = displayVal;
    reactionColorPicker.elt.style.display = displayVal;
    backgroundColorPicker.elt.style.display = displayVal;
    patternSelect.elt.style.display = displayVal;
    gridPresetSelect.elt.style.display = displayVal;
  }

  if (uiHidden) {
    if (micStatusEl) {
      micStatusEl.style("left", "16px");
      micStatusEl.style("bottom", "16px");
    }

    if (!speedSlider) _createSliders();
    return;
  }

  let uiY = canvasOffsetY + canvasH;
  let col1X = 24;
  let sliderW = max(120, floor(windowWidth * 0.22));

  if (speedSlider) {
    speedSlider.position(col1X, uiY + 18);
    speedSlider.style("width", sliderW + "px");

    thicknessSlider.position(col1X, uiY + 44);
    thicknessSlider.style("width", sliderW + "px");

    brushSizeSlider.position(col1X, uiY + 70);
    brushSizeSlider.style("width", sliderW + "px");

    feedSlider.position(col1X, uiY + 96);
    feedSlider.style("width", sliderW + "px");

    killSlider.position(col1X, uiY + 122);
    killSlider.style("width", sliderW + "px");

    let pickerX = windowWidth - 110;
    reactionColorPicker.position(pickerX, uiY + 18);
    backgroundColorPicker.position(pickerX, uiY + 44);
    patternSelect.position(pickerX, uiY + 76);

    let midX = floor(windowWidth / 2) - 60;
    gridPresetSelect.position(midX, uiY + 32);

    if (micStatusEl) {
      micStatusEl.style("left", midX + "px");
      micStatusEl.style("bottom", (windowHeight - uiY - 92) + "px");
    }
  } else {
    _createSliders();
  }
}

function _createSliders() {
  let uiY = canvasOffsetY + canvasH;
  let col1X = 24;
  let sliderW = max(120, floor(windowWidth * 0.22));

  speedSlider = createSlider(1, maxSpeedValue, 70, 1);
  speedSlider.position(col1X, uiY + 18);
  speedSlider.style("width", sliderW + "px");

  thicknessSlider = createSlider(0, maxThicknessValue, 45, 1);
  thicknessSlider.position(col1X, uiY + 44);
  thicknessSlider.style("width", sliderW + "px");

  brushSizeSlider = createSlider(2, 30, 10, 1);
  brushSizeSlider.position(col1X, uiY + 70);
  brushSizeSlider.style("width", sliderW + "px");

  feedSlider = createSlider(0.010, 0.090, feed, 0.0001);
  feedSlider.position(col1X, uiY + 96);
  feedSlider.style("width", sliderW + "px");

  killSlider = createSlider(0.030, 0.080, k, 0.0001);
  killSlider.position(col1X, uiY + 122);
  killSlider.style("width", sliderW + "px");

  let pickerX = windowWidth - 110;

  reactionColorPicker = createColorPicker(ACCENT);
  reactionColorPicker.position(pickerX, uiY + 18);

  backgroundColorPicker = createColorPicker("#000000");
  backgroundColorPicker.position(pickerX, uiY + 44);

  patternSelect = createSelect();
  patternSelect.position(pickerX, uiY + 76);
  patternSelect.option("Worms");
  patternSelect.option("Coral");
  patternSelect.option("Spots");
  patternSelect.option("Maze");
  patternSelect.option("Cells");
  patternSelect.option("Mitosis");

  for (let m of savedModels) patternSelect.option(m.name);

  patternSelect.selected("Worms");
  patternSelect.changed(applyPatternPreset);

  let midX = floor(windowWidth / 2) - 60;

  gridPresetSelect = createSelect();
  gridPresetSelect.position(midX, uiY + 32);
  gridPresetSelect.style("width", "130px");

  for (let p of GRID_PRESETS) gridPresetSelect.option(p.label);

  gridPresetSelect.selected(currentGridPreset.label);
  gridPresetSelect.changed(applyGridPreset);

  if (micStatusEl) {
    micStatusEl.style("left", midX + "px");
    micStatusEl.style("bottom", (windowHeight - uiY - 92) + "px");
  }
}

function toggleUIFullscreen() {
  uiHidden = !uiHidden;
  calcLayout();
  resizeCanvas(windowWidth, windowHeight);
  buildUI();
}

async function toggleMic() {
  if (micActive) {
    stopMic();
  } else {
    await startMic();
  }
}

async function startMic() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micSource = micAudioCtx.createMediaStreamSource(stream);
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
    micSource.connect(micAnalyser);

    micActive = true;
    micVolume = 0;
    micRawVolume = 0;

    if (micStatusEl) micStatusEl.style("display", "block");

  } catch (e) {
    console.warn("Microfono non accessibile:", e);
  }
}

function stopMic() {
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }

  if (micAudioCtx) {
    micAudioCtx.close();
    micAudioCtx = null;
  }

  micAnalyser = null;
  micDataArray = null;
  micActive = false;
  micVolume = 0;

  if (micStatusEl) micStatusEl.style("display", "none");
}

function updateMicVolume() {
  if (!micActive || !micAnalyser) return;

  micAnalyser.getByteTimeDomainData(micDataArray);

  let sum = 0;

  for (let i = 0; i < micDataArray.length; i++) {
    let v = (micDataArray[i] - 128) / 128;
    sum += v * v;
  }

  micRawVolume = sqrt(sum / micDataArray.length);

  if (micRawVolume > micVolume) {
    micVolume = lerp(micVolume, micRawVolume, 0.55);
  } else {
    micVolume = lerp(micVolume, micRawVolume, 0.12);
  }

  micVolume = constrain(micVolume, 0, 1);
}

function applyMicToControls() {
  let normalizedVol = constrain(micVolume / 0.4, 0, 1);
  let curved = pow(normalizedVol, 0.6);

  let targetSpeed = map(curved, 0, 1, 1, maxSpeedValue);
  let targetThickness = map(curved, 0, 1, 0, maxThicknessValue);

  speedSlider.value(floor(targetSpeed));
  thicknessSlider.value(floor(targetThickness));
}

function applyGridPreset() {
  let label = gridPresetSelect.value();
  let found = GRID_PRESETS.find(p => p.label === label);

  if (!found) return;

  currentGridPreset = found;
  calcLayout();

  pg = createGraphics(simW, simH);
  pg.pixelDensity(1);
  pg.smooth();

  resetSimulation();
}

function windowResized() {
  calcLayout();
  resizeCanvas(windowWidth, windowHeight);
  buildUI();
}

function indexOf(x, y) {
  return x + y * simW;
}

function resetSimulation() {
  let total = simW * simH;

  a = new Float32Array(total);
  b = new Float32Array(total);
  paint = new Float32Array(total);

  nextA = new Float32Array(total);
  nextB = new Float32Array(total);
  nextPaint = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    a[i] = 1;
    b[i] = 0;
    paint[i] = 0;

    nextA[i] = 1;
    nextB[i] = 0;
    nextPaint[i] = 0;
  }

  updateAccumulator = 0;
  lastSeedX = null;
  lastSeedY = null;

  applyWallConstraints();
}

function applyPatternPreset() {
  let type = patternSelect.value();

  let savedMatch = savedModels.find(m => m.name === type);

  if (savedMatch) {
    feed = savedMatch.feed;
    k = savedMatch.kill;
    dA = savedMatch.dA;
    dB = savedMatch.dB;

    feedSlider.value(feed);
    killSlider.value(k);

    return;
  }

  if (type === "Worms")   { feed = 0.055;  k = 0.062;  dA = 1.0; dB = 0.50; }
  if (type === "Coral")   { feed = 0.0545; k = 0.061;  dA = 1.0; dB = 0.43; }
  if (type === "Spots")   { feed = 0.0367; k = 0.0649; dA = 1.0; dB = 0.46; }
  if (type === "Maze")    { feed = 0.029;  k = 0.057;  dA = 1.0; dB = 0.58; }
  if (type === "Cells")   { feed = 0.037;  k = 0.060;  dA = 1.0; dB = 0.44; }
  if (type === "Mitosis") { feed = 0.0367; k = 0.0649; dA = 1.0; dB = 0.40; }

  feedSlider.value(feed);
  killSlider.value(k);
}

function draw() {
  background(0);

  if (micActive) {
    updateMicVolume();
    applyMicToControls();
  }

  if (randomFKActive) {
    updateRandomFeedKill();
  } else {
    readSafeSliders();
  }

  if (!frozen && !savingImage) {
    let speed = speedSlider.value();
    let targetUpdates = map(speed, 1, maxSpeedValue, 0.08, 22.0);

    updateAccumulator += targetUpdates;

    let safetyLoops = 0;

    while (updateAccumulator >= 1 && safetyLoops < 32) {
      updateReaction();
      swapBuffers();
      updateAccumulator--;
      safetyLoops++;
    }

    applyWallConstraints();
  }

  renderPattern();

  if (!uiHidden) drawUI();
  else drawMinimalUI();
}

function updateRandomFeedKill() {
  randomFKTime += 0.018;

  let baseFeed = constrain(feedSlider.value(), 0.018, 0.074);
  let baseKill = constrain(killSlider.value(), 0.040, 0.076);

  let feedWave =
    sin(randomFKTime * 1.35) * randomFeedAmount +
    sin(randomFKTime * 0.47 + 2.1) * randomFeedAmount * 0.55 +
    (noise(randomFKTime * 0.75, 10) - 0.5) * randomFeedAmount * 1.2;

  let killWave =
    sin(randomFKTime * 1.12 + 1.4) * randomKillAmount +
    sin(randomFKTime * 0.62 + 4.2) * randomKillAmount * 0.65 +
    (noise(randomFKTime * 0.85, 40) - 0.5) * randomKillAmount * 1.2;

  let tf = constrain(baseFeed + feedWave, 0.018, 0.074);
  let tk = constrain(baseKill + killWave, 0.040, 0.076);

  let gap = tk - tf;

  if (gap > 0.050) tk = tf + 0.050;
  if (gap < -0.010) tk = tf - 0.010;

  tk = constrain(tk, 0.040, 0.076);

  feed = lerp(feed, tf, 0.12);
  k = lerp(k, tk, 0.12);

  dA = constrain(dA, 0.75, 1.25);
  dB = constrain(dB, 0.30, 0.82);
}

function readSafeSliders() {
  let sf = constrain(feedSlider.value(), 0.018, 0.074);
  let sk = constrain(killSlider.value(), 0.040, 0.076);

  let gap = sk - sf;

  if (gap > 0.050) sk = sf + 0.050;
  if (gap < -0.010) sk = sf - 0.010;

  sk = constrain(sk, 0.040, 0.076);

  feed = lerp(feed, sf, 0.18);
  k = lerp(k, sk, 0.18);

  dA = constrain(dA, 0.75, 1.25);
  dB = constrain(dB, 0.30, 0.82);
}

function mousePressed() {
  lastSeedX = null;
  lastSeedY = null;

  if (patternSelect.value() === "Spots") addSpotSeed();
  else tryAddSeedFromMouse();
}

function mouseDragged() {
  if (patternSelect.value() !== "Spots") tryAddSeedFromMouse();
}

function mouseReleased() {
  if (patternSelect.value() === "Spots") addSpotSeed();

  lastSeedX = null;
  lastSeedY = null;
}

function tryAddSeedFromMouse() {
  let patternLeft = canvasOffsetX;
  let patternRight = canvasOffsetX + canvasW;
  let patternTop = canvasOffsetY;
  let patternBottom = canvasOffsetY + canvasH;

  if (
    mouseX >= patternLeft &&
    mouseX < patternRight &&
    mouseY >= patternTop &&
    mouseY < patternBottom
  ) {
    let gx = floor(map(mouseX, patternLeft, patternRight, 0, simW));
    let gy = floor(map(mouseY, patternTop, patternBottom, 0, simH));

    gx = constrain(gx, seedMargin, simW - seedMargin - 1);
    gy = constrain(gy, seedMargin, simH - seedMargin - 1);

    if (lastSeedX === null) addSoftBrushAt(gx, gy);
    else drawBrushLine(lastSeedX, lastSeedY, gx, gy);

    lastSeedX = gx;
    lastSeedY = gy;
  }
}

function drawBrushLine(x1, y1, x2, y2) {
  let d = dist(x1, y1, x2, y2);
  let steps = max(1, floor(d * 2.5));

  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    addSoftBrushAt(lerp(x1, x2, t), lerp(y1, y2, t));
  }
}

function addSoftBrushAt(cx, cy) {
  let r = brushSizeSlider.value();

  for (let ox = -r; ox <= r; ox++) {
    for (let oy = -r; oy <= r; oy++) {
      let d = sqrt(ox * ox + oy * oy);

      if (d < r) {
        let px = floor(cx + ox);
        let py = floor(cy + oy);

        if (isInsideSafeArea(px, py)) {
          let falloff = 1.0 - d / r;
          let organicNoise = noise(px * 0.15, py * 0.15, frameCount * 0.02);
          let brushPower = map(r, 2, 30, 0.68, 1.0);
          let deposit = pow(falloff, 1.8) * 1.05 + organicNoise * 0.04;
          let amount = constrain(deposit * brushPower, 0, 1);

          let id = indexOf(px, py);

          b[id] = max(b[id], amount);
          a[id] = min(a[id], 1.0 - amount * 0.9);
          paint[id] = max(paint[id], pow(falloff, 2.2));
        }
      }
    }
  }
}

function addSpotSeed() {
  let patternLeft = canvasOffsetX;
  let patternRight = canvasOffsetX + canvasW;
  let patternTop = canvasOffsetY;
  let patternBottom = canvasOffsetY + canvasH;

  if (
    mouseX >= patternLeft &&
    mouseX < patternRight &&
    mouseY >= patternTop &&
    mouseY < patternBottom
  ) {
    let gx = floor(map(mouseX, patternLeft, patternRight, 0, simW));
    let gy = floor(map(mouseY, patternTop, patternBottom, 0, simH));

    gx = constrain(gx, seedMargin, simW - seedMargin - 1);
    gy = constrain(gy, seedMargin, simH - seedMargin - 1);

    let spotRadius = max(3, brushSizeSlider.value() * 0.45);

    for (let ox = -spotRadius; ox <= spotRadius; ox++) {
      for (let oy = -spotRadius; oy <= spotRadius; oy++) {
        let d = sqrt(ox * ox + oy * oy);

        if (d < spotRadius) {
          let px = floor(gx + ox);
          let py = floor(gy + oy);

          if (isInsideSafeArea(px, py)) {
            let falloff = 1.0 - d / spotRadius;
            let amount = pow(falloff, 1.6);

            let id = indexOf(px, py);

            b[id] = max(b[id], amount);
            a[id] = min(a[id], 1.0 - amount);
            paint[id] = max(paint[id], amount);
          }
        }
      }
    }
  }
}

function updateReaction() {
  for (let y = 1; y < simH - 1; y++) {
    let row = y * simW;

    for (let x = 1; x < simW - 1; x++) {
      let id = x + row;

      let av = a[id];
      let bv = b[id];

      let lapA =
        av * -1 +
        a[id - 1] * 0.2 +
        a[id + 1] * 0.2 +
        a[id - simW] * 0.2 +
        a[id + simW] * 0.2 +
        a[id - simW - 1] * 0.05 +
        a[id - simW + 1] * 0.05 +
        a[id + simW - 1] * 0.05 +
        a[id + simW + 1] * 0.05;

      let lapB =
        bv * -1 +
        b[id - 1] * 0.2 +
        b[id + 1] * 0.2 +
        b[id - simW] * 0.2 +
        b[id + simW] * 0.2 +
        b[id - simW - 1] * 0.05 +
        b[id - simW + 1] * 0.05 +
        b[id + simW - 1] * 0.05 +
        b[id + simW + 1] * 0.05;

      let reaction = av * bv * bv;

      nextA[id] = constrain(av + dA * lapA - reaction + feed * (1 - av), 0, 1);
      nextB[id] = constrain(bv + dB * lapB + reaction - (k + feed) * bv, 0, 1);
      nextPaint[id] = paint[id] * 0.72;
    }
  }
}

function swapBuffers() {
  let t;

  t = a;
  a = nextA;
  nextA = t;

  t = b;
  b = nextB;
  nextB = t;

  t = paint;
  paint = nextPaint;
  nextPaint = t;
}

function isInsideSafeArea(x, y) {
  return (
    x >= seedMargin &&
    x < simW - seedMargin &&
    y >= seedMargin &&
    y < simH - seedMargin
  );
}

function applyWallConstraints() {
  applyWallConstraintsToBuffer(a, b, paint);
  applyWallConstraintsToBuffer(nextA, nextB, nextPaint);
}

function applyWallConstraintsToBuffer(arrA, arrB, arrP) {
  for (let i = 0; i < wallHardMargin; i++) {
    clearHorizontal(arrA, arrB, arrP, i);
    clearHorizontal(arrA, arrB, arrP, simH - 1 - i);
    clearVertical(arrA, arrB, arrP, i);
    clearVertical(arrA, arrB, arrP, simW - 1 - i);
  }

  for (let i = wallHardMargin; i < wallFadeMargin; i++) {
    let t = smoothstep(
      0,
      1,
      constrain(map(i, wallHardMargin, wallFadeMargin, 0, 1), 0, 1)
    );

    fadeHorizontal(arrA, arrB, arrP, i, t);
    fadeHorizontal(arrA, arrB, arrP, simH - 1 - i, t);
    fadeVertical(arrA, arrB, arrP, i, t);
    fadeVertical(arrA, arrB, arrP, simW - 1 - i, t);
  }
}

function clearHorizontal(arrA, arrB, arrP, y) {
  let row = y * simW;

  for (let x = 0; x < simW; x++) {
    let id = x + row;

    arrA[id] = 1;
    arrB[id] = 0;
    arrP[id] = 0;
  }
}

function clearVertical(arrA, arrB, arrP, x) {
  for (let y = 0; y < simH; y++) {
    let id = x + y * simW;

    arrA[id] = 1;
    arrB[id] = 0;
    arrP[id] = 0;
  }
}

function fadeHorizontal(arrA, arrB, arrP, y, t) {
  let row = y * simW;

  for (let x = 0; x < simW; x++) {
    let id = x + row;

    arrB[id] *= t;
    arrA[id] = lerp(1, arrA[id], t);
    arrP[id] *= t;
  }
}

function fadeVertical(arrA, arrB, arrP, x, t) {
  for (let y = 0; y < simH; y++) {
    let id = x + y * simW;

    arrB[id] *= t;
    arrA[id] = lerp(1, arrA[id], t);
    arrP[id] *= t;
  }
}

function renderPattern() {
  pg.loadPixels();

  let thickness = thicknessSlider.value();

  let threshold = map(thickness, 0, maxThicknessValue, 0.62, 0.012);
  let softness = map(thickness, 0, maxThicknessValue, 0.0015, 0.105);

  let reactionCol = color(reactionColorPicker.value());
  let bgCol = color(backgroundColorPicker.value());

  let bgR = red(bgCol);
  let bgG = green(bgCol);
  let bgB = blue(bgCol);

  let rR = red(reactionCol);
  let rG = green(reactionCol);
  let rB = blue(reactionCol);

  for (let y = 0; y < simH; y++) {
    let row = y * simW;

    for (let x = 0; x < simW; x++) {
      let id = x + row;
      let val = a[id] - b[id];

      let ink = pow(
        1.0 - smoothstep(threshold, threshold + softness, val),
        1.32
      );

      if (frozen) ink = max(ink, paint[id]);

      let pix = id * 4;

      pg.pixels[pix] = lerp(bgR, rR, ink);
      pg.pixels[pix + 1] = lerp(bgG, rG, ink);
      pg.pixels[pix + 2] = lerp(bgB, rB, ink);
      pg.pixels[pix + 3] = 255;
    }
  }

  pg.updatePixels();

  image(pg, canvasOffsetX, canvasOffsetY, canvasW, canvasH);
}

function saveHighResImage() {
  if (savingImage) return;

  savingImage = true;

  let thickness = thicknessSlider.value();

  let threshold = map(thickness, 0, maxThicknessValue, 0.62, 0.012);
  let softness = map(thickness, 0, maxThicknessValue, 0.002, 0.13);

  let reactionCol = color(reactionColorPicker.value());
  let bgCol = color(backgroundColorPicker.value());

  let bgR = red(bgCol);
  let bgG = green(bgCol);
  let bgB = blue(bgCol);

  let rR = red(reactionCol);
  let rG = green(reactionCol);
  let rB = blue(reactionCol);

  let ratio = simW / simH;

  let expW = ratio >= 1 ? exportSize : floor(exportSize * ratio);
  let expH = ratio >= 1 ? floor(exportSize / ratio) : exportSize;

  let exportCanvas = document.createElement("canvas");
  exportCanvas.width = expW;
  exportCanvas.height = expH;

  let ctx = exportCanvas.getContext("2d");

  let imgData = ctx.createImageData(expW, expH);
  let pixels = imgData.data;

  for (let py = 0; py < expH; py++) {
    let fy = (py / (expH - 1)) * (simH - 1);
    let y0 = floor(fy);
    let y1 = min(y0 + 1, simH - 1);
    let ty = fy - y0;

    for (let px = 0; px < expW; px++) {
      let fx = (px / (expW - 1)) * (simW - 1);
      let x0 = floor(fx);
      let x1 = min(x0 + 1, simW - 1);
      let tx = fx - x0;

      let aVal =
        a[indexOf(x0, y0)] * (1 - tx) * (1 - ty) +
        a[indexOf(x1, y0)] * tx * (1 - ty) +
        a[indexOf(x0, y1)] * (1 - tx) * ty +
        a[indexOf(x1, y1)] * tx * ty;

      let bVal =
        b[indexOf(x0, y0)] * (1 - tx) * (1 - ty) +
        b[indexOf(x1, y0)] * tx * (1 - ty) +
        b[indexOf(x0, y1)] * (1 - tx) * ty +
        b[indexOf(x1, y1)] * tx * ty;

      let ink = pow(
        1.0 - smoothstep(threshold, threshold + softness, aVal - bVal),
        1.32
      );

      let i = (py * expW + px) * 4;

      pixels[i] = lerp(bgR, rR, ink);
      pixels[i + 1] = lerp(bgG, rG, ink);
      pixels[i + 2] = lerp(bgB, rB, ink);
      pixels[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  let smoothCanvas = document.createElement("canvas");
  smoothCanvas.width = expW;
  smoothCanvas.height = expH;

  let sCtx = smoothCanvas.getContext("2d");
  sCtx.filter = "blur(0.8px)";
  sCtx.drawImage(exportCanvas, 0, 0);
  sCtx.filter = "none";

  smoothCanvas.toBlob(function(blob) {
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");

    link.href = url;
    link.download = "turing-pattern-" + expW + "x" + expH + ".png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    savingImage = false;
  }, "image/png");
}

function saveModel() {
  let modelName = "Model " + (savedModels.length + 1);

  savedModels.push({
    name: modelName,
    feed: feedSlider.value(),
    kill: killSlider.value(),
    dA: dA,
    dB: dB
  });

  patternSelect.option(modelName);
  patternSelect.selected(modelName);

  lastSavedModelName = modelName;
}

function drawUI() {
  fill(0);
  noStroke();

  rect(0, 0, width, canvasOffsetY);
  rect(
    0,
    canvasOffsetY + canvasH,
    width,
    windowHeight - (canvasOffsetY + canvasH)
  );

  stroke(ACCENT_R, ACCENT_G, ACCENT_B);
  strokeWeight(1);

  line(0, canvasOffsetY, width, canvasOffsetY);
  line(0, canvasOffsetY + canvasH, width, canvasOffsetY + canvasH);

  noStroke();

  fill(ACCENT_R, ACCENT_G, ACCENT_B);
  textSize(12);
  textAlign(LEFT);

  text("Drag on canvas to seed pattern", 20, 18);
  text(frozen ? "[ F ] Freeze: ON" : "[ F ] Freeze: OFF", 20, 34);
  text(randomFKActive ? "[ R ] Random FK: ON" : "[ R ] Random FK: OFF", 20, 50);
  text("[ 1 ] Clear", 20, 66);

  textAlign(RIGHT);

  text(savingImage ? "Saving PNG..." : "[ S ] Save PNG", width - 20, 18);
  text(lastSavedModelName ? "Saved: " + lastSavedModelName : "[ G ] Save model", width - 20, 34);
  text(micActive ? "[ M ] Mic: ON" : "[ M ] Mic: OFF", width - 20, 50);
  text("[ U ] Fullscreen canvas", width - 20, 66);

  let uiY = canvasOffsetY + canvasH;
  let col1X = 24;
  let labelX = col1X + max(120, floor(windowWidth * 0.22)) + 10;

  textAlign(LEFT);
  textSize(11);
  textStyle(NORMAL);

  text("Velocity", labelX, uiY + 22);
  text("Thickness", labelX, uiY + 48);
  text("Brush", labelX, uiY + 74);
  text("Feed", labelX, uiY + 100);
  text("Kill", labelX, uiY + 126);

  let midX = floor(windowWidth / 2) - 60;

  textAlign(LEFT);
  text("Grid preset", midX, uiY + 22);

  if (micActive) {
    let barW = 130;
    let barH = 4;
    let barX = midX;
    let barY = uiY + 78;

    noFill();
    stroke(ACCENT_R, ACCENT_G, ACCENT_B, 120);
    strokeWeight(1);
    rect(barX, barY, barW, barH, 2);

    noStroke();
    fill(ACCENT_R, ACCENT_G, ACCENT_B);

    let fillW = floor(map(micVolume, 0, 0.4, 0, barW));

    rect(barX, barY, constrain(fillW, 2, barW), barH, 2);
  }

  textAlign(RIGHT);
  text("Ink", width - 20, uiY + 27);
  text("Bg", width - 20, uiY + 53);
}

function drawMinimalUI() {
  fill(ACCENT_R, ACCENT_G, ACCENT_B, 160);
  noStroke();

  textSize(11);
  textAlign(RIGHT);

  text("[ U ] Exit fullscreen", width - 16, height - 16);

  if (micActive) {
    textAlign(LEFT);
    text("● MIC", 16, height - 16);

    let barW = 80;
    let barH = 3;

    noFill();
    stroke(ACCENT_R, ACCENT_G, ACCENT_B, 120);
    strokeWeight(1);
    rect(56, height - 21, barW, barH, 1);

    noStroke();
    fill(ACCENT_R, ACCENT_G, ACCENT_B, 200);
    rect(
      56,
      height - 21,
      constrain(map(micVolume, 0, 0.4, 0, barW), 1, barW),
      barH,
      1
    );

    noStroke();
  }
}

function smoothstep(edge0, edge1, x) {
  let t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function keyPressed() {
  if (key === "1") {
    resetSimulation();
    return false;
  }

  if (key === "s" || key === "S") {
    saveHighResImage();
    return false;
  }

  if (key === "f" || key === "F") {
    frozen = !frozen;
    return false;
  }

  if (key === "g" || key === "G") {
    saveModel();
    return false;
  }

  if (key === "r" || key === "R") {
    randomFKActive = !randomFKActive;
    return false;
  }

  if (key === "m" || key === "M") {
    toggleMic();
    return false;
  }

  if (key === "u" || key === "U") {
    toggleUIFullscreen();
    return false;
  }
}