// HIGH RES REACTION DIFFUSION TOOL — RESPONSIVE + 2000PX PNG EXPORT + SAVE MODEL
// UX/UI Redesign: Dark Laboratory Hybrid System

let mainCanvas;

let a, b, paint;
let nextA, nextB, nextPaint;
let pg;

let simW, simH;
let canvasW, canvasH;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

// Margins adapted for the new floating HUD
let topMargin = 0; 
let bottomMargin = 0;

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

// UI DOM Containers
let leftPanel, rightPanel, topBar;

function calcLayout() {
  let availW = windowWidth;
  let availH = windowHeight;

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

  canvasOffsetX = floor((availW - canvasW) / 2);
  canvasOffsetY = floor((availH - canvasH) / 2);
}

function setup() {
  calcLayout();

  mainCanvas = createCanvas(windowWidth, windowHeight);
  mainCanvas.style('display', 'block');
  mainCanvas.style('position', 'absolute');
  mainCanvas.style('top', '0');
  mainCanvas.style('left', '0');
  mainCanvas.style('z-index', '0');
  
  pixelDensity(1);
  frameRate(60);
  smooth();

  noiseSeed(floor(random(1000000)));

  injectCSS();

  pg = createGraphics(simW, simH);
  pg.pixelDensity(1);
  pg.smooth();

  micStatusEl = createElement("div", "AUDIO MON: ACTV");
  micStatusEl.id("mic-flag");
  micStatusEl.style("display", "none");

  buildUI();
  resetSimulation();
}

function injectCSS() {
  createElement("style", `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #050505; color: #fff; font-family: 'Inter', sans-serif; user-select: none; }

    /* Dark Laboratory Panels */
    .hud-panel {
      position: absolute;
      background: rgba(10, 10, 12, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 20px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    #left-panel { top: 24px; left: 24px; width: 280px; }
    #right-panel { top: 24px; right: 24px; width: 240px; }
    
    .panel-hidden { opacity: 0 !important; pointer-events: none !important; transform: scale(0.98); }

    /* Typography */
    .control-group { display: flex; flex-direction: column; gap: 6px; }
    .label-row { display: flex; justify-content: space-between; align-items: center; }
    .ui-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
    .ui-value { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #e1ff00; }

    /* Precision Sliders */
    input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; margin: 6px 0; cursor: crosshair; }
    input[type=range]:focus { outline: none; }
    input[type=range]::-webkit-slider-runnable-track { height: 2px; background: rgba(255,255,255,0.1); border-radius: 2px; }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; height: 12px; width: 4px; background: #e1ff00; border-radius: 1px; margin-top: -5px; box-shadow: 0 0 8px rgba(225,255,0,0.5); transition: transform 0.1s;
    }
    input[type=range]:active::-webkit-slider-thumb { transform: scaleY(1.5); }
    input[type=range]::-moz-range-track { height: 2px; background: rgba(255,255,255,0.1); border-radius: 2px; }
    input[type=range]::-moz-range-thumb { height: 12px; width: 4px; background: #e1ff00; border-radius: 1px; border: none; }

    /* Selectors & Pickers */
    select, input[type=color] {
      width: 100%; background: rgba(0,0,0,0.4); color: #e1ff00; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer; outline: none; appearance: none; transition: border-color 0.2s;
    }
    select:hover, input[type=color]:hover { border-color: rgba(225,255,0,0.5); }
    input[type=color] { height: 32px; padding: 2px; cursor: crosshair; }
    input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type=color]::-webkit-color-swatch { border: none; border-radius: 2px; }

    /* Headers */
    .panel-header { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; color: #fff; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
    .status-dot { width: 6px; height: 6px; background: #e1ff00; border-radius: 50%; box-shadow: 0 0 6px #e1ff00; display: inline-block; }

    #mic-flag {
      position: absolute; bottom: 24px; left: 24px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #e1ff00; background: rgba(10,10,12,0.8); border: 1px solid rgba(225,255,0,0.3); padding: 6px 12px; border-radius: 4px; pointer-events: none; z-index: 999;
    }
  `);
}

function buildUI() {
  if (!leftPanel) {
    leftPanel = createDiv().id('left-panel').class('hud-panel');
    let headerL = createDiv('<span class="status-dot"></span> REACTION SETTINGS').class('panel-header').parent(leftPanel);
    
    rightPanel = createDiv().id('right-panel').class('hud-panel');
    let headerR = createDiv('CANVAS REGULATIONS').class('panel-header').parent(rightPanel);

    _createSliders();
  }

  if (uiHidden) {
    leftPanel.addClass('panel-hidden');
    rightPanel.addClass('panel-hidden');
  } else {
    leftPanel.removeClass('panel-hidden');
    rightPanel.removeClass('panel-hidden');
  }
}

function createControlGroup(label, parentNode, sliderEl) {
  let group = createDiv().class('control-group').parent(parentNode);
  let row = createDiv().class('label-row').parent(group);
  createDiv(label).class('ui-label').parent(row);
  
  let valDisplay = createDiv().class('ui-value').parent(row);
  sliderEl.parent(group);
  
  sliderEl.input(() => {
    let v = sliderEl.value();
    valDisplay.html(Number.isInteger(v) ? v : Number(v).toFixed(4));
  });
  
  let initV = sliderEl.value();
  valDisplay.html(Number.isInteger(initV) ? initV : Number(initV).toFixed(4));
}

function _createSliders() {
  feedSlider = createSlider(0.010, 0.090, feed, 0.0001);
  createControlGroup('Feed Rate', leftPanel, feedSlider);

  killSlider = createSlider(0.030, 0.080, k, 0.0001);
  createControlGroup('Kill Rate', leftPanel, killSlider);

  createDiv().style('height', '1px').style('background', 'rgba(255,255,255,0.08)').style('margin', '4px 0').parent(leftPanel);

  thicknessSlider = createSlider(0, maxThicknessValue, 45, 1);
  createControlGroup('Thickness', leftPanel, thicknessSlider);

  speedSlider = createSlider(1, maxSpeedValue, 70, 1);
  createControlGroup('Velocity', leftPanel, speedSlider);

  brushSizeSlider = createSlider(2, 30, 10, 1);
  createControlGroup('Brush Size', leftPanel, brushSizeSlider);

  let g1 = createDiv().class('control-group').parent(rightPanel);
  createDiv('Canvas Preset').class('ui-label').parent(g1);
  gridPresetSelect = createSelect().parent(g1);
  for (let p of GRID_PRESETS) gridPresetSelect.option(p.label);
  gridPresetSelect.selected(currentGridPreset.label);
  gridPresetSelect.changed(applyGridPreset);

  let g2 = createDiv().class('control-group').parent(rightPanel);
  createDiv('State Pattern').class('ui-label').parent(g2);
  patternSelect = createSelect().parent(g2);
  patternSelect.option("Worms");
  patternSelect.option("Coral");
  patternSelect.option("Spots");
  patternSelect.option("Maze");
  patternSelect.option("Cells");
  patternSelect.option("Mitosis");
  for (let m of savedModels) patternSelect.option(m.name);
  patternSelect.selected("Worms");
  patternSelect.changed(applyPatternPreset);

  createDiv().style('height', '1px').style('background', 'rgba(255,255,255,0.08)').style('margin', '4px 0').parent(rightPanel);

  let g3 = createDiv().class('control-group').parent(rightPanel);
  createDiv('Reaction Phosphor').class('ui-label').parent(g3);
  reactionColorPicker = createColorPicker(ACCENT).parent(g3);

  let g4 = createDiv().class('control-group').parent(rightPanel);
  createDiv('Void Material').class('ui-label').parent(g4);
  backgroundColorPicker = createColorPicker("#000000").parent(g4);
}

function toggleUIFullscreen() {
  uiHidden = !uiHidden;
  calcLayout();
  resizeCanvas(windowWidth, windowHeight);
  buildUI();
}

async function toggleMic() {
  if (micActive) stopMic();
  else await startMic();
}

async function startMic() {
  try {
    let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // FORZA SBLOCCO CONTESTO: Risolve i blocchi di sicurezza dei browser moderni
    if (micAudioCtx.state === 'suspended') {
      await micAudioCtx.resume();
    }

    micSource = micAudioCtx.createMediaStreamSource(stream);
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 64; 
    micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
    micSource.connect(micAnalyser);

    micActive = true;
    micVolume = 0;
    micRawVolume = 0;
  } catch (e) {
    console.warn("Microfono non accessibile:", e);
  }
}

function stopMic() {
  if (micSource) { micSource.disconnect(); micSource = null; }
  if (micAudioCtx) { micAudioCtx.close(); micAudioCtx = null; }
  micAnalyser = null;
  micDataArray = null;
  micActive = false;
  micVolume = 0;
}

function updateMicVolume() {
  if (!micActive || !micAnalyser) return;
  
  micAnalyser.getByteFrequencyData(micDataArray);
  let total = 0;
  for (let i = 0; i < micDataArray.length; i++) {
    total += micDataArray[i];
  }
  let average = total / micDataArray.length;
  micRawVolume = average / 255; 
  
  // Smooth filter ultra-veloce per risposte istantanee avanti/indietro
  micVolume = micRawVolume > micVolume ? lerp(micVolume, micRawVolume, 0.6) : lerp(micVolume, micRawVolume, 0.2);
  micVolume = constrain(micVolume, 0, 1);
}

function applyMicToControls() {
  let normalizedVol = constrain(micVolume / 0.35, 0, 1);
  let curved = pow(normalizedVol, 0.7);
  let targetSpeed = map(curved, 0, 1, 1, maxSpeedValue);
  let targetThickness = map(curved, 0, 1, 0, maxThicknessValue);

  speedSlider.value(floor(targetSpeed));
  thicknessSlider.value(floor(targetThickness));
  
  speedSlider.elt.dispatchEvent(new Event('input'));
  thicknessSlider.elt.dispatchEvent(new Event('input'));
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

function indexOf(x, y) { return x + y * simW; }

function resetSimulation() {
  let total = simW * simH;
  a = new Float32Array(total);
  b = new Float32Array(total);
  paint = new Float32Array(total);
  nextA = new Float32Array(total);
  nextB = new Float32Array(total);
  nextPaint = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    a[i] = 1; b[i] = 0; paint[i] = 0;
    nextA[i] = 1; nextB[i] = 0; nextPaint[i] = 0;
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
    feed = savedMatch.feed; k = savedMatch.kill; dA = savedMatch.dA; dB = savedMatch.dB;
    feedSlider.value(feed); killSlider.value(k);
  } else {
    if (type === "Worms")   { feed = 0.055;  k = 0.062;  dA = 1.0; dB = 0.50; }
    if (type === "Coral")   { feed = 0.0545; k = 0.061;  dA = 1.0; dB = 0.43; }
    if (type === "Spots")   { feed = 0.0367; k = 0.0649; dA = 1.0; dB = 0.46; }
    if (type === "Maze")    { feed = 0.029;  k = 0.057;  dA = 1.0; dB = 0.58; }
    if (type === "Cells")   { feed = 0.037;  k = 0.060;  dA = 1.0; dB = 0.44; }
    if (type === "Mitosis") { feed = 0.0367; k = 0.0649; dA = 1.0; dB = 0.40; }
    feedSlider.value(feed); killSlider.value(k);
  }
  feedSlider.elt.dispatchEvent(new Event('input'));
  killSlider.elt.dispatchEvent(new Event('input'));
}

function draw() {
  clear(); 

  if (micActive) { updateMicVolume(); applyMicToControls(); }
  
  if (randomFKActive) updateRandomFeedKill();
  else readSafeSliders();

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

  renderPattern()

  if (!uiHidden) drawGhostHUD();
  else drawMinimalHUD();
}

function updateRandomFeedKill() {
  randomFKTime += 0.018;
  let baseFeed = constrain(feedSlider.value(), 0.018, 0.074);
  let baseKill = constrain(killSlider.value(), 0.040, 0.076);

  let feedWave = sin(randomFKTime * 1.35) * randomFeedAmount + sin(randomFKTime * 0.47 + 2.1) * randomFeedAmount * 0.55 + (noise(randomFKTime * 0.75, 10) - 0.5) * randomFeedAmount * 1.2;
  let killWave = sin(randomFKTime * 1.12 + 1.4) * randomKillAmount + sin(randomFKTime * 0.62 + 4.2) * randomKillAmount * 0.65 + (noise(randomFKTime * 0.85, 40) - 0.5) * randomKillAmount * 1.2;

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
  if (mouseX < 320 && mouseY < leftPanel.elt.offsetHeight + 40 && !uiHidden) return;
  if (mouseX > windowWidth - 280 && mouseY < rightPanel.elt.offsetHeight + 40 && !uiHidden) return;

  lastSeedX = null;
  lastSeedY = null;
  if (patternSelect.value() === "Spots") addSpotSeed();
  else tryAddSeedFromMouse();
}

function mouseDragged() {
  if (mouseX < 320 && mouseY < leftPanel.elt.offsetHeight + 40 && !uiHidden) return;
  if (mouseX > windowWidth - 280 && mouseY < rightPanel.elt.offsetHeight + 40 && !uiHidden) return;
  
  if (patternSelect.value() !== "Spots") tryAddSeedFromMouse();
}

function mouseReleased() {
  if (mouseX < 320 && mouseY < leftPanel.elt.offsetHeight + 40 && !uiHidden) return;
  if (mouseX > windowWidth - 280 && mouseY < rightPanel.elt.offsetHeight + 40 && !uiHidden) return;

  if (patternSelect.value() === "Spots") addSpotSeed();
  lastSeedX = null;
  lastSeedY = null;
}

function tryAddSeedFromMouse() {
  let patternLeft = canvasOffsetX;
  let patternRight = canvasOffsetX + canvasW;
  let patternTop = canvasOffsetY;
  let patternBottom = canvasOffsetY + canvasH;

  if (mouseX >= patternLeft && mouseX < patternRight && mouseY >= patternTop && mouseY < patternBottom) {
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

  if (mouseX >= patternLeft && mouseX < patternRight && mouseY >= patternTop && mouseY < patternBottom) {
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

      let lapA = av * -1 + a[id - 1] * 0.2 + a[id + 1] * 0.2 + a[id - simW] * 0.2 + a[id + simW] * 0.2 + a[id - simW - 1] * 0.05 + a[id - simW + 1] * 0.05 + a[id + simW - 1] * 0.05 + a[id + simW + 1] * 0.05;
      let lapB = bv * -1 + b[id - 1] * 0.2 + b[id + 1] * 0.2 + b[id - simW] * 0.2 + b[id + simW] * 0.2 + b[id - simW - 1] * 0.05 + b[id - simW + 1] * 0.05 + b[id + simW - 1] * 0.05 + b[id + simW + 1] * 0.05;

      let reaction = av * bv * bv;
      nextA[id] = constrain(av + dA * lapA - reaction + feed * (1 - av), 0, 1);
      nextB[id] = constrain(bv + dB * lapB + reaction - (k + feed) * bv, 0, 1);
      nextPaint[id] = paint[id] * 0.72;
    }
  }
}

function swapBuffers() { let t; t = a; a = nextA; nextA = t; t = b; b = nextB; nextB = t; t = paint; paint = nextPaint; nextPaint = t; }

function isInsideSafeArea(x, y) { return (x >= seedMargin && x < simW - seedMargin && y >= seedMargin && y < simH - seedMargin); }

function applyWallConstraints() { applyWallConstraintsToBuffer(a, b, paint); applyWallConstraintsToBuffer(nextA, nextB, nextPaint); }

function applyWallConstraintsToBuffer(arrA, arrB, arrP) {
  for (let i = 0; i < wallHardMargin; i++) {
    clearHorizontal(arrA, arrB, arrP, i); clearHorizontal(arrA, arrB, arrP, simH - 1 - i);
    clearVertical(arrA, arrB, arrP, i); clearVertical(arrA, arrB, arrP, simW - 1 - i);
  }
  for (let i = wallHardMargin; i < wallFadeMargin; i++) {
    let t = smoothstep(0, 1, constrain(map(i, wallHardMargin, wallFadeMargin, 0, 1), 0, 1));
    fadeHorizontal(arrA, arrB, arrP, i, t); fadeHorizontal(arrA, arrB, arrP, simH - 1 - i, t);
    fadeVertical(arrA, arrB, arrP, i, t); fadeVertical(arrA, arrB, arrP, simW - 1 - i, t);
  }
}

function clearHorizontal(arrA, arrB, arrP, y) { let row = y * simW; for (let x = 0; x < simW; x++) { let id = x + row; arrA[id] = 1; arrB[id] = 0; arrP[id] = 0; } }
function clearVertical(arrA, arrB, arrP, x) { for (let y = 0; y < simH; y++) { let id = x + y * simW; arrA[id] = 1; arrB[id] = 0; arrP[id] = 0; } }
function fadeHorizontal(arrA, arrB, arrP, y, t) { let row = y * simW; for (let x = 0; x < simW; x++) { let id = x + row; arrB[id] *= t; arrA[id] = lerp(1, arrA[id], t); arrP[id] *= t; } }
function fadeVertical(arrA, arrB, arrP, x, t) { for (let y = 0; y < simH; y++) { let id = x + y * simW; arrB[id] *= t; arrA[id] = lerp(1, arrA[id], t); arrP[id] *= t; } }

function renderPattern() {
  pg.loadPixels();
  let thickness = thicknessSlider.value();
  let threshold = map(thickness, 0, maxThicknessValue, 0.62, 0.012);
  let softness = map(thickness, 0, maxThicknessValue, 0.0015, 0.105);

  let reactionCol = color(reactionColorPicker.value());
  let bgCol = color(backgroundColorPicker.value());

  let bgR = red(bgCol); let bgG = green(bgCol); let bgB = blue(bgCol);
  let rR = red(reactionCol); let rG = green(reactionCol); let rB = blue(reactionCol);

  for (let y = 0; y < simH; y++) {
    let row = y * simW;
    for (let x = 0; x < simW; x++) {
      let id = x + row;
      let val = a[id] - b[id];
      let ink = pow(1.0 - smoothstep(threshold, threshold + softness, val), 1.32);
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

  let bgR = red(bgCol); let bgG = green(bgCol); let bgB = blue(bgCol);
  let rR = red(reactionCol); let rG = green(reactionCol); let rB = blue(reactionCol);

  let ratio = simW / simH;
  let expW = ratio >= 1 ? exportSize : floor(exportSize * ratio);
  let expH = ratio >= 1 ? floor(exportSize / ratio) : exportSize;

  let exportCanvas = document.createElement("canvas");
  exportCanvas.width = expW; exportCanvas.height = expH;
  let ctx = exportCanvas.getContext("2d");
  let imgData = ctx.createImageData(expW, expH);
  let pixels = imgData.data;

  for (let py = 0; py < expH; py++) {
    let fy = (py / (expH - 1)) * (simH - 1);
    let y0 = floor(fy); let y1 = min(y0 + 1, simH - 1); let ty = fy - y0;
    for (let px = 0; px < expW; px++) {
      let fx = (px / (expW - 1)) * (simW - 1);
      let x0 = floor(fx); let x1 = min(x0 + 1, simW - 1); let tx = fx - x0;

      let aVal = a[indexOf(x0, y0)] * (1 - tx) * (1 - ty) + a[indexOf(x1, y0)] * tx * (1 - ty) + a[indexOf(x0, y1)] * (1 - tx) * ty + a[indexOf(x1, y1)] * tx * ty;
      let bVal = b[indexOf(x0, y0)] * (1 - tx) * (1 - ty) + b[indexOf(x1, y0)] * tx * (1 - ty) + b[indexOf(x0, y1)] * (1 - tx) * ty + b[indexOf(x1, y1)] * tx * ty;

      let ink = pow(1.0 - smoothstep(threshold, threshold + softness, aVal - bVal), 1.32);
      let i = (py * expW + px) * 4;

      pixels[i] = lerp(bgR, rR, ink); pixels[i + 1] = lerp(bgG, rG, ink); pixels[i + 2] = lerp(bgB, rB, ink); pixels[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  let smoothCanvas = document.createElement("canvas");
  smoothCanvas.width = expW; smoothCanvas.height = expH;
  let sCtx = smoothCanvas.getContext("2d");
  sCtx.filter = "blur(0.8px)"; sCtx.drawImage(exportCanvas, 0, 0); sCtx.filter = "none";

  smoothCanvas.toBlob(function(blob) {
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url; link.download = "rd-core-" + expW + "x" + expH + ".png";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url); savingImage = false;
  }, "image/png");
}

function saveModel() {
  let modelName = "SYS.MOD." + (savedModels.length + 1);
  savedModels.push({ name: modelName, feed: feedSlider.value(), kill: killSlider.value(), dA: dA, dB: dB });
  patternSelect.option(modelName); patternSelect.selected(modelName);
  lastSavedModelName = modelName;
}

function drawGhostHUD() {
  const fluo = color(225, 255, 0);
  const bgBadge = color(10, 10, 12, 200); 
  
  textFont('JetBrains Mono');
  textSize(10);
  
  let padY = height - 24;
  let lineH = 22; 
  let badgeW = 160;
  let badgeH = 18;
  let horizontalGap = 12;

  // --- GRUPPO SINISTRO ---
  let leftLabels = [
    frozen ? "F | FREEZE: ACTV" : "F | FREEZE: OFF",
    randomFKActive ? "R | RANDOM MODE: LFO" : "R | RANDOM MODE: OFF",
    "1 | PURGE CANVAS",
    "DRAG | GENERATE SEED"
  ];

  textAlign(LEFT, CENTER);
  for (let i = 0; i < leftLabels.length; i++) {
    let yPos = padY - (i * lineH) - 10;
    stroke(fluo);
    strokeWeight(1);
    fill(bgBadge);
    rect(20, yPos, badgeW, badgeH, 2);
    noStroke();
    fill(fluo);
    text(leftLabels[i], 28, yPos + badgeH/2 + 1);
  }

  // --- GRUPPO DESTRO ---
  let rightLabels = [
    savingImage ? "ENCODING HI-RES..." : "S | EXPORT PNG",
    lastSavedModelName ? "G | STORED: " + lastSavedModelName : "G | STORE STATE",
    micActive ? "M | AUDIO: ACTV" : "M | AUDIO: OFF",
    "U | FULLSCREEN MODE"
  ];

  let rightBlockX = 20 + badgeW + horizontalGap; 

  for (let i = 0; i < rightLabels.length; i++) {
    let yPos = padY - (i * lineH) - 10;
    stroke(fluo);
    strokeWeight(1);
    fill(bgBadge);
    rect(rightBlockX, yPos, badgeW, badgeH, 2);
    noStroke();
    fill(fluo);
    text(rightLabels[i], rightBlockX + 8, yPos + badgeH/2 + 1);

    // ─── RENDERING SOLA BARRA MIC SENZA INVOLUCRO O SFONDO ───
    if (i === 2 && micActive) {
      let barX = rightBlockX + badgeW + 12; // Posizionata a destra del rettangolo di M
      let maxBarW = 90;                     // Lunghezza massima della linea vuota
      let barY = yPos + (badgeH / 2);       // Allineata al centro esatto dell'altezza del badge
      
      // Calcolo dinamico della larghezza basato sul volume effettivo
      let fillW = map(micVolume, 0, 0.35, 0, maxBarW);
      fillW = constrain(fillW, 0, maxBarW);
      
      // Disegna solo lo spettro audio attivo (linea orizzontale fluo che si muove)
      stroke(fluo);
      strokeWeight(4); // Spessore solido e visibile della linea audio
      line(barX, barY, barX + fillW, barY);
      
      // Ripristina lo spessore standard per evitare artefatti negli altri elementi del codice
      strokeWeight(1);
    }
  }
}

function drawMinimalHUD() {
  const fluo = color(225, 255, 0);
  const bgBadge = color(10, 10, 12, 200);
  
  stroke(fluo);
  strokeWeight(1);
  fill(bgBadge);
  rect(width - 100, height - 42, 80, 20, 2);
  
  noStroke();
  fill(fluo);
  textFont('JetBrains Mono');
  textSize(10);
  textAlign(CENTER, CENTER);
  text("U | EXIT", width - 60, height - 32);

  if (micActive) {
    stroke(fluo);
    fill(bgBadge);
    rect(20, height - 42, 60, 20, 2);
    noStroke();
    fill(fluo);
    text("MIC ON", 50, height - 32);
  }
}

function smoothstep(edge0, edge1, x) {
  let t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function keyPressed() {
  if (key === "1") { resetSimulation(); return false; }
  if (key === "s" || key === "S") { saveHighResImage(); return false; }
  if (key === "f" || key === "F") { frozen = !frozen; return false; }
  if (key === "g" || key === "G") { saveModel(); return false; }
  if (key === "r" || key === "R") { randomFKActive = !randomFKActive; return false; }
  if (key === "m" || key === "M") { toggleMic(); return false; }
  if (key === "u" || key === "U") { toggleUIFullscreen(); return false; }
}