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
    
    const cols = 4;
    const rows = 6;
    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);
    
    let counter = 1;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellWidth;
        const y = r * cellHeight;
        
        const cell = image.clone().crop(x, y, cellWidth, cellHeight);
        cell.autocrop();
        
        if (cell.bitmap.width > 10 && cell.bitmap.height > 10) {
          const outputPath = path.join(outputDir, `new_hat_${counter}.png`);
          await cell.writeAsync(outputPath);
          console.log(`Saved ${outputPath} (${cell.bitmap.width}x${cell.bitmap.height})`);
          counter++;
        }
      }
    }
  } catch (err) {
    console.error('Error slicing image:', err);
  }
}

sliceImage();
