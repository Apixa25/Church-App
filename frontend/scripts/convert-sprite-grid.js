/**
 * Convert Sprite Grid to Horizontal Strip
 *
 * This script takes a sprite sheet arranged in a grid (e.g., 2 rows x 4 columns)
 * and converts it to a horizontal strip (1 row x 8 columns).
 *
 * Usage: node scripts/convert-sprite-grid.js <input-image> <output-image> [columns] [rows]
 *
 * Example: node scripts/convert-sprite-grid.js worshiper-grid.png worshiper.png 4 2
 *
 * Requires: npm install canvas
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function convertGridToStrip(inputPath, outputPath, gridCols = 4, gridRows = 2) {
  console.log(`Loading image: ${inputPath}`);

  const image = await loadImage(inputPath);
  const totalWidth = image.width;
  const totalHeight = image.height;

  // Calculate frame dimensions
  const frameWidth = Math.floor(totalWidth / gridCols);
  const frameHeight = Math.floor(totalHeight / gridRows);
  const totalFrames = gridCols * gridRows;

  console.log(`Input image: ${totalWidth}x${totalHeight}`);
  console.log(`Grid: ${gridCols} columns x ${gridRows} rows = ${totalFrames} frames`);
  console.log(`Frame size: ${frameWidth}x${frameHeight}`);

  // Create output canvas (horizontal strip)
  const outputWidth = frameWidth * totalFrames;
  const outputHeight = frameHeight;
  const canvas = createCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d');

  console.log(`Output image: ${outputWidth}x${outputHeight}`);

  // Copy each frame from grid to horizontal strip
  let frameIndex = 0;
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const srcX = col * frameWidth;
      const srcY = row * frameHeight;
      const destX = frameIndex * frameWidth;

      ctx.drawImage(
        image,
        srcX, srcY, frameWidth, frameHeight,  // Source rectangle
        destX, 0, frameWidth, frameHeight      // Destination rectangle
      );

      console.log(`  Frame ${frameIndex + 1}: (${srcX},${srcY}) -> (${destX},0)`);
      frameIndex++;
    }
  }

  // Save output
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`\nSaved: ${outputPath}`);
  console.log(`\nDatabase update command:`);
  console.log(`UPDATE worship_avatars SET frame_count = ${totalFrames}, frame_width = ${frameWidth}, frame_height = ${frameHeight} WHERE name = 'Worshiper';`);
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node convert-sprite-grid.js <input-image> <output-image> [columns] [rows]');
  console.log('');
  console.log('Example: node convert-sprite-grid.js worshiper-grid.png worshiper.png 4 2');
  console.log('');
  console.log('Default: 4 columns, 2 rows (8 frames total)');
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);
const cols = parseInt(args[2]) || 4;
const rows = parseInt(args[3]) || 2;

convertGridToStrip(inputPath, outputPath, cols, rows).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
