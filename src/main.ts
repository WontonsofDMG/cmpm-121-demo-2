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

const canvas = document.querySelector<HTMLCanvasElement>("#myCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
let lines: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;
let currentThickness = 2; // Default to thin

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
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentLine = null;
});

canvas.addEventListener("mousemove", (event) => {
  if (!drawing || !currentLine) return;
  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;
  currentLine.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";
  lines.forEach(line => line.display(ctx));
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