const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const inputPath = 'Adobe Express - file.png';
const outputDir = 'new3hats';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function sliceImage() {
  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Find empty rows
    const rowHasAlpha = new Array(height).fill(false);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        if (image.bitmap.data[idx + 3] > 0) {
          rowHasAlpha[y] = true;
          break;
        }
      }
    }
    
    // Find empty columns
    const colHasAlpha = new Array(width).fill(false);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const idx = (width * y + x) << 2;
        if (image.bitmap.data[idx + 3] > 0) {
          colHasAlpha[x] = true;
          break;
        }
      }
    }
    
    // Group into ranges
    function getRanges(arr) {
      const ranges = [];
      let start = -1;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] && start === -1) start = i;
        else if (!arr[i] && start !== -1) {
          ranges.push({start, end: i - 1});
          start = -1;
        }
      }
      if (start !== -1) ranges.push({start, end: arr.length - 1});
      return ranges;
    }
    
    const rowRanges = getRanges(rowHasAlpha);
    const colRanges = getRanges(colHasAlpha);
    
    let counter = 1;
    
    for (const r of rowRanges) {
      for (const c of colRanges) {
        const w = c.end - c.start + 1;
        const h = r.end - r.start + 1;
        
        // Skip tiny artifacts
        if (w < 10 || h < 10) continue;
        
        const cell = image.clone().crop(c.start, r.start, w, h);
        cell.autocrop();
        
        const outputPath = path.join(outputDir, `hat_${counter}.png`);
        await cell.writeAsync(outputPath);
        console.log(`Saved ${outputPath} (${cell.bitmap.width}x${cell.bitmap.height})`);
        counter++;
      }
    }
    console.log(`Done! Sliced ${counter - 1} hats.`);
  } catch (err) {
    console.error('Error slicing image:', err);
  }
}

sliceImage();
