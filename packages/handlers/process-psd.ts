/* eslint-disable @typescript-eslint/ban-ts-comment */
import {spawn} from 'child_process';
import {promises as fs} from 'fs';
import JSZip from 'jszip';
import path from 'path';

const JSON_FILE = 'psd_data.json';

interface Layer {
  name: string;
  children?: Layer[];
  image_path?: string;
  thumb_image_path?: string;
}

async function handleProcessPsd(event, filePath: string) {
  if (!filePath) {
    return;
  }

  console.log('=== Received files paths in main process for ProcessPSD:', filePath);
  const currentDirectory = process.cwd();

  if (!currentDirectory.endsWith('tebpixels-be') && !currentDirectory.endsWith('tebpixels')) {
    process.chdir('..');
    console.log('Changed directory to the parent directory.');
  }

  const outputZipPath = path.join(process.cwd(), 'data/data.zip');
  const pythonProcess = spawn('python', ['src/tebpixels/main2.py', '--file-paths', filePath]);

  const stdout = pythonProcess.stdout;
  const stderr = pythonProcess.stderr;

  stdout.on('data', async (data: Buffer) => {
    console.log(`stdout: ${data}`);
    event.reply('on-log', data.toString());

    if (data.includes('processed:')) {
      event.reply('processing-layers', {
        success: true,
        message: 'Processing',
        data: data.toString().split('processed:')[1].trim(),
      });
    }

    if (data.includes('Elapsed time')) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const zipData = await fs.readFile(outputZipPath);
      const zip = await JSZip().loadAsync(zipData);
      const jsonFileContent = await zip.file(JSON_FILE)?.async('text');
      if (!jsonFileContent) {
        throw new Error('JSON file not found in zip.');
      }
      const psdData = JSON.parse(jsonFileContent);

      for (let i = 0; i < psdData.layers.length; i++) {
        if (!psdData.layers[i] || psdData.layers[i].name === 'background') {
          continue;
        }

        await processLayer(zip, psdData.layers[i]);
      }

      event.reply('process-psd-done', {
        success: true,
        message: 'Process finished successfully',
        data: psdData,
      });
    }

    if (data.includes('Traceback')) {
      event.reply('process-psd-done', {
        success: false,
        message: 'Processing file failed',
      });
    }
  });

  stderr.on('data', (data: Buffer) => {
    console.error(`stderr: ${data}`);
    event.reply('on-log', data.toString());

    if (!data.includes('Divider')) {
      event.reply('process-psd-done', {
        success: false,
        message: 'Processing file failed',
      });
    }
  });
}

const processLayer = async (zip: JSZip, layer: Layer) => {
  if (layer.children && layer.children.length > 0) {
    for (let i = 0; i < layer.children.length; i++) {
      await processLayer(zip, layer.children[i]);
    }
  } else if (layer.image_path) {
    //@ts-ignore
    const imagePaths = layer.image_path.replaceAll('\\', '/').split('/');

    if (imagePaths.length > 3) {
      const imagePath = [imagePaths[imagePaths.length - 2], imagePaths[imagePaths.length - 1]].join(
        '/',
      );

      const imageBlob = await zip.file(imagePath)?.async('base64');

      if (imageBlob) {
        layer.image_path = 'data:image/png;base64,' + imageBlob;
      }
    }

    //@ts-ignore
    const thumbPaths = layer.thumb_image_path?.replaceAll('\\', '/').split('/');

    if (thumbPaths && thumbPaths.length > 3) {
      const thumbPath = [thumbPaths[thumbPaths.length - 2], thumbPaths[thumbPaths.length - 1]].join(
        '/',
      );

      const imageBlob = await zip.file(thumbPath)?.async('base64');

      if (imageBlob) {
        layer.thumb_image_path = 'data:image/png;base64,' + imageBlob;
      }
    }
  }
};

export {handleProcessPsd};
