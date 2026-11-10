const fileInput = document.getElementById("img");

/**@type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

/**@type {HTMLImageElement} */
let img;

/** @type {undefined|[number, number, number, number]} */
let focusedBox;

const selectedBoxes = [];
const selectedStarts = [];
const res = {};

// --- init ---
function init() {
  fileInput.addEventListener("change", async () => {
    if (fileInput.files[0]) {
      img = await loadImage(fileInput.files[0]);
      fileInput.style.display = "none";
      initCanvas();
      res.size = [img.naturalWidth, img.naturalHeight];
      res.answers = [];
    }
  });
  canvas.addEventListener("mousemove", function(e) {
    if (!img) return;

    const bounds = canvas.getBoundingClientRect();
    const mouseX = Math.floor(e.clientX - bounds.left);
    const mouseY = Math.floor(e.clientY - bounds.top);

    renderImage();
    focusedBox = findBox(mouseX, mouseY);

    renderCanvas(false);
  });
  canvas.addEventListener("click", () => {
    if (focusedBox) {
      if (selectedStarts.includes(focusedBox[0]+"-"+focusedBox[1]))
        return;

      if (!res.point) {
        res.point = [[focusedBox[0], focusedBox[1]], [focusedBox[2], focusedBox[3]]];
        alert("点数欄として登録しました");
        selectedBoxes.push([focusedBox, "point"]);
      } else {
        res.answers.push([
          prompt("解答欄名"),
          [focusedBox[0], focusedBox[1]], [focusedBox[2], focusedBox[3]],
          Number(prompt("配点"))
        ]);
        selectedBoxes.push([focusedBox, res.answers.length - 1]);
      }

      selectedStarts.push(focusedBox[0]+"-"+focusedBox[1]);
      renderCanvas();
    }
  });
  document.getElementById("export").addEventListener("click", () => exportFile());
}
function initCanvas() {
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;

  renderCanvas();
}
function loadImage(img) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(img);
    const tag = new Image();
    tag.addEventListener("load", () => {
      resolve(tag);

      URL.revokeObjectURL(url);
    });
    tag.src = url;
  })
}
function renderImage() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
}
function renderCanvas(renderingImage=true) {
  if (renderingImage)
    renderImage();

  if (focusedBox) {
    ctx.beginPath();

    ctx.fillStyle = "rgba(200, 200, 0, 0.4)";
    ctx.rect(...focusedBox);
    ctx.fill();
  }

  
  ctx.fillStyle = "rgba(0, 50, 0, 0.8)";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '24px sans-serif';

  ctx.beginPath();
  for (const b of selectedBoxes) {
    ctx.rect(...b[0]);
    const id = b[1];
    const textPos = [b[0][0] + b[0][2] / 2, b[0][1] + b[0][3] / 2]
    if (id == "point") {
      ctx.fillText("点数", ...textPos);
    } else {
      const box = res.answers[id];
      ctx.fillText(box[0]+" - "+box[3]+"点", ...textPos);
    }
  }

  ctx.fillStyle = "rgba(0, 200, 0, 0.4)";
  ctx.fill();
}

function findBox(x, y) {
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  function isFinished(x, y) {
    if (isOut(x, y)) return true;

    const i = (y * w + x) * 4;
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]

    // 輝度
    const l = (2 * r + 4 * g + b) / 7;

    return l < 100;
  }
  function isOut(x, y) {
    return x <= 0 || y <= 0 || x >= w || y >= h;
  }

  let top = y;
  while (!isFinished(x, top)) top --;
  if (isOut(x, top)) return;

  let bottom = y;
  while (!isFinished(x, bottom)) bottom ++;
  if (isOut(x, bottom)) return;

  let left = x;
  while (!isFinished(left, y)) left --;
  if (isOut(left, y)) return;

  let right = x;
  while (!isFinished(right, y)) right ++;
  if (isOut(right, y)) return;

  const newX = [left + 2, right - 2];
  const newY = [top  + 2, bottom - 2];

  // 一次審査↑↑　　↓↓二次審査

  x = newX[0];
  y = newY[0];

  top = y;
  while (!isFinished(x, top)) top --;

  bottom = y;
  while (!isFinished(x, bottom)) bottom ++;

  left = x;
  while (!isFinished(left, y)) left --;

  right = x;
  while (!isFinished(right, y)) right ++;

  const res1 = [top, bottom, left, right];

  // 一次審査↑↑　　↓↓二次審査
  x = newX[1];
  y = newY[1];

  top = y;
  while (!isFinished(x, top)) top --;

  bottom = y;
  while (!isFinished(x, bottom)) bottom ++;

  left = x;
  while (!isFinished(left, y)) left --;

  right = x;
  while (!isFinished(right, y)) right ++;

  const res2 = [top, bottom, left, right];

  [top, bottom, left, right] = res1.map((e, i) => i % 2 == 0 ? Math.min(e, res2[i]) : Math.max(e, res2[i]));

  const width  = right - left;
  const height = bottom - top;


  return [left, top, width, height];
}
function exportFile() {
  const normalH = Math.min(...res.answers.map(e => e[2][1]));
  res.normalH = normalH;

  const blob = new Blob([JSON.stringify(res)], {type: "application/json"});

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "採点用ファイル.scoring.score-bird.json";

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

window.addEventListener("load", () => init());