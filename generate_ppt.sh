#!/bin/bash

# Simple helper script to generate the PowerPoint file from the provided
# JavaScript template.  It assumes Node.js and PptxGenJS are installed.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR" || exit 1

echo "Generating presentation..."
node answer.js
echo "Presentation generated: answer.pptx"