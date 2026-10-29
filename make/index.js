const DEFAULT_EXAM_SETTING = {
  title: "",
  title_font_size: 30,
  name: true,
  point: true,
  show_max_point: true,
};

const SCALE2JP = {
  s: "小",
  m: "中",
  l: "大",
}

const app = Vue.createApp({
  data() {
    return {
      // questions
      q: [],
      // selected
      s: null,
      // exam 設定
      e: structuredClone(DEFAULT_EXAM_SETTING),
      tab: 0
    }
  },
  methods: {
    scale2jp(q) {
      const s = q.scale;
      if (SCALE2JP[s])
        return SCALE2JP[s];
      if (s == "k")
        return "記述"+q.k_lines;
    },
    addLarge() {
      this.q.push({
        title: this.q.reduce((prev, e) => Math.max(Number(e.title), prev), 0) + 1,
        nextline: false,
        items: []
      });
    },
    deleteLarge(i) {
      if (confirm("大問"+this.q[i].title+"を削除します"))
        this.q.splice(i, 1);
    },
    getNewSmallTemplete(sec) {
      const smalls = this.getSmallQuestions(sec);
      return {
        q: smalls.reduce((prev, e) => Math.max(Number(e.q), prev), 0) + 1,
        scale: "m",
        start: "",
        end: "",
        id: smalls.reduce((prev, e) => Math.max(Number(e.id), prev), -1) + 1,
        children: [],
        answer: "",
        scoring_desc: "",
        point: null,
        k_lines: 1
      }
    },
    addSmall(sec) {
      sec.items.push(this.getNewSmallTemplete(sec));
    },
    selectSmallById(i, id) {
      this.selectSmall(this.q[i].items.find(e => e.id == id));
    },
    selectSmall(que) {
      this.s = que;
      this.tab = 0;
    },
    deleteSmall(i, id) {
      const index = this.q[i].items.findIndex(e => e.id == id);
      if (index == -1) return alert("失敗しました");

      const item = this.q[i].items[index];
      if (item.children.length >= 1)
        for (const child of item.children) {
          this.q[i].items.splice(this.q[i].items.indexOf(child), 1);
        }
      if (item.parent != undefined)
        this.q[i].items.find(e => e.id == item.parent).children.splice(this.q[i].items.find(e => e.id == item.parent).children.indexOf(item), 1);


      this.q[i].items.splice(index, 1);
    },
    addChild(sec, que) {
      const item = {
        ...this.getNewSmallTemplete(sec),
        child: true,
        q: "",
        parent: que.id
      };
      sec.items.push(item);
      que.children.push(item);
    },
    getSmallQuestions(sec) {
      return sec.items.filter(e => e.child != true);
    },
    make() {
      const [svg, h, w, cells] = convert(this.getPrepared4SVG(), this.getConfig4Convert());
      // window.open("data:image/svg+xml;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(svg))))
      convert2png(svg.svg(), w, h).then(e => {
        document.getElementById("res").src = e;
        alert("したのほうにあります");
      });
      console.log(cells);
    },
    getConfig4Convert() {
      return {
        ...this.e,
        point_sum: this.getSum()
      }
    },
    getPrepared4SVG() {
      const copy = this.q.map(s => ({...s, items: s.items.filter(e => e.parent == undefined).map(e => ({...e}))}));

      const res = [];

      let first = true;
      for (const s of copy) {
        for (const q of s.items) {
          if (q.children.length == 0)
            delete q.children;
          else 
            q.children = q.children.map(e => ({...e, param: e.scale + (e.scale == "k" ? e.k_lines : "")}));

          q.param = q.scale + (q.scale == "k" ? q.k_lines : "");
        }

        if (s.nextline && !first)
          res.push(TONARIHE);

        res.push(s);

        first = false;
      }

      return res;
    },
    getSVG() {
      const copy = this.getPrepared4SVG();
      if (!copy) return null;
      const [svg, , w] = convert(copy, this.getConfig4Convert())
      return svg.css({width: w+"px"}).svg();
    },
    save() {
      const data = {
        q: this.q,
        e: this.e
      };
      const file = new Blob([JSON.stringify(data)], {type: "application/json"});

      const url = URL.createObjectURL(file);

      const a = document.createElement("a");
      a.href = url;
      a.download = (this.e.title == "" ? "回答用紙" : this.e.title)+".score-bird.json";
      a.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    },
    load() {
      document.getElementById("file").click();
    },
    onChangeFile(e) {
      const f = e.target.files[0];
      if (!f) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const d = JSON.parse(reader.result);
        this.q = d.q;
        this.e = d.e;

        for (const key of Object.keys(DEFAULT_EXAM_SETTING)) {
          console.log(key, key in this.e);
          if (!(key in this.e)) 
            this.e[key] = DEFAULT_EXAM_SETTING[key];
          console.log(key, key in this.e);
        }
      });
      reader.readAsText(f);
    },
    getSum() {
      return this.q.map(e => e.items).flat().map(e => isNaN(e.point) ? 0 : Number(e.point)).reduce((prev, curr) => prev + curr, 0);
    }
  }
}).mount("#main");