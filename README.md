# Planning‑Oriented Autonomous Driving Presentation

This repository showcases how an agentic AI can read a research paper, summarize its key points, and automatically generate a professional PowerPoint presentation. The workflow consists of four main steps:

1. **Read the Document**  
    The agent downloads or accesses the source document (PDF) and extracts its text for analysis.

2. **Summarize the Content**  
    Using language model capabilities, the agent identifies the document’s structure, key sections, and important details. Citations are recorded for later attribution in the slides.

3. **Generate Slides**  
    The agent uses a slide-generation library (PptxGenJS) to lay out each section on a slide, incorporating diagrams, charts, images, and bullet points for clarity. Citations are added as hyperlinked footnotes.

4. **Produce the PowerPoint File**  
    The JavaScript script is executed via Node.js to produce a `.pptx` file. Optionally, a Python script can convert the presentation into images for preview.

---

## Repository Files

| File                | Purpose                                                                                   |
|---------------------|-------------------------------------------------------------------------------------------|
| `answer.js`         | PptxGenJS script to construct the slide deck, define styles, layouts, and insert content. |
| `generate_ppt.sh`   | Bash script to run `answer.js` and produce `answer.pptx`.                                 |
| `README.md`         | This guide, explaining the workflow and usage.                                            |

---

## How to Run

1. **Install Dependencies**  
    Ensure Node.js is installed. Then, install required packages:

    ```bash
    npm install pptxgenjs @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons
    ```

2. **Generate the Presentation**  
    Run the provided Bash script:

    ```bash
    bash generate_ppt.sh
    ```

    This executes `node answer.js`, which reads image assets from the `cached_assets_used` folder and writes `answer.pptx` to the project root.

3. **Preview the Slides (Optional)**  
    Convert the PPTX to PNG images for visual inspection:

    ```bash
    python3 pptx_to_img.py --input answer.pptx --output preview_images
    ```

4. **Adjust & Iterate**  
    To refine the slides, edit `answer.js` (layouts, colors, images, charts, text). Rerun the Bash script to regenerate the presentation.

---

## Creating an Agentic AI

An agentic AI autonomously orchestrates multiple steps:

- **Reading**: Uses a PDF parser or search tool to extract text from the paper.
- **Summarizing**: Organizes extracted text into sections (e.g., Introduction, Methodology, Perception) and identifies key sentences. Records citation identifiers for linking footnotes.
- **Slide Design**:  
  - Chooses a narrative flow (title, outline, section slides, experiments, conclusion).
  - Draws diagrams (pipelines, grids) with PptxGenJS shapes.
  - Creates charts from numerical results, setting axis titles and colors.
  - Embeds images and ensures all elements fit within slide boundaries.
  - Appends citations as hyperlinked footnotes.
- **Generating the File**: Runs the JavaScript script to output a `.pptx` file. Optionally converts the PPTX to images or PDF for preview.

This modular approach enables the agent to digest complex documents and produce polished presentations autonomously.