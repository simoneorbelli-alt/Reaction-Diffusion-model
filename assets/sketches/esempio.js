// Dimensioni della griglia di simulazione (ottimale per i calcoli)
const GRID_W = 200;
const GRID_H = 200;

// Dimensioni del Canvas visivo
const CANVAS_W = 600;
const CANVAS_H = 600;

// Spazio extra in basso dedicato ai controlli (altezza totale canvas = 680)
const CONTROL_PANEL_H = 80; 

// Array monodimensionali piatti (molto più veloci delle matrici [][] in JS)
let gridA, gridB, nextA, nextB;

// Coefficienti di diffusione
const dA = 1.0;
const dB = 0.5;

let feedSlider, killSlider;

function setup() {
  // Il canvas include uno spazio in basso per i controlli
  createCanvas(CANVAS_W, CANVAS_H + CONTROL_PANEL_H);
  pixelDensity(1);

  // Inizializzazione array piatti (Dimensione: 200 * 200 = 40000 elementi)
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

  // Posizionamento degli slider nativi nell'area grigia in basso
  feedSlider = createSlider(0.01, 0.09, 0.055, 0.001);
  feedSlider.position(90, CANVAS_H + 15);
  feedSlider.style('width', '150px');

  killSlider = createSlider(0.04, 0.07, 0.062, 0.001);
  killSlider.position(90, CANVAS_H + 45);
  killSlider.style('width', '150px');
}

function draw() {
  // Ottieni i valori dai cursori
  let f = feedSlider.value();
  let k = killSlider.value();

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

  // OTTIMIZZAZIONE: Eseguiamo 8 passi di simulazione fisica per ogni frame di disegno.
  // Questo fa muovere i pattern molto più velocemente.
  for (let step = 0; step < 8; step++) {
    
    // Saltiamo i bordi esterni per semplicità computazionale
    for (let y = 1; y < GRID_H - 1; y++) {
      let row = y * GRID_W;
      let prevRow = (y - 1) * GRID_W;
      let nextRow = (y + 1) * GRID_W;

      for (let x = 1; x < GRID_W - 1; x++) {
        let i = x + row;

        let a = gridA[i];
        let b = gridB[i];

        // Laplaciano espanso in linea (evita la chiamata a funzioni esterne nel loop critico)
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

        // Vincoli di stabilità
        if (nA < 0) nA = 0; else if (nA > 1) nA = 1;
        if (nB < 0) nB = 0; else if (nB > 1) nB = 1;

        nextA[i] = nA;
        nextB[i] = nB;
      }
    }

    // Swap veloce dei puntatori degli array
    let tempA = gridA; gridA = nextA; nextA = tempA;
    let tempB = gridB; gridB = nextB; nextB = tempB;
  }

  // DISEGNO FLUIDO (Upscaling sulla matrice dei pixel del Canvas)
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

      let c = Math.floor((a - b) * 255);
      if (c < 0) c = 0; else if (c > 255) c = 255;

      let pix = (cx + cRow) * 4;
      pixels[pix + 0] = c;         // R
      pixels[pix + 1] = c;         // G
      pixels[pix + 2] = 255 - c;   // B
      pixels[pix + 3] = 255;       // A
    }
  }
  updatePixels();

  // DISEGNO INTERFACCIA (ZONA DI CONTROLLO IN BASSO)
  // Sfondo scuro separato per la UI
  fill(30);
  noStroke();
  rect(0, CANVAS_H, CANVAS_W, CONTROL_PANEL_H);

  // Testo Bianco ad alta leggibilità (Nativo nel Canvas)
  fill(255);
  textSize(14);
  textAlign(LEFT, CENTER);
  textFont('sans-serif');

  // Stringhe e valori affiancati
  text("Feed (f):", 15, CANVAS_H + 25);
  text(f.toFixed(3), 255, CANVAS_H + 25);

  text("Kill (k):", 15, CANVAS_H + 55);
  text(k.toFixed(3), 255, CANVAS_H + 55);
}