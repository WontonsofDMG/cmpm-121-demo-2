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
`;

class MarkerLine {
    private points: { x: number, y: number }[] = [];
    private thickness: number;

    constructor(initialX: number, initialY: number, thickness: number) {
        this.points.push({ x: initialX, y: initialY });
        this.thickness = thickness;
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
        ctx.stroke();
    }
}

class ToolPreview {
    private x: number;
    private y: number;
    public thickness: number;

    constructor(x: number, y: number, thickness: number) {
        this.x = x;
        this.y = y;
        this.thickness = thickness;
    }

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();
    }
}

class StickerPreview {
    private x: number;
    private y: number;
    private sticker: string;

    constructor(x: number, y: number, sticker: string) {
        this.x = x;
        this.y = y;
        this.sticker = sticker;
    }

    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "black";
        ctx.fillText(this.sticker, this.x, this.y);
    }

    public getSticker(): string {
        return this.sticker;
    }
}

class TransformableSticker {
    private initialX: number;
    private initialY: number;
    private x: number;
    private y: number;
    private rotation: number;
    private sticker: string;

    constructor(x: number, y: number, sticker: string) {
        this.initialX = x;
        this.initialY = y;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.sticker = sticker;
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
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "black";
        ctx.fillText(this.sticker, 0, 0);
        ctx.restore();
    }
}

const canvas = document.querySelector<HTMLCanvasElement>("#myCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
let lines: (MarkerLine | TransformableSticker)[] = [];
let redoStack: (MarkerLine | TransformableSticker)[] = [];
let currentLine: MarkerLine | null = null;
let currentSticker: TransformableSticker | null = null;
let currentThickness = 2; // Default to thin
let toolPreview: ToolPreview | StickerPreview | null = null;
let currentStickerType: string | null = null;
let initialX = 0;
let initialY = 0;
const stickers = ["🦖", "🦕", "❤️"];

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
  currentThickness = 2;
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
  document.querySelectorAll<HTMLButtonElement>(".stickerButton").forEach((btn: HTMLButtonElement) => btn.classList.remove("selectedTool"));
});

canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  initialX = event.clientX - canvas.offsetLeft;
  initialY = event.clientY - canvas.offsetTop;
  if (currentStickerType) {
    currentSticker = new TransformableSticker(initialX, initialY, currentStickerType);
    lines.push(currentSticker);
    toolPreview = null; // Hide tool preview while drawing
  } else {
    currentLine = new MarkerLine(initialX, initialY, currentThickness);
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
    (currentSticker as TransformableSticker).drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    if (currentStickerType) {
      if (!toolPreview || !(toolPreview instanceof StickerPreview) || (toolPreview as StickerPreview).getSticker() !== currentStickerType) {
        toolPreview = new StickerPreview(x, y, currentStickerType);
      } else {
        toolPreview.move(x, y);
      }
    } else {
      if (!toolPreview || !(toolPreview instanceof ToolPreview) || (toolPreview as ToolPreview).thickness !== currentThickness) {
        toolPreview = new ToolPreview(x, y, currentThickness);
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
  ctx.strokeStyle = "black";
  lines.forEach(line => line.display(ctx));
});

canvas.addEventListener("tool-moved", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";
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