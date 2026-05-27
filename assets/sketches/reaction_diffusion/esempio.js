// Dimensioni della griglia di simulazione (ottimale per i calcoli)
const GRID_W = 200;
const GRID_H = 200;

// Dimensioni del Canvas visivo (Ridimensionato a 400px)
const CANVAS_W = 400;
const CANVAS_H = 400;

// Spazio extra in basso dedicato ai controlli (altezza totale canvas = 480)
const CONTROL_PANEL_H = 80; 

// Array monodimensionali piatti
let gridA, gridB, nextA, nextB;

// Coefficienti di diffusione
const dA = 1.0;
const dB = 0.5;

let feedSlider, killSlider;
let pickerColorBg, pickerColorRx; // Color picker nativi

function setup() {
  // Il canvas include lo spazio in basso per i controlli
  createCanvas(CANVAS_W, CANVAS_H + CONTROL_PANEL_H);
  pixelDensity(1);

  // Inizializzazione array piatti
  let numCells = GRID_W * GRID_H;
  gridA = new Float32Array(numCells);
  gridB = new Float32Array(numCells);
  nextA = new Float32Array(numCells);
  nextB = new Float32Array(numCells);

  // Stato iniziale: tutto saturo di A
  gridA.fill(1.0);
  gridB.fill(0.0);

  // Seme iniziale di sostanza B al centro della griglia
  let cx = Math.floor(GRID_W / 2);
  let cy = Math.floor(GRID_H / 2);
  let r = 10;
  for (let y = cy - r; y < cy + r; y++) {
    for (let x = cx - r; x < cx + r; x++) {
      let index = x + y * GRID_W;
      gridB[index] = 1.0;
    }
  }

  // Posizionamento degli slider (compatti)
  feedSlider = createSlider(0.01, 0.09, 0.055, 0.001);
  feedSlider.position(65, CANVAS_H + 15);
  feedSlider.style('width', '90px');

  killSlider = createSlider(0.04, 0.07, 0.062, 0.001);
  killSlider.position(65, CANVAS_H + 45);
  killSlider.style('width', '90px');

  // MODIFICATO: COLOR PICKER 1 - Sfondo Nero (#000000)
  pickerColorBg = createColorPicker('#000000');
  pickerColorBg.position(290, CANVAS_H + 12);
  pickerColorBg.size(45, 22); 

  // MODIFICATO: COLOR PICKER 2 - Reazione Bianca (#ffffff)
  pickerColorRx = createColorPicker('#ffffff');
  pickerColorRx.position(290, CANVAS_H + 42);
  pickerColorRx.size(45, 22);
}

function draw() {
  let f = feedSlider.value();
  let k = killSlider.value();

  // Estrai i colori selezionati dai picker in tempo reale
  let colA = pickerColorBg.color();
  let colB = pickerColorRx.color();

  let rA = red(colA), gA = green(colA), bA = blue(colA);
  let rB = red(colB), gB = green(colB), bB = blue(colB);

  // Interazione Mouse: inietta B se premuto
  if (mouseIsPressed && mouseY < CANVAS_H) {
    let mX = Math.floor((mouseX / CANVAS_W) * GRID_W);
    let mY = Math.floor((mouseY / CANVAS_H) * GRID_H);
    
    if (mX > 2 && mX < GRID_W - 2 && mY > 2 && mY < GRID_H - 2) {
      for (let j = -3; j <= 3; j++) {
        for (let i = -3; i <= 3; i++) {
          let index = (mX + i) + (mY + j) * GRID_W;
          gridB[index] = 1.0;
        }
      }
    }
  }

  // Simulazione fisica (8 passi per frame)
  for (let step = 0; step < 8; step++) {
    for (let y = 1; y < GRID_H - 1; y++) {
      let row = y * GRID_W;
      for (let x = 1; x < GRID_W - 1; x++) {
        let i = x + row;

        let a = gridA[i];
        let b = gridB[i];

        let lapA = a * -1.0 +
          gridA[i - 1] * 0.2 + gridA[i + 1] * 0.2 + gridA[i - GRID_W] * 0.2 + gridA[i + GRID_W] * 0.2 +
          gridA[i - 1 - GRID_W] * 0.05 + gridA[i + 1 - GRID_W] * 0.05 +
          gridA[i - 1 + GRID_W] * 0.05 + gridA[i + 1 + GRID_W] * 0.05;

        let lapB = b * -1.0 +
          gridB[i - 1] * 0.2 + gridB[i + 1] * 0.2 + gridB[i - GRID_W] * 0.2 + gridB[i + GRID_W] * 0.2 +
          gridB[i - 1 - GRID_W] * 0.05 + gridB[i + 1 - GRID_W] * 0.05 +
          gridB[i - 1 + GRID_W] * 0.05 + gridB[i + 1 + GRID_W] * 0.05;

        let abb = a * b * b;
        let nA = a + (dA * lapA) - abb + (f * (1.0 - a));
        let nB = b + (dB * lapB) + abb - ((k + f) * b);

        if (nA < 0) nA = 0; else if (nA > 1) nA = 1;
        if (nB < 0) nB = 0; else if (nB > 1) nB = 1;

        nextA[i] = nA;
        nextB[i] = nB;
      }
    }
    let tempA = gridA; gridA = nextA; nextA = tempA;
    let tempB = gridB; gridB = nextB; nextB = tempB;
  }

  // RENDERING CON COLORI SCELTI DALL'UTENTE
  loadPixels();
  let scaleX = CANVAS_W / GRID_W;
  let scaleY = CANVAS_H / GRID_H;

  for (let cy = 0; cy < CANVAS_H; cy++) {
    let gy = Math.floor(cy / scaleY);
    let gRow = gy * GRID_W;
    let cRow = cy * CANVAS_W;

    for (let cx = 0; cx < CANVAS_W; cx++) {
      let gx = Math.floor(cx / scaleX);
      let gIndex = gx + gRow;

      let a = gridA[gIndex];
      let b = gridB[gIndex];

      let factor = a - b;
      if (factor < 0) factor = 0; else if (factor > 1) factor = 1;

      // Interpolazione lineare basata sulle scelte dei selettori colore
      let r = Math.floor(rB + (rA - rB) * factor);
      let g = Math.floor(gB + (gA - gB) * factor);
      let bl = Math.floor(bB + (bA - bB) * factor);

      let pix = (cx + cRow) * 4;
      pixels[pix + 0] = r;
      pixels[pix + 1] = g;
      pixels[pix + 2] = bl;
      pixels[pix + 3] = 255;
    }
  }
  updatePixels();

  // INTERFACCIA UTENTE (ZONA DI CONTROLLO)
  // Sfondo del pannello leggermente più chiaro del nero di simulazione per stacco visivo
  fill(25); 
  noStroke();
  rect(0, CANVAS_H, CANVAS_W, CONTROL_PANEL_H);

  fill(240); // Testo quasi bianco per massima leggibilità
  textSize(12);
  textAlign(LEFT, CENTER);
  textFont('sans-serif');

  // Sliders info
  text("Feed:", 10, CANVAS_H + 25);
  text(f.toFixed(3), 165, CANVAS_H + 25);

  text("Kill:", 10, CANVAS_H + 55);
  text(k.toFixed(3), 165, CANVAS_H + 55);

  // Etichette per i selettori di colore (allineate a destra)
  text("Colore Sfondo:", 200, CANVAS_H + 25);
  text("Colore Reaz.:", 200, CANVAS_H + 55);
}