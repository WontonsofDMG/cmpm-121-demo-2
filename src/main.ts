import "./style.css";

const APP_NAME = "Hello";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="myCanvas" width="256" height="256"></canvas>
  <button id="clearButton">Clear</button>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#myCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
let lines: { x: number, y: number }[][] = [];
let currentLine: { x: number, y: number }[] = [];

canvas.addEventListener("mousedown", () => {
  drawing = true;
  currentLine = [];
  lines.push(currentLine);
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
  ctx.beginPath();
});

canvas.addEventListener("mousemove", (event) => {
  if (!drawing) return;
  const x = event.clientX - canvas.offsetLeft;
  const y = event.clientY - canvas.offsetTop;
  currentLine.push({ x, y });
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";
  lines.forEach(line => {
    ctx.beginPath();
    line.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  });
});

document.querySelector<HTMLButtonElement>("#clearButton")!.addEventListener("click", () => {
  lines = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});