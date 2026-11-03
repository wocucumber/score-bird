const marks = Object.freeze({
  "o": ["11", "12", "13", "14", "15"].map(e => "images/"+e+".png").map(generateImage),
  "x": ["21", "22", "23", "24", "25"].map(e => "images/"+e+".png").map(generateImage),
  "h": ["31"].map(e => "images/"+e+".png").map(generateImage)
});

function generateImage(url) {
  const image = new Image();
  image.src = url;
  return image;
}
function point2mark(point, max) {
  if (point == max)
    return "o";
  else if (point == 0)
    return "x";
  else if (point > 0 && point < max)
    return "h";

  return "blank";
}

class Cells {
  constructor (cells) {
    /**@type {{answers: [string, [number, number], [number, number], number][], size: [number, number], point?: [[number, number], [number, number]], normalH: number}} */
    this.cells = cells;
    /**@type {{name:string, position:[number,number], size:[number,number], point:number}[]} */
    this.answers = [];
    for (const ans of this.cells.answers) {
      this.answers.push({
        name: ans[0],
        position: ans[1],
        size: ans[2],
        point: ans[3]
      });
    }
  }
  /**
   * 
   * @param {Sheet} sheet 
   */
  convertFor(sheet) {
    if (!sheet.isReady) throw new Error("isn't ready.");

    const size = this.cells.size;
    const img = sheet.image;
    const w = img.naturalWidth / size[0];
    const h = img.naturalHeight / size[1];
    const convertTable = [w, h];

    const newCells = structuredClone(this.cells);

    for (const item of newCells.answers) {
      item[1] = this.convertDouble(item[1], convertTable);
      item[2] = this.convertDouble(item[2], convertTable);
    }
    newCells.size = this.convertDouble(newCells.size, convertTable);
    newCells.normalH = this.convertSingle(newCells.normalH, convertTable, 1);

    if (newCells.point) {
      newCells.point[0] = this.convertDouble(newCells.point[0], convertTable);
      newCells.point[1] = this.convertDouble(newCells.point[1], convertTable);
    }

    return new Cells(newCells);
  }
  expandAnswers() {
    for (const item of this.cells.answers) {
      const w = item[2][0];
      const h = item[2][1];

      const expansion = Math.min(w, h) * 0.2;

      item[1] = item[1].map(e => e - (expansion / 2));
      item[2] = item[2].map(e => e + expansion);
    }

    return this;
  }
  convertSingle(cell, convertTable, index) {
    return Math.floor(cell * convertTable[index]);
  }
  convertDouble(cells, convertTable) {
    cells[0] = this.convertSingle(cells[0], convertTable, 0);
    cells[1] = this.convertSingle(cells[1], convertTable, 1);
    return cells;
  }
}

class Sheet {
  /**@type {HTMLImageElement} */
  image;
  constructor (image) {
    /**@type {File} */
    this.imageFile = image;
    this.name = this.imageFile.name.replace(/\..+?$/, "");
    this.isReady = false;
    this.corrects = [];
    /** @type {Cells} */
    this.cells = [];
  }
  initCorrects(length) {
    this.corrects = new Array(length).fill(null);
  }
  setPoint(index, point) {
    this.corrects[index] = point;
  }
  getPoint(index) {
    return this.corrects[index];
  }
  prepareImage() {
    if (this.isReady) return;
    return new Promise(resolve => {
      const url = URL.createObjectURL(this.imageFile);
      const img = new Image();
      img.addEventListener("load", () => {
        this.image = img;
        this.isReady = true;
        resolve();

        // ↓消す？
        URL.revokeObjectURL(url);
      });
      img.src = url;
    });
  }
  /**
   * 
   * @param {[number, number]} pos 
   * @param {[number, number]} size 
   * @returns 
   */
  getTrimmedCanvas(pos, size) {
    if (!this.isReady) throw new Error("isn't ready.");
    const canvas = document.createElement("canvas");

    canvas.width = size[0];
    canvas.height = size[1];

    canvas.getContext("2d").drawImage(this.image, -pos[0], -pos[1]);

    return canvas;
  }
  getMarkDrawnCanvas() {
    const canvas = document.createElement("canvas");

    canvas.width = this.image.naturalWidth;
    canvas.height = this.image.naturalHeight;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.image, 0, 0);

    // 文字用
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "center";
    ctx.textBaseline = 'middle';

    const paddingRate = 0.1;

    for (let i = 0; i < this.cells.answers.length; i ++) {
      const cell = this.cells.answers[i];


      const padding = Math.min(...cell.position, this.cells.cells.normalH) * paddingRate;

      const point = this.getPoint(i);
      const max = cell.point;

      const size = Math.floor((Math.min(...cell.size, this.cells.cells.normalH) - padding));

      const mark = point2mark(point, max);
      if (mark == "blank") continue;
      
      const markImages = marks[mark];

      ctx.drawImage(
        markImages[Math.floor(Math.random()*markImages.length)],
        cell.position[0] + padding / 2, cell.position[1] + (cell.size[1] / 2) - (size / 2),
        size, size);

      if (mark == "h") {
        ctx.font = (size * 0.4)+"px sans-serif";
        ctx.fillText(point.toString(), cell.position[0] + padding / 2 + (size / 2), cell.position[1] + (cell.size[1] / 2));
      }
      
    }

    const sum = this.corrects.reduce((prev, curr) => prev + Math.max(0, curr), 0);

    const fontSize = this.cells.cells.point[1][0] / 3 * 0.8;
    ctx.font = "bold "+fontSize+"px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = 'middle';
    ctx.fillText(sum.toString(), ...this.cells.cells.point[0].map((e, i) => e + this.cells.cells.point[1][i] / 2));

    return canvas;
  }
}

// test: examineesAnswers[0].getTrimmedCanvas(examineesAnswers[0].cells.answers[0][1],examineesAnswers[0].cells.answers[0][2])