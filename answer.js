// Copyright (c) OpenAI. All rights reserved.
const path = require("path");
const fs = require("fs");
const { imageSize } = require("image-size");
const pptxgen = require("pptxgenjs");
const { icon } = require("@fortawesome/fontawesome-svg-core");
const { faHammer } = require("@fortawesome/free-solid-svg-icons");
// These are the constants for slides_template.js, adapt them to your content accordingly.
// To read the rest of the template, see slides_template.js.
const SLIDE_HEIGHT = 5.625; // inches
const SLIDE_WIDTH = (SLIDE_HEIGHT / 9) * 16; // 10 inches
const BULLET_INDENT = 15; // USE THIS FOR BULLET INDENTATION SPACINGS. Example: {text: "Lorem ipsum dolor sit amet.",options: { bullet: { indent: BULLET_INDENT } },},
const FONT_FACE = "Arial";
const FONT_SIZE = {
  PRESENTATION_TITLE: 36,
  PRESENTATION_SUBTITLE: 12,
  SLIDE_TITLE: 24,
  DATE: 12,
  SECTION_TITLE: 16,
  TEXT: 12,
  DETAIL: 8,
  PLACEHOLDER: 10,
  CITATION: 6,
  SUBHEADER: 21,
};
const CITATION_HEIGHT = calcTextBoxHeight(FONT_SIZE.CITATION);
const MARGINS = {
  DEFAULT_PADDING_BOTTOM: 0.23,
  DEFAULT_CITATION: SLIDE_HEIGHT - CITATION_HEIGHT - 0.15,
  ELEMENT_MEDIUM_PADDING_MEDIUM: 0.3,
  ELEMENT_MEDIUM_PADDING_LARGE: 0.6,
};
const SLIDE_TITLE = { X: 0.3, Y: 0.3, W: "94%" };
const WHITE = "FFFFFF"; // FOR BACKGROUND, adapt as needed for a light theme.
const BLACK = "000000"; // ONLY FOR FONTS, ICONS, ETC, adapt as needed for a light theme
const NEAR_BLACK_NAVY = "030A18"; // ONLY FOR FONTS, ICONS, ETC, adapt as needed for a light theme
const LIGHT_GRAY = "f5f5f5";
const GREYISH_BLUE = "97B1DF"; // FOR OTHER HIGHLIGHTS, adapt as needed for a light theme
const LIGHT_GREEN = "A4B6B8"; // FOR ICONS AND HIGHLIGHTS, adapt as needed for a light theme
// Just a placeholder! If you see slide using this, you'll need to replace it with actual assets—either generated or sourced from the internet.
const PLACEHOLDER_LIGHT_GRAY_BLOCK = path.join(
  __dirname,
  "placeholder_light_gray_block.png"
);
const imageInfoCache = new Map();
function calcTextBoxHeight(fontSize, lines = 1, leading = 1.2, padding = 0.15) {
  const lineHeightIn = (fontSize / 72) * leading;
  return lines * lineHeightIn + padding;
}
function getImageDimensions(path) {
  if (imageInfoCache.has(path)) return imageInfoCache.get(path);
  const dimensions = imageSize(fs.readFileSync(path));
  imageInfoCache.set(path, {
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: dimensions.width / dimensions.height,
  });
  return imageInfoCache.get(path);
}
function imageSizingContain(path, x, y, w, h) {
  // path: local file path; x, y, w, h: viewport inches
  const { aspectRatio } = getImageDimensions(path),
    boxAspect = w / h;
  const w2 = aspectRatio >= boxAspect ? w : h * aspectRatio,
    h2 = aspectRatio >= boxAspect ? w2 / aspectRatio : h;
  return { x: x + (w - w2) / 2, y: y + (h - h2) / 2, w: w2, h: h2 };
}
function imageSizingCrop(path, x, y, w, h) {
  // path: local file path; x, y, w, h: viewport inches
  const { aspectRatio } = getImageDimensions(path),
    boxAspect = w / h;
  let cx, cy, cw, ch;
  if (aspectRatio >= boxAspect) {
    cw = boxAspect / aspectRatio;
    ch = 1;
    cx = (1 - cw) / 2;
    cy = 0;
  } else {
    cw = 1;
    ch = aspectRatio / boxAspect;
    cx = 0;
    cy = (1 - ch) / 2;
  }
  let virtualW = w / cw,
    virtualH = virtualW / aspectRatio,
    eps = 1e-6;
  if (Math.abs(virtualH * ch - h) > eps) {
    virtualH = h / ch;
    virtualW = virtualH * aspectRatio;
  }
  return {
    x,
    y,
    w: virtualW,
    h: virtualH,
    sizing: { type: "crop", x: cx * virtualW, y: cy * virtualH, w, h },
  };
}
const hSlideTitle = calcTextBoxHeight(FONT_SIZE.SLIDE_TITLE);
function addSlideTitle(slide, title, color = BLACK) {
  slide.addText(title, {
    x: SLIDE_TITLE.X,
    y: SLIDE_TITLE.Y,
    w: SLIDE_TITLE.W,
    h: hSlideTitle,
    fontFace: FONT_FACE,
    fontSize: FONT_SIZE.SLIDE_TITLE,
    color,
  });
}
function getIconSvg(faIcon, color) {
  // CSS color, syntax slightly different from pptxgenjs.
  return icon(faIcon, { styles: { color: `#${color}` } }).html.join("");
}
const svgToDataUri = (svg) =>
  "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
(async () => {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "16x9", width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
  pptx.layout = "16x9";
  /*
   * Helper to add citations at the bottom of a slide. Takes an array of
   * tether URLs and returns an array of objects with sequential numbers and
   * associated hyperlink definitions. The global citation counter ensures
   * numbering across all slides. The citations are rendered as tiny
   * bracketed numbers separated by a small space.
   */
  let citationCounter = 1;
  function renderCitations(slide, urls) {
    const runs = urls.map((url) => {
      const number = citationCounter++;
      return {
        text: `[${number}]`,
        options: {
          hyperlink: { url },
          color: NEAR_BLACK_NAVY,
        },
      };
    });
    slide.addText(runs, {
      x: SLIDE_TITLE.X,
      y: MARGINS.DEFAULT_CITATION,
      w: SLIDE_TITLE.W,
      h: CITATION_HEIGHT,
      fontSize: FONT_SIZE.CITATION,
    });
  }

  // Preload custom images from the cached_assets_used directory. These assets
  // provide visual interest without any embedded text. When adding new
  // images, place them in the cached_assets_used folder and reference them
  // here so that pptxgenjs can locate them at runtime.
  const IMAGES = {
    titleBg: path.join(__dirname, "cached_assets_used", "title_background.png"),
    planningNetwork: path.join(__dirname, "cached_assets_used", "planning_network.png"),
  };

  // Begin constructing the presentation. Each slide carefully follows the
  // aesthetic guidelines of the provided template: clear section titles,
  // generous margins, light backgrounds, and subtle accent colours. Text
  // sizes are selected from the FONT_SIZE constants to maintain harmony.
  // Slide 1: Title page
  {
    const slide = pptx.addSlide();
    // Place a decorative image on the right half of the title slide. Crop the
    // image so that it fills the allotted space without distortion.
    slide.addImage({
      path: IMAGES.titleBg,
      ...imageSizingCrop(
        IMAGES.titleBg,
        0.55 * SLIDE_WIDTH,
        0.1 * SLIDE_HEIGHT,
        0.45 * SLIDE_WIDTH,
        0.8 * SLIDE_HEIGHT
      ),
    });
    const leftX = 0.3;
    // Main title
    slide.addText("Planning-Oriented Autonomous Driving (UniAD)", {
      x: leftX,
      y: 2.0,
      w: 5.0,
      h: 1.1,
      fontFace: FONT_FACE,
      fontSize: FONT_SIZE.PRESENTATION_TITLE,
      color: NEAR_BLACK_NAVY,
      bold: true,
      align: pptx.AlignH.left,
      valign: pptx.AlignV.middle,
    });
    // Subtitle describing the high-level scope
    slide.addText("Unified perception, prediction & planning", {
      x: leftX,
      y: 3.2,
      w: 5.0,
      h: 0.6,
      fontFace: FONT_FACE,
      fontSize: FONT_SIZE.PRESENTATION_SUBTITLE,
      color: NEAR_BLACK_NAVY,
      italic: true,
    });
    // Date line
    slide.addText("July 26, 2025", {
      x: leftX,
      y: 4.9,
      w: 5.0,
      h: 0.5,
      fontFace: FONT_FACE,
      fontSize: FONT_SIZE.DATE,
      color: NEAR_BLACK_NAVY,
    });
  }

  // Slide 2: Outline
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Outline");
    // Create a semi-transparent rectangle behind the list for subtle contrast
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.3,
      y: 1.2,
      w: 9.4,
      h: 3.5,
      fill: { color: "F3F6FA" },
      line: { color: "DDE4EF" },
    });
    // Outline items. Use bullet indentation consistent with the template.
    const outlineItems = [
      "Introduction & Motivation",
      "UniAD Methodology",
      "Perception: Tracking & Mapping",
      "Prediction: Motion Forecasting",
      "Prediction: Occupancy Prediction",
      "Planning & Learning",
      "Experiments & Results",
      "Conclusion & Future Work",
    ];
    const runs = outlineItems.map((text) => {
      return {
        text,
        options: { bullet: { indent: BULLET_INDENT } },
      };
    });
    slide.addText(runs, {
      x: 0.6,
      y: 1.4,
      w: 9.0,
      h: 3.5,
      fontFace: FONT_FACE,
      fontSize: FONT_SIZE.TEXT,
      color: NEAR_BLACK_NAVY,
      valign: "top",
      wrap: true,
      paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
    });
  }

  // Slide 3: Introduction & Motivation
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Introduction & Motivation");
    // Draw three columns to compare different design philosophies
    const colW = 2.9;
    const colH = 2.2;
    const baseY = 1.7;
    const xPositions = [0.3, 3.6, 6.9];
    const headers = ["Standalone", "Multi‑Task", "Planning‑Oriented"];
    const descriptions = [
      "Independent models for perception, prediction & planning", 
      "Shared backbone with multiple task-specific heads", 
      "Unified system driven by planning goal", 
    ];
    const bodyTexts = [
      "Error accumulation & misalignment", 
      "Negative transfer across tasks", 
      "Queries connect modules & reduce errors", 
    ];
    headers.forEach((hdr, idx) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: xPositions[idx],
        y: baseY,
        w: colW,
        h: colH,
        fill: { color: idx === 2 ? "CFE4FA" : idx === 1 ? "DCEBF5" : "E8F0FC" },
        line: { color: "B0C6DE" },
        rectRadius: 0.08,
      });
      // Column heading
      slide.addText(hdr, {
        x: xPositions[idx] + 0.1,
        y: baseY + 0.1,
        w: colW - 0.2,
        h: 0.4,
        fontFace: FONT_FACE,
        fontSize: FONT_SIZE.SECTION_TITLE,
        color: NEAR_BLACK_NAVY,
        bold: true,
      });
      // Subheading
      slide.addText(descriptions[idx], {
        x: xPositions[idx] + 0.1,
        y: baseY + 0.55,
        w: colW - 0.2,
        h: 0.5,
        fontFace: FONT_FACE,
        fontSize: FONT_SIZE.TEXT,
        color: NEAR_BLACK_NAVY,
        bold: false,
        wrap: true,
      });
      // Body text
      slide.addText(bodyTexts[idx], {
        x: xPositions[idx] + 0.1,
        y: baseY + 1.1,
        w: colW - 0.2,
        h: 0.7,
        fontFace: FONT_FACE,
        fontSize: FONT_SIZE.TEXT,
        color: NEAR_BLACK_NAVY,
        italic: true,
        wrap: true,
      });
    });
    // Descriptive paragraph summarising motivation beneath the diagram
    const introText = [
      { text: "Modern autonomous driving pipelines are often modular, leading to error accumulation across perception, prediction and planning.", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      { text: " UniAD seeks to prioritize planning by revisiting preceding tasks and ensuring that all components contribute towards the ultimate goal.", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
    ];
    slide.addText(introText, {
      x: 0.5,
      y: 4.1,
      w: 9.3,
      h: 0.9,
      align: pptx.AlignH.left,
      wrap: true,
    });
    // Citations
    renderCitations(slide, [
      "【517453676776078†L12-L19】",
      "【517453676776078†L20-L24】",
    ]);
  }

  // Slide 4: UniAD Methodology
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "UniAD Methodology");
    // Draw the pipeline as a sequence of rounded rectangles with arrows
    const modules = [
      "Multi‑Camera Input",
      "BEV Encoder",
      "TrackFormer",
      "MapFormer",
      "MotionFormer",
      "OccFormer",
      "Planner",
    ];
    const moduleCount = modules.length;
    // Increase module width slightly so long names like "MotionFormer" do not wrap to multiple lines.
    const modW = 1.2;
    const gap = 0.15;
    const totalW = moduleCount * modW + (moduleCount - 1) * gap;
    const startX = (SLIDE_WIDTH - totalW) / 2;
    const yPos = 2.4;
    modules.forEach((name, idx) => {
      const x = startX + idx * (modW + gap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: yPos,
        w: modW,
        h: 0.6,
        fill: { color: idx % 2 === 0 ? "E0ECF8" : "F0F5FC" },
        line: { color: "A7C4E2" },
        rectRadius: 0.06,
      });
      slide.addText(name, {
        x: x + 0.05,
        y: yPos + 0.18,
        w: modW - 0.1,
        h: 0.25,
        fontFace: FONT_FACE,
        fontSize: 10,
        color: NEAR_BLACK_NAVY,
        align: pptx.AlignH.center,
      });
      // Arrows between modules
      if (idx < moduleCount - 1) {
        const arrowX = x + modW;
        const arrowY = yPos + 0.18;
        slide.addShape(pptx.ShapeType.rightArrow, {
          x: arrowX,
          y: arrowY + 0.05,
          w: gap - 0.02,
          h: 0.1,
          fill: { color: "6C91C2" },
          line: { color: "6C91C2" },
        });
      }
    });
    // Explanatory text below the diagram summarizing the pipeline
    const methodText = [
      { text: "BEV features are extracted from multi‑camera images and fed into transformer‑based modules.", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      { text: " TrackFormer detects, tracks and represents agents (including the ego vehicle).", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      { text: " MapFormer abstracts lanes, dividers & crossings to assist motion forecasting.", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      { text: " MotionFormer predicts multi‑agent trajectories, OccFormer forecasts future occupancy, and the Planner produces a safe trajectory.", options: { fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
    ];
    slide.addText(methodText, {
      x: 0.5,
      y: 3.3,
      w: 9.2,
      h: 1.5,
      wrap: true,
    });
    // Citations
    renderCitations(slide, ["【517453676776078†L205-L249】"]);
  }

  // Slide 5: Perception Modules – Tracking & Mapping
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Perception: Tracking & Mapping");
    // Left column: TrackFormer details
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 1.7,
      w: 4.4,
      h: 2.6,
      fill: { color: "F5F9FD" },
      line: { color: "D8E2F0" },
    });
    slide.addText(
      [
        // Heading for TrackFormer
        { text: "TrackFormer\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        // Bullet points without embedded bullet characters – bullets are generated via the bullet option
        { text: "Joint detection and multi‑object tracking", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Introduces separate detection and track queries for newborn and existing agents", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Self‑attention across frames aggregates temporal information", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Includes an ego‑vehicle query to explicitly model the self‑driving car", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: 1.8,
        w: 4.3,
        h: 2.5,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // Right column: MapFormer details
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.2,
      y: 1.7,
      w: 4.4,
      h: 2.6,
      fill: { color: "F5F9FD" },
      line: { color: "D8E2F0" },
    });
    slide.addText(
      [
        { text: "MapFormer\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Panoptic segmentation of lanes, dividers & crossings", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Sparse map queries encode location & structure knowledge", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Outputs only the updated queries to MotionFormer", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 5.25,
        y: 1.8,
        w: 4.3,
        h: 2.5,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    renderCitations(slide, ["【517453676776078†L251-L274】", "【517453676776078†L275-L284】"]);
  }

  // Slide 6: Prediction – Motion Forecasting
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Prediction: Motion Forecasting");
    // Text explanation for MotionFormer
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 1.7,
      w: 5.5,
      h: 2.8,
      fill: { color: "F6FAFF" },
      line: { color: "D0E1F5" },
    });
    slide.addText(
      [
        { text: "MotionFormer\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Consumes queries from TrackFormer (agents) & MapFormer (static map) to predict multi‑modal trajectories for all agents", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Single forward pass saves computational cost by operating in a scene‑centric manner", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Captures agent–agent, agent–map & agent–goal interactions via multi‑head cross/self‑attention and deformable attention", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Incorporates anchors & non‑linear smoothing to produce physically plausible trajectories", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: 1.8,
        w: 5.4,
        h: 2.7,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // Decorative abstract path image on the right
    slide.addImage({
      path: IMAGES.planningNetwork,
      ...imageSizingContain(IMAGES.planningNetwork, 6.2, 1.9, 3.5, 2.5),
    });
    renderCitations(slide, ["【517453676776078†L286-L296】", "【517453676776078†L304-L377】"]);
  }

  // Slide 7: Prediction – Occupancy Prediction
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Prediction: Occupancy Prediction");
    // Occupancy description on the left
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 1.7,
      w: 5.8,
      h: 2.8,
      fill: { color: "F8FBFF" },
      line: { color: "D7E5F4" },
    });
    slide.addText(
      [
        { text: "OccFormer\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Occupancy grid represents future occupancy of each BEV cell", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Prior RNN‑based methods compress features and require hand‑crafted post‑processing", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "OccFormer fuses scene‑level and agent‑level semantics using attention and predicts instance‑wise occupancy via matrix multiplication", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Sequential blocks unroll future horizons with pixel‑agent interaction for dense prediction", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: 1.8,
        w: 5.7,
        h: 2.7,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // A simple illustrative grid on the right: draw a 4×4 grid with some filled cells
    const gridX = 7.0;
    const gridY = 2.0;
    const cellSize = 0.5;
    // Draw background grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        slide.addShape(pptx.ShapeType.rect, {
          x: gridX + col * cellSize,
          y: gridY + row * cellSize,
          w: cellSize,
          h: cellSize,
          fill: { color: "EAF2FC" },
          line: { color: "B9D2ED" },
        });
      }
    }
    // Highlight a few cells to indicate occupancy
    const occupied = [ [1, 2], [2, 1], [3, 3] ];
    occupied.forEach(([r, c]) => {
      slide.addShape(pptx.ShapeType.rect, {
        x: gridX + c * cellSize,
        y: gridY + r * cellSize,
        w: cellSize,
        h: cellSize,
        fill: { color: "6C91C2" },
        line: { color: "6C91C2" },
      });
    });
    renderCitations(slide, ["【517453676776078†L402-L421】"]);
  }

  // Slide 8: Planning & Learning
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Planning & Learning");
    // Planning section
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 1.7,
      w: 4.5,
      h: 2.6,
      fill: { color: "F7FAFD" },
      line: { color: "D2E0F0" },
    });
    slide.addText(
      [
        { text: "Planner\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Combines navigation commands (left, right, forward) with the ego‑vehicle query to form a plan query", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Attends to BEV features to produce future waypoints", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Uses Newton’s method to adjust the trajectory and avoid collisions based on occupancy predictions", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: 1.8,
        w: 4.4,
        h: 2.5,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // Learning section
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.2,
      y: 1.7,
      w: 4.5,
      h: 2.6,
      fill: { color: "F7FAFD" },
      line: { color: "D2E0F0" },
    });
    slide.addText(
      [
        { text: "Learning Strategy\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Two‑stage training: jointly train perception modules (tracking & mapping), then train all modules end‑to‑end", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Bipartite matching reuses assignments across tasks to maintain consistent agent identity", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 5.25,
        y: 1.8,
        w: 4.4,
        h: 2.5,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    renderCitations(slide, ["【517453676776078†L503-L515】", "【517453676776078†L554-L561】"]);
  }

  // Slide 9: Experiments & Results
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Experiments & Results");
    // Create a bar chart showing minADE comparison across methods
    const chartData = [
      {
        name: "minADE (m)",
        labels: ["UniAD", "PnPNet", "ViP3D", "Const Vel", "Const Pos"],
        values: [0.71, 1.15, 2.05, 2.13, 5.80],
      },
    ];
    slide.addChart(pptx.ChartType.bar, chartData, {
      x: 0.4,
      y: 2.0,
      w: 5.5,
      h: 2.5,
      barDir: "col",
      chartColors: ["4C72B0"],
      showLegend: false,
      valAxisMaxVal: 6.0,
      valAxisMinVal: 0.0,
      valAxisMajorUnit: 1.0,
      catAxisLabelColor: NEAR_BLACK_NAVY,
      valAxisLabelColor: NEAR_BLACK_NAVY,
      showValAxisTitle: true,
      valAxisTitle: "minADE (m)",
      // Display a title for the categorical (x) axis to clarify that labels correspond to different methods.
      showCatAxisTitle: true,
      catAxisTitle: "Method",
      catAxisLineShow: false,
      valAxisLineShow: false,
      valGridLine: { color: "E0E7F1" },
    });
    // Summary of improvements on the right
    slide.addShape(pptx.ShapeType.rect, {
      x: 6.2,
      y: 1.9,
      w: 3.7,
      h: 2.6,
      fill: { color: "F5F9FD" },
      line: { color: "D8E2F0" },
    });
    slide.addText(
      [
        { text: "Key Findings\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Reduces motion prediction error by 38.3% vs PnPNet and 65.4% vs ViP3D", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Improves occupancy IoU‑near by +4.0 and +2.0 compared to FIERY and BEVerse", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Cuts planning L2 error & collision rate by over 50% compared to ST‑P3", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 6.25,
        y: 2.0,
        w: 3.6,
        h: 2.5,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    renderCitations(slide, ["【517453676776078†L1020-L1034】", "【517453676776078†L1025-L1070】", "【517453676776078†L1030-L1142】"]);
  }

  // Slide 10: Conclusion & Future Work
  {
    const slide = pptx.addSlide();
    addSlideTitle(slide, "Conclusion & Future Work");
    // Left column: conclusion and future work summaries separated into two boxes
    const textBoxWidth = 5.8;
    // Conclusion section
    const conclusionY = 1.8;
    // Allocate a bit more vertical space for conclusion and future work sections to prevent text truncation.
    const conclusionHeight = 1.6;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: conclusionY,
      w: textBoxWidth,
      h: conclusionHeight,
      fill: { color: "F5F9FD" },
      line: { color: "D8E2F0" },
    });
    slide.addText(
      [
        { text: "Conclusion\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "UniAD unifies perception and prediction tasks with a planning‑oriented philosophy", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Query‑based design enables rich agent interactions and end‑to‑end optimisation", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Extensive experiments show superior performance and improved safety", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: conclusionY + 0.1,
        w: textBoxWidth - 0.1,
        h: conclusionHeight - 0.1,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // Future work section below conclusion
    const futureY = conclusionY + conclusionHeight + 0.2;
    const futureHeight = 1.6;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: futureY,
      w: textBoxWidth,
      h: futureHeight,
      fill: { color: "F5F9FD" },
      line: { color: "D8E2F0" },
    });
    slide.addText(
      [
        { text: "Future Work\n", options: { fontSize: FONT_SIZE.SECTION_TITLE, color: NEAR_BLACK_NAVY, bold: true } },
        { text: "Develop lightweight variants suitable for deployment on resource‑constrained platforms", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Integrate additional tasks such as depth estimation and behavior prediction", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
        { text: "Explore more efficient coordination between modules", options: { bullet: { indent: BULLET_INDENT }, fontSize: FONT_SIZE.TEXT, color: NEAR_BLACK_NAVY } },
      ],
      {
        x: 0.45,
        y: futureY + 0.1,
        w: textBoxWidth - 0.1,
        h: futureHeight - 0.1,
        wrap: true,
        paraSpaceAfter: FONT_SIZE.TEXT * 0.3,
      }
    );
    // Right side: abstract planning network image to reinforce theme
    slide.addImage({
      path: IMAGES.planningNetwork,
      ...imageSizingCrop(IMAGES.planningNetwork, 6.4, 2.1, 3.5, 2.5),
    });
    // Citations for conclusion and future work
    renderCitations(slide, ["【517453676776078†L1363-L1379】"]);
  }

  // Write the presentation file
  await pptx.writeFile({ fileName: "answer.pptx" });
})();
