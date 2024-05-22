import { spawn } from 'child_process';
import fs from 'fs/promises';
import JSZip from 'jszip';
import FormData from 'form-data';
import axios from 'axios';
import path from 'path';

const JSON_FILE = 'images_data.json';

async function handleMergeAiFiles(
	event: any,
	filePaths: string[],
	width?: number,
	height?: number,
	offset?: number
) {
	if (filePaths.length < 1) {
		return;
	}

	console.log('=== Received files paths in main process for Merge ai files:', filePaths);

	const currentDirectory = process.cwd();

	if (!currentDirectory.endsWith('tebpixels-be') && !currentDirectory.endsWith('tebpixels')) {
		process.chdir('..');
		console.log('Changed directory to the parent directory.');
	}

	const args = [
		'--action',
		'merge_ai',
		'--file-paths',
		...filePaths.map((filePath) => encodeURIComponent(filePath))
	];

	if (width !== undefined) {
		args.push('--width', width.toString());
	}
	if (height !== undefined) {
		args.push('--height', height.toString());
	}
	if (offset !== undefined) {
		args.push('--offset', offset.toString());
	}

	const mainFilePath =
		process.platform === 'win32'
			? 'src/tebpixels/dist/main/main.exe'
			: 'src/tebpixels/dist/main/main';
	const pythonProcess = spawn(mainFilePath, args);

	pythonProcess.stdout.on('data', async (pyData) => {
		console.log(`Python process log: ${pyData}`);

		event.reply('processing-layers', {
			success: true,
			message: 'Processing',
			data: filePaths.length
		});

		if (pyData.includes('Files to merge:')) {
			// Your logic here
		}

		if (pyData.includes('Elapsed time')) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const outputZipPath = path.join(process.cwd(), 'data/data.zip');

			const zipData = await fs.readFile(outputZipPath);
			const zip = await JSZip.loadAsync(zipData);
			const jsonFileContent = await zip.file(JSON_FILE)?.async('text');
			const psdData = jsonFileContent ? JSON.parse(jsonFileContent) : null;

			if (psdData) {
				for (let i = 0; i < psdData.layers.length; i++) {
					if (!psdData.layers[i] || psdData.layers[i].name === 'background') {
						continue;
					}
					await processLayer(zip, psdData.layers[i]);
				}

				event.reply('process-psd-done', {
					success: true,
					message: 'Process finished successfully',
					data: psdData
				});

				// sendToTebFactory(event);
			}
		}

		if (pyData.includes('Tracking process:')) {
			const processData = Buffer.from(pyData).toString();
			const process = processData.split('Tracking process:');
			const [processedFiles, totalFiles] = process.at(-1).trim().split('/');
			event.reply('merge-files-progress', processedFiles, filePaths.length);
		}
	});

	pythonProcess.stderr.on('data', (pyError) => {
		console.error(`Python process error: ${pyError}`);

		event.reply('process-psd-done', {
			success: false,
			message: 'Processing file failed'
		});
	});

	pythonProcess.on('close', (code) => {
		console.log(`Python process exited with code ${code}`);

		event.reply('process-psd-done', {
			success: false,
			message: 'Processing file failed'
		});
	});
}

const processLayer = async (zip: JSZip, layer: any) => {
	if (layer.children && layer.children.length > 0) {
		for (let i = 0; i < layer.children.length; i++) {
			await processLayer(zip, layer.children[i]);
		}
	} else if (layer.image_path) {
		const imagePaths = layer.image_path.replaceAll('\\', '/').split('/');

		if (imagePaths.length > 3) {
			const imagePath = [imagePaths[imagePaths.length - 2], imagePaths[imagePaths.length - 1]].join(
				'/'
			);

			const imageBlob = await zip.file(imagePath)?.async('base64');

			if (imageBlob) {
				layer.image_path = 'data:image/png;base64,' + imageBlob;
			}
		}
	}
};

const sendToTebFactory = async (event: any) => {
	let requestId = '';
	const webp = await fs.readFile('data/output/images_data.json', 'utf8');
	const imagesData = JSON.parse(webp);

	const formData = new FormData();
	imagesData.forEach((item: any) => {
		const fileStream = fs.createReadStream(item.image_path);
		formData.append(`files`, fileStream, {
			filename: item.file_name
		});
	});

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${process.env.FACTORY_URL}/api/v1/order-items/bulk-update-mockups`,
		headers: {
			...formData.getHeaders()
		},
		data: formData
	};

	try {
		const response = await axios.request(config);
		requestId = response.data.data;
		event.reply('merged-ai-files-complete', requestId);
	} catch (error) {
		console.log(error);
	}
};

export { handleMergeAiFiles };
