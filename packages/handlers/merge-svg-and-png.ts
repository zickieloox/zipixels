import { SVG, registerWindow } from '@svgdotjs/svg.js';
import base64Img from 'base64-img';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { createSVGWindow } from 'svgdom';

interface SVGDimension {
	filePath: string;
	width: number;
	height: number;
	group: any; // replace 'any' with specific SVG.js types if possible
	scale: number;
}

interface ImageDimension {
	filePath: string;
	width: number;
	height: number;
	file: sharp.Sharp;
	buffer: Buffer;
}

async function handleMergeSVGAndPNG(event: any, filePaths: string[], width = 0, height = 0) {
	if (filePaths.length < 1) {
		return;
	}

	console.log('=== Received files paths in main process for Merge SVG and PNG:', filePaths);

	const startTime = Date.now();
	const gap = 10;
	const svgFilePaths = filePaths.filter((file) => file.endsWith('.svg'));
	const pngFilePaths = filePaths.filter((file) => file.endsWith('.png'));

	try {
		await Promise.all([
			mergeSVG(svgFilePaths, width, height, gap),
			mergePNG(pngFilePaths, width, height, gap)
		]);
	} catch (error) {
		event.reply('process-psd-done', {
			success: true,
			message: 'Process finished failed'
		});
		console.log('Merge SVG and PNG error:', error);
	}

	console.log('Elapsed time: ' + (Date.now() - startTime) + 'ms');

	event.reply('process-psd-done', {
		success: true,
		message: 'Process finished successfully'
	});
}

async function mergeSVG(filePaths: string[], inputWidth = 0, inputHeight = 0, gap = 10) {
	if (filePaths.length < 1) {
		return;
	}

	const filePathLayers: Record<string, string[]> = {};
	for (const filePath of filePaths) {
		const layerHastag = filePath?.split('#').at(-1).replace('.svg', '') || '0';
		filePathLayers[layerHastag] = [...(filePathLayers[layerHastag] || []), filePath];
	}

	await Promise.all(
		Object.keys(filePathLayers).map((key) => {
			const outputPath = `data/export/meged-#${key}`;

			return mergeSVGByLayer(filePathLayers[key], inputWidth, inputHeight, gap, outputPath);
		})
	);
}

async function mergeSVGByLayer(
	filePaths: string[],
	inputWidth: number,
	inputHeight: number,
	gap: number,
	outputPath: string
) {
	const window = createSVGWindow();
	const document = window.document;
	registerWindow(window, document);
	const canvas = SVG(document.documentElement);
	const svg = SVG();

	const sortedSVGs = await sortSVGsByDimensions(filePaths, document, canvas);
	const { mergedGroupFiles, fileWidth, fileHeight } = await divideSVGsIntoGroups(
		sortedSVGs,
		inputWidth,
		inputHeight,
		gap
	);

	for (let i = 0; i < mergedGroupFiles.length; i++) {
		const mergedGroupFile = mergedGroupFiles[i];
		svg.clear();

		for (const file of mergedGroupFile) {
			const { filePath, left, top, group } = file;
			const groupName = filePath.split('/').at(-1).replace('.svg', '');
			group.id(groupName);
			group.move(left, top);
			svg.add(group);
		}

		drawGuideLine(svg, fileWidth - gap, fileHeight - gap, gap);
		svg.viewbox(0, 0, fileWidth, fileHeight);
		const rawItemSvgString = svg.svg();
		const rawBase64Data =
			'data:image/svg+xml;base64,' + Buffer.from(rawItemSvgString).toString('base64');
		base64Img.imgSync(
			rawBase64Data,
			'.',
			`${outputPath}${mergedGroupFiles.length > 1 ? `-${i}` : ''}`
		);
	}
}

async function drawGuideLine(svg: any, svgWidth: number, svgHeight: number, gap: number) {
	const width = svgWidth + gap;
	const height = svgHeight + gap;
	svg.line(0, 0, width, 0).stroke({ color: 'red', width: 3 });
	svg.line(width, 0, width, height).stroke({ color: 'red', width: 3 });
	svg.line(width, height, 0, height).stroke({ color: 'red', width: 3 });
	svg.line(0, height, 0, 0).stroke({ color: 'red', width: 3 });

	svg.line(gap, gap, width - gap, gap).stroke({ color: 'red', width: 3 });
	svg.line(width - gap, gap, width - gap, height - gap).stroke({ color: 'red', width: 3 });
	svg.line(width - gap, height - gap, gap, height - gap).stroke({ color: 'red', width: 3 });
	svg.line(gap, height - gap, gap, gap).stroke({ color: 'red', width: 3 });
}

async function mergePNG(filePaths: string[], inputWidth = 0, inputHeight = 0, gap = 10) {
	if (filePaths.length < 1) {
		return;
	}

	const filePathLayers: Record<string, string[]> = {};
	for (const filePath of filePaths) {
		const layerHastag = filePath?.split('#').at(-1).replace('.svg', '') || '0';
		filePathLayers[layerHastag] = [...(filePathLayers[layerHastag] || []), filePath];
	}

	await Promise.all(
		Object.keys(filePathLayers).map((key) => {
			const outputPath = `data/export/meged-#${key}`;

			return mergePNGByLayer(filePathLayers[key], inputWidth, inputHeight, gap, outputPath);
		})
	);
}

async function mergePNGByLayer(
	filePaths: string[],
	inputWidth: number,
	inputHeight: number,
	gap: number,
	outputPath: string
) {
	const sortedImages = await sortImagesByDimensions(filePaths);
	const { mergedGroupFiles, fileWidth, fileHeight } = divideImagesIntoGroups(
		sortedImages,
		inputWidth,
		inputHeight,
		gap
	);

	for (let i = 0; i < mergedGroupFiles.length; i++) {
		const mergedGroupFile = mergedGroupFiles[i];
		const mergedImage = sharp({
			create: {
				width: Number(fileWidth),
				height: Number(fileHeight),
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 }
			}
		});
		const compositeImages = mergedGroupFile.map((img) => ({
			input: img.buffer,
			left: img.left,
			top: img.top,
			blend: 'over'
		}));
		await mergedImage
			.composite(compositeImages)
			.png()
			.toFile(`${outputPath}${mergedGroupFiles.length > 1 ? `-${i}` : ''}`);
	}
}

async function getSVGDimensions(
	filePath: string,
	document: Document,
	canvas: any
): Promise<SVGDimension | null> {
	try {
		const svgString = await fs.readFile(filePath, 'utf-8');
		canvas.clear();
		canvas.svg(svgString);

		const svg = SVG();
		const group = svg.group();
		const rasterImage = document.querySelector(`path`);
		group.add(rasterImage);
		const transform = rasterImage.getAttribute('transform');
		const scale = transform ? Number(transform.split('(')[1].split(')')[0]) : 1;

		const { width, height } = group.bbox();
		return { filePath, width, height, group, scale };
	} catch (error) {
		console.error('Error:', error.message);
		return null;
	}
}

async function sortSVGsByDimensions(
	filePaths: string[],
	document: Document,
	canvas: any
): Promise<SVGDimension[]> {
	const dimensions: SVGDimension[] = [];

	for (const filePath of filePaths) {
		const dimension = await getSVGDimensions(filePath, document, canvas);
		if (dimension !== null) {
			dimensions.push(dimension);
		}
	}

	dimensions.sort((a, b) => {
		// Sort by height and then width
		if (a.height === b.height) {
			return a.width - b.width;
		}
		return a.height - b.height;
	});

	return dimensions;
}

async function divideSVGsIntoGroups(
	sortedSVGs: SVGDimension[],
	totalWidth: number,
	maxHeight: number,
	gap: number
) {
	if (totalWidth < 0 || maxHeight < 0) {
		return;
	}

	const totalWidthWithoutGuideLine = totalWidth - gap * 2;
	const totalHeightWithoutGuideLine = maxHeight - gap * 2;
	const groups: SVGDimension[][] = [];
	let currentGroup: SVGDimension[] = [];
	let currentX = gap * 2;
	let currentY: number | null = null;

	for (const item of sortedSVGs) {
		const { width, height } = item;

		if (width > totalWidthWithoutGuideLine || height > totalHeightWithoutGuideLine) {
			throw new Error('SVG is too large');
		}

		if (currentY === null) {
			currentY = maxHeight - gap * 2 - height;
		}

		if (currentX + width > totalWidthWithoutGuideLine) {
			currentX = gap * 2;
			currentY = currentY - height - gap;
		}

		if (currentY < 0) {
			groups.push(currentGroup);
			currentGroup = [];
			currentY = maxHeight - gap * 2 - height;
		}

		let scaleGap = 0;
		if (item.scale !== 1) {
			scaleGap = Math.floor((gap / item.scale) * 0.9);
		}

		currentGroup.push({ ...item, left: currentX, top: currentY - scaleGap });
		currentX = currentX + width + gap;
	}

	if (currentGroup.length > 0) groups.push(currentGroup);
	return { mergedGroupFiles: groups, fileWidth: totalWidth, fileHeight: maxHeight };
}

async function getImageDimensions(filePath: string): Promise<ImageDimension | null> {
	try {
		const file = sharp(filePath);
		const { width, height } = await file.metadata();
		const buffer = await file.toBuffer();
		return { filePath, width, height, file, buffer };
	} catch (error) {
		console.error('Error:', error.message);
		return null;
	}
}

async function sortImagesByDimensions(filePaths: string[]): Promise<ImageDimension[]> {
	const dimensions: ImageDimension[] = [];

	for (const filePath of filePaths) {
		const dimension = await getImageDimensions(filePath);
		if (dimension !== null) {
			dimensions.push(dimension);
		}
	}

	dimensions.sort((a, b) => {
		// Sort by height and then width
		if (a.height === b.height) {
			return a.width - b.width;
		}
		return a.height - b.height;
	});

	return dimensions;
}

function divideImagesIntoGroups(
	sortedImages: ImageDimension[],
	totalWidth: number,
	maxHeight: number,
	gap: number
) {
	if (totalWidth === 0 && maxHeight === 0) {
		return [];
	}

	const totalWidthWithoutGuideLine = totalWidth - gap * 2;
	const totalHeightWithoutGuideLine = maxHeight - gap * 2;
	const groups: ImageDimension[][] = [];
	let currentGroup: ImageDimension[] = [];
	let currentX = gap * 2;
	let currentY: number | null = null;

	for (const image of sortedImages) {
		const { width, height } = image;

		if (width > totalWidthWithoutGuideLine || height > totalHeightWithoutGuideLine) {
			console.log(width, height);
			throw new Error('Image is too large');
		}

		if (currentY === null) {
			currentY = maxHeight - gap * 2 - height;
		}

		if (currentX + width > totalWidthWithoutGuideLine) {
			currentX = gap * 2;
			currentY = currentY - height - gap;
		}

		if (currentY < 0) {
			groups.push(currentGroup);
			currentGroup = [];
			currentY = maxHeight - gap * 2 - height;
		}

		currentGroup.push({ ...image, left: currentX, top: currentY });
		currentX = currentX + width + gap;
	}
	if (currentGroup.length > 0) groups.push(currentGroup);
	return { mergedGroupFiles: groups, fileWidth: totalWidth, fileHeight: maxHeight };
}

export { handleMergeSVGAndPNG };
