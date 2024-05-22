import JSZip from 'jszip';
import path from 'path';
import { promises as fsPromises } from 'fs';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { S3 } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import axios from 'axios';

const { writeFile, readFile, readdir } = fsPromises;

const bucketName = process.env.S3_BUCKET_NAME!;
const endpoint = process.env.AWS_S3_ENDPOINT!;
const apiVersion = process.env.AWS_S3_API_VERSION!;
const bucketRegion = process.env.AWS_S3_BUCKET_REGION!;
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID!;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY!;
const dns = process.env.DNS!;

const s3 = new S3({
	endpoint: endpoint,
	apiVersion: apiVersion,
	region: bucketRegion,
	credentials: {
		accessKeyId: accessKeyId,
		secretAccessKey: secretAccessKey
	},
	requestHandler: new NodeHttpHandler({
		httpsAgent: new https.Agent({
			secureProtocol: 'TLSv1_2_method'
		})
	})
});

async function handleUploadToServer(event: any, fileName: string, fileSize: number): Promise<void> {
	try {
		const currentDirectory = process.cwd();
		const folderSlash = fileName.includes('/') ? '/' : '\\';
		const inputFolders = fileName.split(folderSlash).slice(0, -1);
		const inputFolder = folderSlash + path.join(...inputFolders);
		const outPutFolders = [currentDirectory, 'data', 'output'];
		const outPutFolder = path.join(...outPutFolders);
		const zipPath = await compressFolder(inputFolder, outPutFolder);

		if (!fileName || !fileSize) {
			throw new Error('Name and size is required');
		}

		const images = [];

		// * Upload Preview
		const currentTime = new Date().toLocaleDateString('en-ZA');
		const previewImagePath = path.join('data', 'output', 'export_image.png');
		let previewPublicURL = '';
		if (await readFile(previewImagePath)) {
			const previewFile = await readFile(path.join(previewImagePath));
			const previewWebp = await sharp(previewFile).webp().toBuffer();
			const randomPreviewKey = uuidv4();
			const previewKey = `${
				bucketName.split('/')[1]
			}/previews/${currentTime}/${randomPreviewKey}.webp`;
			const previewBucket = bucketName.split('/')[0];
			await s3.putObject({
				Bucket: previewBucket,
				Body: previewWebp,
				ACL: 'public-read',
				Key: previewKey,
				ContentType: `image/webp`
			});
			previewPublicURL = `${dns}/${encodeURI(previewKey)}`;
			images.push({
				bucket: previewBucket,
				key: previewKey
			});
		}

		// * Upload Zip
		let zipPublicURL = '';
		const uploadZip = false;
		if (uploadZip && zipPath && (await readFile(zipPath))) {
			const zipFile = await readFile(zipPath);
			const randomZipKey = uuidv4();
			const zipKey = `${bucketName.split('/')[1]}/zips/${currentTime}/${randomZipKey}.zip`;
			const zipBucket = bucketName.split('/')[0];
			await s3.putObject({
				Bucket: zipBucket,
				Body: zipFile,
				ACL: 'public-read',
				Key: zipKey,
				ContentType: `application/zip`
			});
			zipPublicURL = `${dns}/${encodeURI(zipKey)}`;
			images.push({
				bucket: zipBucket,
				key: zipKey
			});
		}

		// * PSD Data
		const psdDataPath = path.join('data', 'output', 'psd_data.json');
		const psdFile = await readFile(path.join(psdDataPath));
		const psdJson = JSON.parse(psdFile.toString());
		const { layers } = psdJson;

		const uploadedFilesPromise: any[] = [];
		for (const layer of layers) {
			if (layer.children) {
				await processChildren(layer.children, uploadedFilesPromise, images);
			}
		}
		await Promise.all(uploadedFilesPromise);
		psdJson.width = psdJson.width > 0 ? psdJson.width : 1000;
		psdJson.height = psdJson.height > 0 ? psdJson.height : 1000;

		const response = await axios.post('https://tebpixels.tebprint.com/upload', {
			name: fileName.replace('.psd', ''),
			fileSize: fileSize,
			psdData: JSON.stringify({ ...psdJson, layers: layers }),
			images: JSON.stringify(images),
			preview: previewPublicURL,
			width: psdJson.width,
			height: psdJson.height,
			zip: zipPublicURL
		});
		event.reply('process-psd-done', {
			success: true,
			message: 'Process finished successfully'
		});
	} catch (error) {
		console.log('Upload to server error:', error);
		event.reply('process-psd-done', {
			success: false,
			message: 'Upload to server failed' + error
		});
	}
}

const createZipFromFolder = async (dir: string) => {
	const filePaths = await getFilePathsRecursively(dir);
	const zip = new JSZip();

	for (const filePath of filePaths) {
		const fileData = await readFile(path.join(filePath.path, filePath.name), 'utf8'); // Adjust encoding if needed
		zip.file(filePath.name, fileData);
	}

	return zip;
};

const getFilePathsRecursively = async (dir: string) => {
	return await readdir(dir, { withFileTypes: true });
};

const compressFolder = async (srcDir: string, outPutFolders: string) => {
	const destFile = `${outPutFolders}/svg-file.zip`;
	const zip = await createZipFromFolder(srcDir);
	const zipData = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
	await writeFile(destFile, zipData);

	return destFile;
};

const processChildren = async (
	children: any[],
	uploadedFiles: any[] = [],
	uploadedImages: any[]
) => {
	const folderPath = './';
	const currentTime = new Date().toLocaleDateString('en-ZA');
	const bucket = bucketName.split('/')[0];
	const bucketFolder = bucketName.split('/')[1];
	for (const child of children) {
		if (child.image_path) {
			const file = await readFile(path.join(folderPath, child.image_path));
			const randomKey = uuidv4();
			const extension = child.image_path.split('.').at(-1);
			const key = `${bucketFolder}/images/${currentTime}/${randomKey}.${extension}`;

			const uploadedFilePromise = s3.putObject({
				Bucket: bucket,
				Body: file,
				ACL: 'public-read',
				Key: key,
				ContentType: `image/${extension}`
			});

			uploadedFiles.push(uploadedFilePromise);

			const s3PublicURL = `${dns}/${encodeURI(key)}`;
			uploadedImages.push({
				bucket: bucket,
				key: key
			});
			child.image_path = s3PublicURL;
		}
		if (child.thumb_image_path && child.kind !== 'type') {
			const file = await readFile(path.join(folderPath, child.thumb_image_path));
			const randomKey = uuidv4();
			const extension = child.thumb_image_path.split('.').at(-1);
			const key = `${bucketFolder}/thumbnails/${currentTime}/${randomKey}.${extension}`;

			const uploadedFilePromise = s3.putObject({
				Bucket: bucket,
				Body: file,
				ACL: 'public-read',
				Key: key,
				ContentType: `image/${extension}`
			});

			uploadedFiles.push(uploadedFilePromise);

			const s3PublicURL = `${dns}/${encodeURI(key)}`;
			uploadedImages.push({
				bucket: bucket,
				key: key
			});
			child.thumb_image_path = s3PublicURL;
		}
		if (child.crop_image_path && child.kind !== 'type') {
			const file = await readFile(path.join(folderPath, child.crop_image_path));
			const randomKey = uuidv4();
			const extension = child.crop_image_path.split('.').at(-1);
			const key = `${bucketFolder}/crop/${currentTime}/${randomKey}.${extension}`;

			const uploadedFilePromise = s3.putObject({
				Bucket: bucket,
				Body: file,
				ACL: 'public-read',
				Key: key,
				ContentType: `image/${extension}`
			});

			uploadedFiles.push(uploadedFilePromise);

			const s3PublicURL = `${dns}/${encodeURI(key)}`;
			uploadedImages.push({
				bucket: bucket,
				key: key
			});
			child.crop_image_path = s3PublicURL;
		}

		if (child.svg_path && child.kind !== 'type') {
			const file = await readFile(path.join(folderPath, child.svg_path));
			const randomKey = uuidv4();
			const extension = child.svg_path.split('.').at(-1);
			const key = `${bucketFolder}/svg/${currentTime}/${randomKey}.${extension}`;

			const uploadedFilePromise = s3.putObject({
				Bucket: bucket,
				Body: file,
				ACL: 'public-read',
				Key: key,
				ContentType: `image/${extension}`
			});

			uploadedFiles.push(uploadedFilePromise);

			const s3PublicURL = `${dns}/${encodeURI(key)}`;
			uploadedImages.push({
				bucket: bucket,
				key: key
			});
			child.svg_path = s3PublicURL;
		}

		if (child.children) {
			await processChildren(child.children, uploadedFiles);
		}
	}
};

export { handleUploadToServer };
