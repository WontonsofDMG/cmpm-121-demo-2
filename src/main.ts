import "./style.css";

const APP_NAME = "Hello";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="myCanvas" width="256" height="256"></canvas>
  <div>
    <button id="thinButton">Thin</button>
    <button id="thickButton">Thick</button>
  </div>
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

const canvas = document.querySelector<HTMLCanvasElement>("#myCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
let lines: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;
let currentThickness = 2; // Default to thin
let toolPreview: ToolPreview | null = null;

document.querySelector<HTMLButtonElement>("#thinButton")!.addEventListener("click", () => {
  currentThickness = 2;
  document.querySelector("#thinButton")!.classList.add("selectedTool");
  document.querySelector("#thickButton")!.classList.remove("selectedTool");
});

document.querySelector<HTMLButtonElement>("#thickButton")!.addEventListener("click", () => {
  currentThickness = 5;
  document.querySelector("#thickButton")!.classList.add("selectedTool");
  document.querySelector("#thinButton")!.classList.remove("selectedTool");
});

canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;
  currentLine = new MarkerLine(x, y, currentThickness);
  lines.push(currentLine);
  toolPreview = null; // Hide tool preview while drawing
  canvas.dispatchEvent(new Event("drawing-changed")); // Ensure the canvas is updated immediately
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentLine = null;
});

canvas.addEventListener("mousemove", (event) => {
  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;
  if (drawing && currentLine) {
    currentLine.drag(x, y);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else {
    if (!toolPreview || toolPreview.thickness !== currentThickness) {
      toolPreview = new ToolPreview(x, y, currentThickness);
    } else {
      toolPreview.move(x, y);
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