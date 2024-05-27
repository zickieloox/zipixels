import {spawn} from 'child_process';
import fs from 'fs/promises';
import JSZip from 'jszip';
import path from 'path';

const JSON_FILE = 'images_data.json';

async function handleMergeDxfFiles(event, filePaths: string[]) {
  if (filePaths.length < 1) {
    return;
  }

  console.log('=== Received files paths in main process for MergeFiles:', filePaths);

  const currentDirectory = process.cwd();

  if (!currentDirectory.endsWith('tebpixels-be') && !currentDirectory.endsWith('tebpixels')) {
    process.chdir('..');
    console.log('Changed directory to the parent directory.');
  }

  const mainFilePath =
    process.platform === 'win32'
      ? 'src/tebpixels/dist/main/main.exe'
      : 'src/tebpixels/dist/main/main';
  const pythonProcess = spawn(mainFilePath, [
    '--action',
    'merge_dxf',
    '--file-paths',
    ...filePaths.map(filePath => encodeURIComponent(filePath)),
  ]);

  pythonProcess.stdout.on('data', async pyData => {
    event.reply('merge-files-progress', 0, filePaths.length);
    if (pyData.includes('Elapsed time')) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const outputZipPath = path.join(process.cwd(), 'data/data.zip');

      const zipData = await fs.readFile(outputZipPath);
      const zip = await new JSZip().loadAsync(zipData);
      const jsonFileContent = await zip.file(JSON_FILE)?.async('text');
      const dxfData = jsonFileContent ? JSON.parse(jsonFileContent) : null;

      if (dxfData) {
        for (let i = 0; i < dxfData.layers.length; i++) {
          if (!dxfData.layers[i] || dxfData.layers[i].name === 'background') {
            continue;
          }
          await processLayer(zip, dxfData.layers[i]);
        }

        event.reply('process-psd-done', {
          success: true,
          message: 'Process finished successfully',
          data: dxfData,
        });
        // sendToTebFactory(event);
      }
    }

    if (pyData.includes('Tracking process:')) {
      const processData = Buffer.from(pyData).toString();
      const process = processData.split('Tracking process:');
      const [processedFiles] = process.at(-1)!.trim().split('/');
      event.reply('merge-files-progress', processedFiles, filePaths.length);
    }
  });

  pythonProcess.stderr.on('data', pyError => {
    console.error(`Python process error: ${pyError}`);

    event.reply('process-psd-done', {
      success: false,
      message: 'Processing file failed',
    });
  });

  pythonProcess.on('close', code => {
    console.log(`Python process exited with code ${code}`);

    event.reply('process-psd-done', {
      success: false,
      message: 'Processing file failed',
    });
  });
}

const processLayer = async (zip: JSZip, layer) => {
  if (layer.children && layer.children.length > 0) {
    for (let i = 0; i < layer.children.length; i++) {
      await processLayer(zip, layer.children[i]);
    }
  } else if (layer.image_path) {
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
  }
};

// const sendToTebFactory = async (event: any) => {
// 	let requestId = '';
// 	const webp = await fs.readFile('data/output/images_data.json', 'utf8');
// 	const imagesData = JSON.parse(webp);

// 	const formData = new FormData();
// 	imagesData.forEach((item: any) => {
// 		const fileStream = fs.createReadStream(item.image_path);
// 		formData.append(`files`, fileStream, {
// 			filename: item.file_name
// 		});
// 	});

// 	const config = {
// 		method: 'post',
// 		maxBodyLength: Infinity,
// 		url: `${process.env.FACTORY_URL}/api/v1/order-items/bulk-update-mockups`,
// 		headers: {
// 			...formData.getHeaders()
// 		},
// 		data: formData
// 	};

// 	try {
// 		const response = await axios.request(config);
// 		requestId = response.data.data;
// 		event.reply('merged-files-complete', requestId);
// 	} catch (error) {
// 		console.log(error);
// 	}
// };

export {handleMergeDxfFiles};
