const sharp = require('sharp');
const fs = require('fs');

async function createOgImage() {
    try {
        await sharp({
            create: {
                width: 1200,
                height: 630,
                channels: 4,
                background: { r: 248, g: 250, b: 252, alpha: 1 } // #f8fafc
            }
        })
        .composite([
            { input: 'public/icons/icon-512x512.png', gravity: 'center' }
        ])
        .png()
        .toFile('public/og-image.png');
        console.log('Successfully created public/og-image.png');
    } catch (e) {
        console.error('Error generating image:', e);
    }
}

createOgImage();
