import "./style.css";

const APP_NAME = "Dino Draw";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="myCanvas" width="256" height="256"></canvas>
  <div>
    <button id="thinButton">Thin</button>
    <button id="thickButton">Thick</button>
  </div>
  <div id="stickerButtons"></div>
  <button id="customStickerButton">Add Custom Sticker</button>
  <button id="clearButton">Clear</button>
  <button id="undoButton">Undo</button>
  <button id="redoButton">Redo</button>
  <button id="exportButton">Export</button>
  <div>
    <label for="hueSlider">Hue:</label>
    <input type="range" id="hueSlider" min="0" max="360" value="0" style="background: black;">
  </div>
`;

class DinoDrawer {
    private points: { x: number, y: number }[] = [];
    private thickness: number;
    private hue: number;

    constructor(initialX: number, initialY: number, thickness: number, hue: number) {
        this.points.push({ x: initialX, y: initialY });
        this.thickness = thickness;
        this.hue = hue;
    }

    drag(x: number, y: number) {
        this.points.push({ x, y });
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.lineWidth = this.thickness;
        ctx.strokeStyle = this.hue === 0 ? "black" : `hsl(${this.hue}, 100%, 50%)`;
        ctx.stroke();
    }
}

class ToolPreview {
    private x: number;
    private y: number;
    public thickness: number;
    private hue: number;

    constructor(x: number, y: number, thickness: number, hue: number) {
        this.x = x;
        this.y = y;
        this.thickness = thickness;
        this.hue = hue;
    }

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
        ctx.fillStyle = this.hue === 0 ? "black" : `hsl(${this.hue}, 100%, 50%)`;
        ctx.fill();
    }
}

class StickerPreview {
    private x: number;
    private y: number;
    private sticker: string;
    private hue: number;

    constructor(x: number, y: number, sticker: string, hue: number) {
        this.x = x;
        this.y = y;
        this.sticker = sticker;
        this.hue = hue;
    }

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.font = "40px Arial"; // Adjusted size for better usability
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.hue === 0 ? "black" : `hsl(${this.hue}, 100%, 50%)`;
        ctx.fillText(this.sticker, this.x, this.y);
    }

    public getSticker(): string {
        return this.sticker;
    }
}

class DinoSticker {
    private initialX: number;
    private initialY: number;
    private x: number;
    private y: number;
    private rotation: number;
    private sticker: string;
    private hue: number;

    constructor(x: number, y: number, sticker: string, hue: number) {
        this.initialX = x;
        this.initialY = y;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.sticker = sticker;
        this.hue = hue;
    }

    drag(x: number, y: number) {
        this.x = x;
        this.y = y;
        const dx = x - this.initialX;
        const dy = y - this.initialY;
        this.rotation = Math.atan2(dy, dx);
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.initialX, this.initialY);
        ctx.rotate(this.rotation);
        ctx.font = "40px Arial"; // Adjusted size for better usability
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = this.hue === 0 ? "black" : `hsl(${this.hue}, 100%, 50%)`;
        ctx.fillText(this.sticker, 0, 0);
        ctx.restore();
    }
}

const canvas = document.querySelector<HTMLCanvasElement>("#myCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
let lines: (DinoDrawer | DinoSticker)[] = [];
let redoStack: (DinoDrawer | DinoSticker)[] = [];
let currentLine: DinoDrawer | null = null;
let currentSticker: DinoSticker | null = null;
let currentThickness = 1; // Adjusted thin marker thickness
let toolPreview: ToolPreview | StickerPreview | null = null;
let currentStickerType: string | null = null;
let initialX = 0;
let initialY = 0;
let currentHue = 0; // Default hue
const stickers = ["🦖", "🦕", "🌟", "🔥", "🌈"]; // Updated example emoji selection

const renderStickers = () => {
  const stickerButtonsDiv = document.querySelector<HTMLDivElement>("#stickerButtons")!;
  stickerButtonsDiv.innerHTML = stickers.map((sticker, index) => `
    <button class="stickerButton" data-index="${index}">${sticker}</button>
  `).join("");
  document.querySelectorAll<HTMLButtonElement>(".stickerButton").forEach(button => {
    button.addEventListener("click", () => {
      currentStickerType = stickers[parseInt(button.dataset.index!)];
      document.querySelectorAll(".stickerButton").forEach(btn => btn.classList.remove("selectedTool"));
      button.classList.add("selectedTool");
      document.querySelector("#thinButton")!.classList.remove("selectedTool");
      document.querySelector("#thickButton")!.classList.remove("selectedTool");
      canvas.dispatchEvent(new Event("tool-moved"));
    });
  });
};

renderStickers();

document.querySelector<HTMLButtonElement>("#customStickerButton")!.addEventListener("click", () => {
  const newSticker = prompt("Enter your custom sticker:", "⭐");
  if (newSticker) {
    stickers.push(newSticker);
    renderStickers();
  }
});

document.querySelector<HTMLButtonElement>("#thinButton")!.addEventListener("click", () => {
  currentThickness = 1; // Adjusted thin marker thickness
  currentStickerType = null;
  document.querySelector("#thinButton")!.classList.add("selectedTool");
  document.querySelector("#thickButton")!.classList.remove("selectedTool");
  document.querySelectorAll(".stickerButton").forEach(btn => btn.classList.remove("selectedTool"));
});

document.querySelector<HTMLButtonElement>("#thickButton")!.addEventListener("click", () => {
  currentThickness = 5;
  currentStickerType = null;
  document.querySelector("#thickButton")!.classList.add("selectedTool");
  document.querySelector("#thinButton")!.classList.remove("selectedTool");
  document.querySelectorAll(".stickerButton").forEach(btn => btn.classList.remove("selectedTool"));
});

document.querySelector<HTMLInputElement>("#hueSlider")!.addEventListener("input", (event) => {
  currentHue = parseInt((event.target as HTMLInputElement).value);
  const hueSlider = event.target as HTMLInputElement;
  if (currentHue === 0) {
    hueSlider.style.background = "black";
  } else {
    hueSlider.style.background = `hsl(${currentHue}, 100%, 50%)`;
  }
  canvas.dispatchEvent(new Event("tool-moved"));
});

canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  initialX = event.clientX - canvas.offsetLeft;
  initialY = event.clientY - canvas.offsetTop;
  if (currentStickerType) {
    currentSticker = new DinoSticker(initialX, initialY, currentStickerType, currentHue);
    lines.push(currentSticker);
    toolPreview = null; // Hide tool preview while drawing
  } else {
    currentLine = new DinoDrawer(initialX, initialY, currentThickness, currentHue);
    lines.push(currentLine);
    toolPreview = null; // Hide tool preview while drawing
  }
  canvas.dispatchEvent(new Event("drawing-changed")); // Ensure the canvas is updated immediately
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentLine = null;
  currentSticker = null;
});

canvas.addEventListener("mousemove", (event) => {
  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;
  if (drawing && currentLine) {
    currentLine.drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else if (drawing && currentSticker) {
    (currentSticker as DinoSticker).drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    if (currentStickerType) {
      if (!toolPreview || !(toolPreview instanceof StickerPreview) || (toolPreview as StickerPreview).getSticker() !== currentStickerType) {
        toolPreview = new StickerPreview(x, y, currentStickerType, currentHue);
      } else {
        toolPreview.move(x, y);
      }
    } else {
      if (!toolPreview || !(toolPreview instanceof ToolPreview) || (toolPreview as ToolPreview).thickness !== currentThickness) {
        toolPreview = new ToolPreview(x, y, currentThickness, currentHue);
      } else {
        toolPreview.move(x, y);
      }
    }
    canvas.dispatchEvent(new Event("tool-moved"));
  }
});

canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  lines.forEach(line => line.display(ctx));
});

canvas.addEventListener("tool-moved", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  lines.forEach(line => line.display(ctx));
  if (toolPreview && !drawing) {
    toolPreview.draw(ctx);
  }
});

document.querySelector<HTMLButtonElement>("#clearButton")!.addEventListener("click", () => {
  lines = [];
  redoStack = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.querySelector<HTMLButtonElement>("#undoButton")!.addEventListener("click", () => {
  if (lines.length > 0) {
    const lastLine = lines.pop();
    redoStack.push(lastLine!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

document.querySelector<HTMLButtonElement>("#redoButton")!.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const lastLine = redoStack.pop();
    lines.push(lastLine!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

document.querySelector<HTMLButtonElement>("#exportButton")!.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.scale(4, 4); // Scale the context to 4x

  // Draw all lines and stickers on the export canvas
  lines.forEach(line => line.display(exportCtx));

  // Trigger download
  const link = document.createElement("a");
  link.download = "drawing.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});