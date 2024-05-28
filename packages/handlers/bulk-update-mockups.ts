/* eslint-disable @typescript-eslint/ban-ts-comment */
import {spawn} from 'child_process';
import * as fs from 'fs';
import * as FormData from 'form-data';
import axios from 'axios';

async function handleBulkUpdateMockups(event, filePath: string): Promise<void> {
  console.log('=== Received file path in main process for BulkUpdateMockups:', filePath);

  const currentDirectory = process.cwd();
  if (!currentDirectory.endsWith('zipixels-be') && !currentDirectory.endsWith('zipixels')) {
    process.chdir('..');
    console.log('Changed directory to the parent directory.');
  }

  const mainFilePath =
    process.platform === 'win32'
      ? 'src/tebpixels/dist/main/main.exe'
      : 'src/tebpixels/dist/main/main';
  const pythonProcess = spawn(mainFilePath, ['--file_paths', filePath]);

  pythonProcess.stdout.on('data', async (pyData: Buffer) => {
    console.log(`Python process log: ${pyData}`);

    if (pyData.includes('Elapsed time')) {
      let requestId = '';
      const psd: string = fs.readFileSync('data/output/psd_data.json', 'utf8');
      const psdData = JSON.parse(psd);
      const flattenedItems = flattenItems(psdData);

      const formData = new FormData();
      flattenedItems.forEach(item => {
        //@ts-ignore
        const fileStream = fs.createReadStream(item.image_path);
        formData.append(`files`, fileStream, {
          filename: item.name.replace('#', ''),
        });
      });

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.FACTORY_URL}/api/v1/order-items/bulk-update-mockups`,
        headers: {
          ...formData.getHeaders(),
        },
        data: formData,
      };

      try {
        const response = await axios.request(config);
        requestId = response.data.data;
        event.reply('bulk-update-complete', requestId);
      } catch (error) {
        console.log(error);
      }
    }
  });

  pythonProcess.stderr.on('data', (pyError: Buffer) => {
    console.error(`Python process error: ${pyError}`);
  });

  pythonProcess.on('close', (code: number) => {
    console.log(`Python process exited with code ${code}`);
  });
}

interface Layer {
  name: string;
  image_path?: string;
  children?: Layer[];
}

function flattenItems(psd: {layers: Layer[]}): Layer[] {
  if (!psd) {
    return [];
  }

  let flattenedItems: Layer[] = [];
  psd.layers.forEach(layer => {
    flattenedItems.push(layer);
    if (layer.children) {
      flattenedItems.push(...layer.children);
    }
  });
  flattenedItems = flattenedItems.filter(item => item.name[0] === '#' && item.image_path);
  return flattenedItems;
}

export {handleBulkUpdateMockups};
