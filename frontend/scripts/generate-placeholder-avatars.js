/**
 * Generate Placeholder Avatar Sprite Sheets
 *
 * This script creates simple colored silhouette sprites for testing.
 * These should be replaced with proper pixel art sprites later.
 *
 * Run with: node scripts/generate-placeholder-avatars.js
 *
 * Requires: npm install canvas
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Avatar definitions matching the database entries
const avatars = [
  { name: 'worshiper', frames: 8, color: '#8B5CF6', label: 'W' },  // Purple
  { name: 'dancer', frames: 8, color: '#EC4899', label: 'D' },     // Pink
  { name: 'singer', frames: 6, color: '#F59E0B', label: 'S' },     // Orange
  { name: 'clapper', frames: 4, color: '#10B981', label: 'C' },    // Green
  { name: 'swayer', frames: 6, color: '#3B82F6', label: 'Y' },     // Blue
  { name: 'jumper', frames: 8, color: '#EF4444', label: 'J' },     // Red
];

const FRAME_SIZE = 64;

function generateSpriteSheet(avatar) {
  const width = avatar.frames * FRAME_SIZE;
  const height = FRAME_SIZE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw each frame
  for (let i = 0; i < avatar.frames; i++) {
    const x = i * FRAME_SIZE;

    // Create animation effect - simple bounce
    const bounceOffset = Math.sin((i / avatar.frames) * Math.PI * 2) * 5;
    const scaleVariation = 1 + Math.sin((i / avatar.frames) * Math.PI * 2) * 0.05;

    // Draw circular avatar body
    const centerX = x + FRAME_SIZE / 2;
    const centerY = FRAME_SIZE / 2 + bounceOffset;
    const radius = 24 * scaleVariation;

    // Body gradient
    const gradient = ctx.createRadialGradient(
      centerX - 5, centerY - 5, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, lightenColor(avatar.color, 30));
    gradient.addColorStop(1, avatar.color);

    // Draw body
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw outline
    ctx.strokeStyle = darkenColor(avatar.color, 20);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw face/label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatar.label, centerX, centerY);

    // Draw simple arms based on frame for animation
    ctx.strokeStyle = avatar.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const armAngle = (i / avatar.frames) * Math.PI * 2;
    const leftArmY = centerY + Math.sin(armAngle) * 8;
    const rightArmY = centerY + Math.sin(armAngle + Math.PI) * 8;

    // Left arm
    ctx.beginPath();
    ctx.moveTo(centerX - radius + 5, centerY);
    ctx.lineTo(centerX - radius - 10, leftArmY - 10);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(centerX + radius - 5, centerY);
    ctx.lineTo(centerX + radius + 10, rightArmY - 10);
    ctx.stroke();
  }

  return canvas;
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'public', 'avatars');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating placeholder avatar sprites...');

  for (const avatar of avatars) {
    const canvas = generateSpriteSheet(avatar);
    const outputPath = path.join(outputDir, `${avatar.name}.png`);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`  Created: ${avatar.name}.png (${avatar.frames} frames, ${canvas.width}x${canvas.height})`);
  }

  console.log('\nDone! Placeholder sprites created in public/avatars/');
  console.log('\nNote: These are simple placeholders. Replace with proper');
  console.log('pixel art sprites for production use.');
}

main().catch(console.error);
