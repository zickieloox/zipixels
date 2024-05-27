import 'notiflix/dist/notiflix-3.2.6.min.css';
import Notiflix from 'notiflix';
import Toastify from 'toastify-js';
import Konva from 'konva';

Notiflix.Confirm.init({
	titleColor: '#FF8C00',
	okButtonBackground: '#FF8C00'
});

const SIDEBAR_WIDTH = 270;
const canvasWidth = window.innerWidth - SIDEBAR_WIDTH;
const canvasHeight = window.innerHeight;
const INITIAL_ZOOM_PERCENT = 10;
const MAX_SCALE = 10;
const MIN_SCALE = 0.05;
const scaleBy = 1.2;

declare let orderListElement: HTMLElement;

let fileName = '';
let psdData: any = null;
let fileSize = 0;
let imageIds: string[] = [];
let unknownCount = 1;
let relateElements: { [key: string]: any } = {};
let defaultShowText = false;
let layerZIndexMap: { [key: string]: number } = {};
let sizeScale: { [key: string]: number } = {};
let currentScale = 1;
let copyLayer: { [key: string]: any } = {};
let copyElements: any[] = [];

//
// const stage = new Konva.Stage({
// 	container: 'container',
// 	width: canvasWidth,
// 	height: canvasHeight,
// 	draggable: true
// });

// stage.scale({
// 	x: MIN_SCALE,
// 	y: MIN_SCALE
// });

// const konvaLayer = new Konva.Layer();

// const tempStage = new Konva.Stage({
// 	container: 'temp-container',
// 	width: canvasWidth,
// 	height: canvasHeight,
// 	draggable: true
// });

// const tempKonvaLayer = new Konva.Layer();

// const backgroundImage = new Image();
// backgroundImage.src =
// 	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAWBAMAAACrl3iAAAAABlBMVEUAAAD+AciWmZzWAAAAAnRSTlMAApidrBQAAAB9SURBVBjTbVGBDcAgDKIf8P+1iwhtY1YTtRkgZcB/1S3ddkd95Vmcrg4CBwid7oQy1ic3+movNMIRztp+26udTPH1jWwmGRbDUqeuFoxxecqA8JDNnDzuhseISH5k+S6HYhLbM9HqnUJNkJNGlBMh1nCxDTwJXiTXv2xpMT5HqQWkLibjHgAAAABJRU5ErkJggg==';
// backgroundImage.onload = function () {
// 	const transparentBg = new Konva.Image({
// 		x: 0,
// 		y: 0,
// 		image: backgroundImage,
// 		width: canvasWidth,
// 		height: canvasHeight
// 	});

// 	konvaLayer.add(transparentBg);
// 	stage.add(konvaLayer);

// 	tempKonvaLayer.add(transparentBg);
// 	tempStage.add(tempKonvaLayer);
// };

//
const resetContainer = (): void => {
	imageIds.length = 0;
	unknownCount = 1;
	orderListElement.innerHTML = '';
	psdData = null;
	fileName = '';
	fileSize = 0;
	imageIds = [];
	unknownCount = 1;
	relateElements = {};
	defaultShowText = false;
	layerZIndexMap = {};
	sizeScale = {};
	currentScale = 1;
	copyLayer = {};
	copyElements = [];

	stage.scale({ x: MIN_SCALE, y: MIN_SCALE });
	stage.position({ x: 0, y: 0 });

	konvaLayer.destroyChildren();
	konvaLayer.clear();
};

//
export async function handleFileInput(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	Notiflix.Loading.standard('<span id="processed-layers">0</span> layers processed');

	if (file) {
		fileName = file.path;
		fileSize = file.size;

		if (file.path.endsWith('.psd')) {
			await window.electronAPI.processPsd(file.path);
		} else if (file.path.endsWith('.svg')) {
			await window.electronAPI.processSvg(file.path);
		}
	}
}

//
function exportImage(fileName: string): void {
	console.log(`Exporting image with file name: ${fileName}`);
}

export function handleExportImage(): void {
	Notiflix.Confirm.prompt(
		'Export File',
		'Order Id?',
		'#000000',
		'Confirm',
		'Cancel',
		(outputFileName: string) => {
			exportImage(outputFileName);
		}
	);
}

//
export const handleMergeSVGFilesInput = async (e: Event): Promise<void> => {
	const target = e.target as HTMLInputElement;
	const files = target.files;
	if (files!.length === 0) return;

	Notiflix.Confirm.prompt(
		'Size of export image',
		'Width x height of export image?',
		'1000x1000',
		'Confirm',
		'Cancel',
		(widthAndHeight) => {
			const filePaths = [];
			for (let i = 0; i < files!.length; i++) {
				filePaths.push(files![i].path);
			}

			const [width, height] = widthAndHeight.replace(' ', '').split('x');

			Notiflix.Loading.standard('<span id="processed-layers">Merge files processing</span>');
			window.electronAPI.mergeSVGAndPNG(filePaths, width, height);
		}
	);
};

//
export const handleReset = () => {
	Notiflix.Loading.standard('<span id="processed-layers">Reseting...</span>');
	resetContainer();
	Notiflix.Loading.remove();
};

//
export const handleUploadServer = (): void => {
	Notiflix.Loading.standard('<span id="processed-layers">Upload to server processing</span>');
	window.electronAPI.uploadToServer(fileName, fileSize.toString());
};

//
export const handleDownloadSvg = (): void => {
	if (!psdData) {
		Toastify({
			text: 'Template is invalid!',
			duration: 10000,
			position: 'right',
			style: {
				background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
			}
		}).showToast();
		return;
	}

	Notiflix.Loading.standard('<span id="processed-layers">Download SVG processing</span>');
	window.electronAPI.downloadSvg(psdData);
};

//
const setFontFromArrayBuffer = (fontData: ArrayBuffer, fontName: string): void => {
	const font = new FontFace(fontName, fontData);

	const inputs = document.querySelectorAll('li input');

	const stage: any = undefined;

	font
		.load()
		.then(function (loadedFont) {
			const fontFaceSet = document.fonts;
			fontFaceSet.add(loadedFont);

			for (const input of Array.from(inputs)) {
				const text: any = stage.findOne('#' + input.attributes.for.value);
				text.fontFamily(fontName);
			}
		})
		.catch(function (error) {
			console.error('Font loading failed: ', error);
		});
};

export const handleCustomFont = async (e: Event): Promise<void> => {
	const target = e.target as HTMLInputElement;
	if (!target?.files || !target.files[0]) {
		return;
	}

	Notiflix.Loading.standard('<span id="processed-layers">Font processing</span>');

	const file = target.files[0];
	const fontName = file.name.split('.')[0];

	const reader = new FileReader();
	reader.onload = function (event) {
		const fontData = event.target?.result;
		if (!fontData) {
			return;
		}
		setFontFromArrayBuffer(fontData, fontName);
		window.electronAPI.saveFont(fontData, fontName);
	};
	reader.readAsArrayBuffer(file);

	Toastify({
		text: 'Custom Font Successed',
		duration: 10000,
		position: 'right',
		style: {
			background: 'linear-gradient(to right, #11998e, #38ef7d)'
		}
	}).showToast();
	Notiflix.Loading.remove();
};

//
export const handleZoomInput = (e: Event): void => {
	const target = e.target as HTMLInputElement;
	const scale = Number(target.value) / INITIAL_ZOOM_PERCENT;

	if (scale < MIN_SCALE || scale > MAX_SCALE) return;

	const oldScale = stage.scaleX();

	const center = {
		x: stage.width() / 2,
		y: stage.height() / 2
	};

	const relatedTo = {
		x: (center.x - stage.x()) / oldScale,
		y: (center.y - stage.y()) / oldScale
	};

	stage.scale({
		x: scale,
		y: scale
	});

	const newPos = {
		x: center.x - relatedTo.x * scale,
		y: center.y - relatedTo.y * scale
	};

	stage.position(newPos);
};

//
export const handleTemplatesChange = (e: Event): void => {
	const target = e.target as HTMLSelectElement;
	const templateId = target.value;
	resetContainer();

	if (!templateId) {
		return;
	}

	Notiflix.Loading.standard('<span id="processed-layers">Loading Templates</span>');
	window.electronAPI.getDetailTemplate(templateId);
};
