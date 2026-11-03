/** @type {Sheet} */
let modelAnswer = null;
/** @type {Sheet[]} */
let examineesAnswers = [];
/** @type {Cells} */
let cells = null;

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 */
function canvas2arrayBuffer(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(b => {
      b.arrayBuffer().then(a => {
        resolve(a);
      });
    }, 'image/jpeg', 0.9);
  });
}

const app = Vue.createApp({
  data() {
    /**@type {{page: number, p01_filesState:boolean[], questionIndex: number, qd:{name: string, i:number, answersCount:number, students: HTMLCanvasElement[], model: HTMLCanvasElement, point:number}, si: {label: string, point: number | null}[]}} */
    return {
      page: 0,
      p01_filesState: [false, false, false],
      questionIndex: 0,
      // QuestionData
      qd: {},
      // ScoringInfo
      si: [],
      // StatusTableData
      std: [],
    }
  },
  methods: {
    changePage(p) {
      this.page = p;
    },
    p01_modelAnswer(e) {
      if (e.target.files[0]) {
        modelAnswer = e.target.files[0]
        this.p01_filesState[0] = true;
      }
    },
    p01_examineesAnswer(e) {
      if (e.target.files.length > 0) {
        examineesAnswers = e.target.files;
        this.p01_filesState[1] = true;
      }
    },
    p01_cellsFile(e) {
      if (e.target.files[0]) {
        this.p01_filesState[2] = true;
        const file = e.target.files[0];

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          cells = new Cells(JSON.parse(reader.result)).expandAnswers();
        });

        reader.readAsText(file);
      }
    },
    async p01_next() {
      this.changePage(2);

      const queue = [];

      modelAnswer = new Sheet(modelAnswer);
      queue.push(modelAnswer.prepareImage());
      const newAnswers = [];
      for (const image of examineesAnswers) {
        const answer = new Sheet(image);
        newAnswers.push(answer);
        queue.push(answer.prepareImage());
      }
      examineesAnswers = newAnswers;

      await Promise.all(queue);

      modelAnswer.cells = cells.convertFor(modelAnswer);
      for (const sheet of examineesAnswers) {
        sheet.initCorrects(cells.answers.length);
        sheet.cells = cells.convertFor(sheet);
      }

      this.questionIndex = 0;

      this.prepareQuestionData();
      this.prepareScoringInfo();
      console.log("prepared");

      this.changePage(3);
    },
    prepareQuestionData() {
      const i = this.questionIndex;
      const name = cells.answers[i].name;

      const model = modelAnswer.getTrimmedCanvas(modelAnswer.cells.answers[i].position, modelAnswer.cells.answers[i].size);
      const students = examineesAnswers.map(e => {
        const cell = e.cells.answers[i];
        return e.getTrimmedCanvas(cell.position, cell.size);
      });

      this.qd = {
        name,
        i,
        answersCount: cells.answers.length,
        model,
        students,
        point: cells.answers[i].point
      }
    },
    prepareScoringInfo() {
      this.si = [];
      for (const stu of examineesAnswers) {
        this.si.push({
          label: stu.name,
          point: stu.getPoint(this.questionIndex)
        });
      }
    },
    changeQuestion(i) {
      this.questionIndex = i;
      this.prepareQuestionData();
      this.prepareScoringInfo();
    },
    setPoint(i, mark) {
      const current = this.si[i].point;

      let point = null;
      if (mark == "o") {
        point = this.qd.point;
      } else if (mark == "x") {
        point = 0;
      } else if (mark == "h") { // h:  halfなど　の略。
        if (current != this.qd.point && current != 0 && current != null) {
          this.applyPoints2UIandData(i, null);
          return;
        }
        const val = prompt("点数を入力(配点: "+this.qd.point+"点)");
        if (val == null) return;
        point = Number(val);
        if (isNaN(point))
          return;
        point = Math.min(Math.max(point, 0), this.qd.point);

        this.applyPoints2UIandData(i, point);
        return;
      } else {
        return;
      }

      if (current == point) {
        this.applyPoints2UIandData(i, null);
        return;
      }
      
      this.applyPoints2UIandData(i, point);
    },
    applyPoints2UIandData(examineeIndex, point) {
      examineesAnswers[examineeIndex].setPoint(this.questionIndex, point);
      this.si[examineeIndex].point = point;
    },
    point2mark(point) {
      return point2mark(point, this.qd.point);
    },
    finishScoring() {
      this.prepareStatusTableData();
      this.page = 4;
    },
    prepareStatusTableData() {
      this.std = {questions: []};
      let sum = 0;
      for (let i = 0; i < cells.answers.length; i ++) {
        let rate = examineesAnswers.reduce((prev, curr) => prev + (curr.getPoint(i) == null ? 0 : 1), 0) / examineesAnswers.length;
        sum += rate;
        this.std.questions.push([cells.answers[i].name, rate]);
      }
      this.std.sum = sum / cells.answers.length;
    },
    async exportAsPDF() {
      const pdf = await PDFLib.PDFDocument.create();

      const images = await Promise.all(examineesAnswers.map(e => new Promise(async resolve => {
        const buffer = await canvas2arrayBuffer(e.getMarkDrawnCanvas())
        resolve(await pdf.embedJpg(buffer));
      })));

      for (const img of images) {
        const ptWidth = img.width * 0.24;
        const ptHeight = img.height * 0.24;
        const page = pdf.addPage([ptWidth, ptHeight]);

        page.drawImage(img, {
          x: 0,
          y: 0,
          width: ptWidth,
          height: ptHeight,
        });
      }

      const pdfBytes = await pdf.save();

      const blob = new Blob([pdfBytes], {type: "application/pdf"});
      
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "採点結果.pdf";

      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    },
    gotoScoring(index) {
      if (index != undefined) {
        this.changeQuestion(index);
      }

      this.changePage(3);
    }
  }
})


app.directive("append-child", (element, binding) => {
  element.innerHTML = "";
  if (binding.value instanceof HTMLElement)
    element.appendChild(binding.value);
});

app.mount("#main");