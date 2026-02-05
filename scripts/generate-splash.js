/**
 * Generate Splash Screen
 *
 * Creates a splash screen image with the Palletium logo centered on a dark background.
 *
 * Prerequisites: npm install sharp --save-dev
 * Usage: node scripts/generate-splash.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Splash screen dimensions (iPhone 14 Pro Max)
const WIDTH = 1284;
const HEIGHT = 2778;
const BACKGROUND_COLOR = { r: 22, g: 25, b: 34, alpha: 1 }; // #161922

// Logo will be 60% of screen width
const LOGO_WIDTH_PERCENT = 0.6;

async function generateSplash() {
  const logoPath = path.join(__dirname, '../assets/images/logo.png');
  const outputPath = path.join(__dirname, '../assets/images/splash.png');

  // Check if logo exists
  if (!fs.existsSync(logoPath)) {
    console.error('Error: Logo file not found at:', logoPath);
    console.log('Please save the Palletium wordmark logo to assets/images/logo.png');
    process.exit(1);
  }

  const logoWidth = Math.floor(WIDTH * LOGO_WIDTH_PERCENT);

  console.log('Generating splash screen...');
  console.log(`  Dimensions: ${WIDTH}x${HEIGHT}`);
  console.log(`  Background: #161922`);
  console.log(`  Logo width: ${logoWidth}px`);

  try {
    // Resize logo maintaining aspect ratio
    const resizedLogo = await sharp(logoPath)
      .resize(logoWidth, null, { fit: 'inside' })
      .toBuffer();

    // Get resized logo metadata
    const logoMeta = await sharp(resizedLogo).metadata();
    const logoHeight = logoMeta.height || 100;

    // Calculate center position
    const left = Math.floor((WIDTH - logoWidth) / 2);
    const top = Math.floor((HEIGHT - logoHeight) / 2);

    // Create background and composite logo
    await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })
      .composite([
        {
          input: resizedLogo,
          left,
          top,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`Splash screen saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error generating splash:', error.message);
    process.exit(1);
  }
}

generateSplash();
