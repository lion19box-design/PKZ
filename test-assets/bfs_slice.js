const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const inputPath = 'new_hats.png';
const outputDir = '../public/assets/hats';

async function sliceImage() {
  const image = await Jimp.read(inputPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const visited = new Uint8Array(width * height);
  
  const components = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      
      const pxIdx = idx * 4;
      if (image.bitmap.data[pxIdx + 3] > 10) {
        let minX = x, maxX = x, minY = y, maxY = y;
        const queue = [[x, y]];
        visited[idx] = 1;
        
        let head = 0;
        while(head < queue.length) {
          const [cx, cy] = queue[head++];
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          
          const neighbors = [
            [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1],
            [cx-1, cy-1], [cx+1, cy-1], [cx-1, cy+1], [cx+1, cy+1]
          ];
          for(const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx]) {
                // Pre-mark visited to avoid queue explosion
                visited[nIdx] = 1;
                if (image.bitmap.data[nIdx * 4 + 3] > 10) {
                  queue.push([nx, ny]);
                }
              }
            }
          }
        }
        components.push({minX, maxX, minY, maxY});
      } else {
        visited[idx] = 1; // Mark transparent as visited
      }
    }
  }
  
  components.sort((a, b) => {
    const cyA = (a.minY + a.maxY)/2;
    const cyB = (b.minY + b.maxY)/2;
    if (Math.abs(cyA - cyB) < 80) {
      return a.minX - b.minX;
    }
    return cyA - cyB;
  });

  let counter = 1;
  for (const comp of components) {
    const w = comp.maxX - comp.minX + 1;
    const h = comp.maxY - comp.minY + 1;
    if (w > 20 && h > 20) {
      const cell = image.clone().crop(comp.minX, comp.minY, w, h);
      await cell.writeAsync(path.join(outputDir, `hat_${counter}.png`));
      console.log(`Saved hat_${counter}.png`);
      counter++;
    }
  }
  console.log(`Sliced ${counter-1} hats using BFS!`);
}

sliceImage();
