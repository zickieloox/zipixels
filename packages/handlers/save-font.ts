import * as fs from 'fs';

async function handleSaveFont(fontData, fontName: string): Promise<void> {
  const currentDirectory = process.cwd();
  if (!currentDirectory.endsWith('tebpixels-be') && !currentDirectory.endsWith('tebpixels')) {
    process.chdir('..');
  }

  const filePath = `data/fonts/${fontName}.ttf`;
  if (fs.existsSync(filePath)) {
    console.log('Font file already exists:', filePath);
    return;
  }

  fs.writeFile(filePath, fontData, err => {
    if (err) {
      console.error('Error saving font file:', err);
    } else {
      console.log('Font file saved successfully:', filePath);
    }
  });
}

export {handleSaveFont};
