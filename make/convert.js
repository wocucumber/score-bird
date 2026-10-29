const BORDER_COLOR = "#000";
const FILL_COLOR = "#fff";
const TEXT_COLOR = "#000";
const KIJUTSU = "k";
const TONARIHE = Symbol();
const SIZES = Object.freeze({
  section: 40,
  small: 35,
  inside: 20,
  height: 40,
  border: 2
});
const WIDTHES = Object.freeze({
  small: SIZES.height * 1.5,
  medium: SIZES.height * 4,
  large: SIZES.height * 6
});
const FONTSIZES = Object.freeze({
  section: 20,
  small: 14,
  inside: 14,
  start_end: 10
});
const TITLES = Object.freeze({
  min_height: 60
});
const FOOTER = Object.freeze({
  height: 60
});
const POINT_BOX = Object.freeze({
  width: 50,
  height: 50,
  offset_x: 5,
  offset_y: 5,
  text_offset_x: 2,
  text_offset_y: 2,
  font_size: 8,
  line_offset_x: 5,
  line_offset_y: 5,
  line_width: 1.5
});
const NAME_BOX = Object.freeze({
  width: 180,
  height: 40,
  offset_x: 10,
  offset_y: 10,
  font_size: 12,
  text_offset: 5
});
const STROKE_DATA = {
  color: BORDER_COLOR,
  width: SIZES.border
};
const STROKE_DASHARRAY = "3";
const MAX_WIDTH = SIZES.section + SIZES.small + SIZES.inside + WIDTHES.large + SIZES.border + SIZES.inside;

let cells = {
  answers: []
};
let secMaxX = 0;
/**
 * 
 * @param {import("@svgdotjs/svg.js").Svg} svg 
 * @param {[number, number]} location 
 * @param {[number, number]} size 
 * @param {string?} text 
 * @param {number?} fontSize 
 * @returns 
 */
function rect(svg, location, size, text, fontSize, start, end) {
  secMaxX = Math.max(location[0]+size[0], secMaxX);

  svg.rect(...size).stroke(STROKE_DATA).fill(FILL_COLOR).move(...location);

  if (text) {
    const t = svg.text(text).fill(TEXT_COLOR).font({
      size: fontSize,
      family: "Noto Sans JP, sans-serif",
    });
    const box = t.bbox();
    const w = box.w;
    const h = box.h;
    t.move(location[0] + (size[0]/2) - (w/2), location[1] + (size[1]/2) - (h/2));
  }

  if (start) {
    const t = svg.text(start).fill(TEXT_COLOR).font({
      size: FONTSIZES.start_end,
      family: "Noto Sans JP, sans-serif",
    });
    const box = t.bbox();
    // const w = box.w;
    const h = box.h;
    t.move(location[0] + (FONTSIZES.start_end / 2), location[1] + (size[1]/2) - (h/2));
  }
  if (end) {
    const t = svg.text(end).fill(TEXT_COLOR).font({
      size: FONTSIZES.start_end,
      family: "Noto Sans JP, sans-serif",
    });
    const box = t.bbox();
    const w = box.w;
    const h = box.h;
    t.move(location[0] + size[0] - w - (FONTSIZES.start_end / 2), location[1] + (size[1]/2) - (h/2));
  }

  return {
    registerCell(name, moves) {
      cells.answers.push([name, location.map((e, i) => e + moves[i]), location.map((e, i) => e + size[i] + moves[i])]);
    }
  };
}
function getWidthFromParam(param) {
  if (!param) return WIDTHES.medium;

  if (param == "s") return WIDTHES.small;
  if (param == "m") return WIDTHES.medium;
  if (param == "l") return WIDTHES.large;
  if (isKijutsu(param)) return WIDTHES.large;

  // alert("文字サイズ:"+param+"は知りません");

  return WIDTHES.medium;
}
function isKijutsu(param) {
  return param?.startsWith(KIJUTSU);
}
function convert(sections, option) {
  const TITLE_HEIGHT = option.title?.length > 0 ? Math.floor(Math.max(option.title_font_size * 1.3, TITLES.min_height)) : 0;

  /**@type {import("@svgdotjs/svg.js").Svg} */
  const result = SVG();
  // result.width(1000).height(500)

  cells = {
    answers: []
  };

  let maxYSum = 0;

  const BASE_Y = option.title?.length > 0 ? TITLE_HEIGHT : 0;

  let ySum = SIZES.border / 2;
  let zurashiX = 0;
  secMaxX = 0;
  for (const sec of sections) {
    // console.log(sec);

    if (sec == TONARIHE) {
      maxYSum = Math.max(ySum, maxYSum);
      ySum = SIZES.border / 2;
      // console.log(secMaxX, zurashiX);
      // console.log(secMaxX - zurashiX);
      zurashiX += (secMaxX - zurashiX) + SIZES.inside;
      secMaxX = 0;
      continue;
    }



    /**@type {import("@svgdotjs/svg.js").Svg} */
    const r = result.nested();
    
    const baseY = BASE_Y + SIZES.border / 2;
    let y = 0;
    const baseX = zurashiX + SIZES.section + 1;


    for (const q of sec.items) {
      let moves = [SIZES.border / 2, ySum];

      if (q.children) {
        const beforeY = y;
        for (const child of q.children) {
          if (isKijutsu(child.param)) {
            const num = Number(child.param.replace(KIJUTSU, ""));
            // ①みたいな
            rect(r, [baseX + SIZES.small, baseY + y], [SIZES.inside, SIZES.height * num], child.q, FONTSIZES.inside);
            // 解答枠
            rect(r, [baseX + SIZES.small + SIZES.inside, baseY + y], [getWidthFromParam(child.param), SIZES.height * num], undefined, undefined, child.start, child.end).registerCell("["+sec.title+"]("+q.q+")"+child.q, moves);
            for (let i = 0; i < num - 1; i ++) {
              // 点線
              r.line([baseX + SIZES.small + SIZES.inside, baseY + y + (i + 1) * SIZES.height, baseX + SIZES.small + SIZES.inside + getWidthFromParam(child.param), baseY + y + (i + 1) * SIZES.height]).fill(FILL_COLOR).stroke({
                ...STROKE_DATA,
                dasharray: STROKE_DASHARRAY
              });
            }
            y += SIZES.height * num;
          } else {
            rect(r, [baseX + SIZES.small, baseY + y], [SIZES.inside, SIZES.height], child.q, FONTSIZES.inside);
            rect(r, [baseX + SIZES.small + SIZES.inside, baseY + y], [getWidthFromParam(child.param), SIZES.height], undefined, undefined, child.start, child.end).registerCell("["+sec.title+"]("+q.q+")"+child.q, moves);
            y += SIZES.height;
          }
        }
        rect(r, [baseX, baseY + beforeY], [SIZES.small, y - beforeY], "("+q.q+")", FONTSIZES.small);
      } else {
        if (isKijutsu(q.param)) {
          const num = Number(q.param.replace(KIJUTSU, ""));
          // (1)みたいな
          rect(r, [baseX, baseY + y], [SIZES.small, SIZES.height * num], "("+q.q+")", FONTSIZES.small);
          // 解答枠
          rect(r, [baseX + SIZES.small, baseY + y], [getWidthFromParam(q.param), SIZES.height * num], undefined, undefined, q.start, q.end).registerCell("["+sec.title+"]("+q.q+")", moves);
          for (let i = 0; i < num - 1; i ++) {
            // 点線
            r.line([baseX + SIZES.small, baseY + y + (i + 1) * SIZES.height, baseX + SIZES.small + getWidthFromParam(q.param), baseY + y + (i + 1) * SIZES.height]).fill(FILL_COLOR).stroke({
              ...STROKE_DATA,
              dasharray: STROKE_DASHARRAY
            });
          }
          y += SIZES.height * num;
        } else {
          rect(r, [baseX, baseY + y], [SIZES.small, SIZES.height], "("+q.q+")", FONTSIZES.small);
          rect(r, [baseX + SIZES.small, baseY + y], [getWidthFromParam(q.param), SIZES.height], undefined, undefined, q.start, q.end).registerCell("["+sec.title+"]("+q.q+")", moves);
          y += SIZES.height;
        }
      }
    }

    rect(r, [baseX - SIZES.section, baseY], [SIZES.section, y], sec.title, FONTSIZES.section);

    r.move(SIZES.border / 2, ySum);
    ySum += y + SIZES.section / 2;

  }
  maxYSum = Math.max(ySum, maxYSum) + BASE_Y;
  
  zurashiX += secMaxX - zurashiX + SIZES.border + 1;


  if (option.title?.length > 0) {
    const t = result.text(option.title).fill(TEXT_COLOR).font({
      size: option.title_font_size,
      family: "Noto Sans JP, sans-serif",
    });
    const box = t.bbox();
    const w = box.w;
    const h = box.h;
    t.move(zurashiX / 2 - w / 2, TITLE_HEIGHT / 2 - h / 2);
  }

  if (option.point) {
    result.rect(POINT_BOX.width, POINT_BOX.height).stroke(STROKE_DATA).fill(FILL_COLOR)
      .move(zurashiX - POINT_BOX.width - POINT_BOX.offset_x,
            maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y);


    if (option.show_max_point) {
      const t = result.text(option.point_sum).fill(TEXT_COLOR).font({
        size: POINT_BOX.font_size,
        family: "Noto Sans JP, sans-serif",
      });
      const box = t.bbox();
      const w = box.w;
      const h = box.h;
      t.move((zurashiX - POINT_BOX.width - POINT_BOX.offset_x) + POINT_BOX.width - w - POINT_BOX.text_offset_x,
             (maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y) + POINT_BOX.height - h - POINT_BOX.text_offset_y);
  
      result.line(
      
        (zurashiX - POINT_BOX.width - POINT_BOX.offset_x) + POINT_BOX.width / 2,
        (maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y) + POINT_BOX.height - POINT_BOX.line_offset_y,
      
  
        (zurashiX - POINT_BOX.width - POINT_BOX.offset_x) + POINT_BOX.width - POINT_BOX.line_offset_x,
        (maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y) + POINT_BOX.height / 2
      ).stroke({ color: BORDER_COLOR, width: POINT_BOX.line_width });
    }

    cells.point = [
      [zurashiX - POINT_BOX.width - POINT_BOX.offset_x,
        maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y
      ],
      [(zurashiX - POINT_BOX.width - POINT_BOX.offset_x) + POINT_BOX.width,
        (maxYSum + FOOTER.height - POINT_BOX.height - POINT_BOX.offset_y) + POINT_BOX.height
      ]
    ];
  }
  if (option.name) {
    result.rect(NAME_BOX.width, NAME_BOX.height).stroke(STROKE_DATA).fill(FILL_COLOR).move(NAME_BOX.offset_x, maxYSum + FOOTER.height - NAME_BOX.height - NAME_BOX.offset_y);
    const t = result.text("氏名").fill(TEXT_COLOR).font({
      size: NAME_BOX.font_size,
      family: "Noto Sans JP, sans-serif",
    });
    const h = t.bbox().h;
    t.move(NAME_BOX.offset_x + NAME_BOX.text_offset, (maxYSum + FOOTER.height - NAME_BOX.height - NAME_BOX.offset_y) + (NAME_BOX.height / 2 - h / 2));
  }
  if (option.point || option.name) {
    maxYSum += FOOTER.height;
  }


  result.height(maxYSum);
  result.width(zurashiX);

  cells.size = [zurashiX, zurashiX];

  return [result, maxYSum, zurashiX, cells];
}




function convert2canvas(svg, w, h, canvas) {

  return new Promise(resolve => {

    
    // https://qiita.com/shikuno_dev/items/bdc013c602645b07c047

    const svgDataBase64 = btoa(unescape(encodeURIComponent(svg)))
    // console.log(svgDataBase64);

    const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`
    // console.log(svgDataUrl);

    const context = canvas.getContext('2d');

    // 高解像度設定
    canvas.width = w * 2;
    canvas.height = h * 2;

    canvas.style.width  = w + "px";
    canvas.style.height = h + "px";

    const img = new Image();
    img.addEventListener("load", () => {
      context.drawImage(img, 0, 0, w * 2, h * 2);

      resolve();
    });
    img.src = svgDataUrl;
  });
}

function convert2png(svg, w, h) {

  return new Promise(resolve => {

    
    // https://qiita.com/shikuno_dev/items/bdc013c602645b07c047

    const svgDataBase64 = btoa(unescape(encodeURIComponent(svg)))
    // console.log(svgDataBase64);

    const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`
    // console.log(svgDataUrl);

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // 高解像度設定
    canvas.width = w * 2;
    canvas.height = h * 2;

    const img = new Image();
    img.addEventListener("load", () => {
      context.drawImage(img, 0, 0, w * 2, h * 2);

      const res = canvas.toDataURL("image/png");
      resolve(res);
    });
    img.src = svgDataUrl;
  });
}
function canvas2png(canvas) {
  return canvas.toDataURL("image/png");
}