const fs = require('fs');
const path = require('path');

// This script helps generate Android icons from the main logo
// You'll need to manually create the icon files or use an online icon generator

const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

console.log('Icon generation guide:');
console.log('=====================');
console.log('');
console.log('To generate Android icons from main_logo_icon.jpeg:');
console.log('');
console.log('1. Use an online icon generator like:');
console.log('   - https://appicon.co/');
console.log('   - https://www.appicon.co/');
console.log('   - https://makeappicon.com/');
console.log('');
console.log('2. Upload main_logo_icon.jpeg');
console.log('3. Generate icons for the following sizes:');
console.log('');

Object.entries(iconSizes).forEach(([folder, size]) => {
  console.log(`   ${folder}: ${size}x${size}px`);
});

console.log('');
console.log('4. Replace the following files in android/app/src/main/res/:');
console.log('   - mipmap-*/ic_launcher.webp');
console.log('   - mipmap-*/ic_launcher_foreground.webp');
console.log('   - mipmap-*/ic_launcher_round.webp');
console.log('');
console.log('5. Update the adaptive icon XML files if needed');
console.log('');
console.log('Note: The app.json has been updated to use main_logo_icon.jpeg');
console.log('You may need to rebuild the app after updating the icons.'); 