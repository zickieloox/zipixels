import { writable } from 'svelte/store';
import Konva from 'konva';
import Toastify from 'toastify-js';
import { createImageElementFromUrl } from '../utils';

let checkFontContext: CanvasRenderingContext2D | null = null;
let arialBmp: Uint8ClampedArray | null = null;
let konvaLayer: Konva.Layer | null = null;
const layerZIndexMap: { [key: number]: string[] } = {};
const initTextPathFontSize: number[] = [];
let copyLayer: { [key: string]: any } = {};

function initializeFontCheck(canvas: HTMLCanvasElement) {
	checkFontContext = canvas.getContext('2d');
	const arialSVG = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="100">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">
          <span style="font-family:Arial;">The brown fox jumps over a fence</span>
        </div>
      </foreignObject>
    </svg>
  `);
	const img = new Image();
	img.src = 'data:image/svg+xml,' + arialSVG;

	return new Promise<void>((resolve) => {
		img.onload = () => {
			checkFontContext!.drawImage(img, 0, 0);
			arialBmp = checkFontContext!.getImageData(0, 0, 500, 100).data;
			checkFontContext!.clearRect(0, 0, canvas.width, canvas.height);
			resolve();
		};
	});
}

function checkFontInstalled(font: string): Promise<boolean> {
	const fontToTest = font.replaceAll('"', '');
	if (fontToTest.toLowerCase().includes('arial')) {
		return Promise.resolve(true);
	}

	const fontSVG = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="100">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">
          <span style="font-family: ${fontToTest}, Arial;">The brown fox jumps over a fence</span>
        </div>
      </foreignObject>
    </svg>
  `);

	const img = new Image();
	img.src = 'data:image/svg+xml,' + fontSVG;

	return new Promise((resolve) => {
		img.onload = () => {
			setTimeout(() => {
				checkFontContext!.drawImage(img, 0, 0);
				const fontBmp = checkFontContext!.getImageData(0, 0, 500, 100).data;

				let isAllZero = true;
				for (let i = 0; i < fontBmp.length; i++) {
					if (fontBmp[i] !== 0) {
						isAllZero = false;
						break;
					}
				}

				if (isAllZero) {
					resolve(false);
				}

				for (let i = 0; i < arialBmp!.length; i++) {
					if (arialBmp![i] !== fontBmp[i]) {
						resolve(true);
					}
				}

				resolve(false);
			}, 0);
		};
	});
}

async function createKonvaText(
	layer: any,
	imageId: string,
	groupName: string,
	defaultShowText: boolean,
	hashtagPart: boolean | string
) {
	const fontName = layer.text_data.font_name
		.replaceAll("'", '')
		.split('-')[0]
		.replace(/([a-z])([A-Z])/g, '$1 $2');

	const fontAvailable = await checkFontInstalled(`${fontName}`);

	if (!fontAvailable) {
		Toastify({
			text: `Missing font: ${fontName}`,
			duration: 10000,
			position: 'right',
			style: {
				background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
			}
		}).showToast();
	}

	const radians = (layer.rotate * Math.PI) / 180;
	const justifyX = Number((Math.sin(radians) * 1.2 * layer.text_data.font_size).toFixed(2));
	const justifyY = Number((Math.cos(radians) * 1.2 * layer.text_data.font_size).toFixed(2)) * -1;

	const konvaText = new Konva.Text({
		x: layer.x + justifyX,
		y: layer.y + justifyY,
		text: defaultShowText ? layer.text_data.text.replaceAll('.', '') : '',
		stroke: layer.text_data.stroke_color,
		strokeWidth: layer.text_data.stroke_width,
		name: layer.name,
		layerHastag: hashtagPart,
		groupName: groupName,
		width: layer.width,
		height: layer.height,
		fontSize: layer.text_data.font_size,
		fontPath: layer.text_data.font_path,
		fontFamily: fontName,
		fill: layer.text_data.fill_color,
		align: 'center',
		verticalAlign: layer.rotate >= 90 ? 'middle' : 'bottom',
		wrap: 'none',
		scaleX: layer.scaleX || null,
		skewY: layer.skewY || null,
		skewX: layer.skewX || null,
		scaleY: layer.scaleY || null
	});

	if (layer.rotate) {
		konvaText.rotate(layer.rotate);
	}

	konvaText.id(imageId);
	konvaLayer!.add(konvaText);

	// Type layers are always on top
	if (layerZIndexMap[1000]) {
		layerZIndexMap[1000].push(imageId);
	} else {
		layerZIndexMap[1000] = [imageId];
	}
}

const createKonvaTextPath = async (
	layer: any,
	imageId: string,
	groupName: string,
	defaultShowText: boolean,
	hashtagPart: boolean | string
) => {
	const fontName = layer.text_data.font_name
		.replaceAll("'", '')
		.split('-')[0]
		.replace(/([a-z])([A-Z])/g, '$1 $2');

	const fontAvailable = await checkFontInstalled(`${fontName}`);

	if (!fontAvailable) {
		Toastify({
			text: `Missing font: ${fontName}`,
			duration: 10000,
			position: 'right',
			style: {
				background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
			}
		}).showToast();
	}
	const path = new Konva.Path({
		data: layer.text_data.text_path
	});

	const konvaTextPath = new Konva.TextPath({
		x: layer.x,
		y: layer.y,
		fill: layer.text_data.fill_color,
		fontSize: layer.text_data.font_size,
		fontFamily: layer.text_data.font_name,
		text: layer.text_data.text,
		stroke: layer.text_data.stroke_color,
		strokeWidth: layer.text_data.stroke_width,
		align: 'center',
		data: layer.text_data.text_path
	});

	if (layer.rotate) {
		konvaTextPath.rotate(layer.rotate);
	}

	initTextPathFontSize.push(layer.text_data.font_size);

	path.id(imageId + 'path');
	konvaTextPath.id(imageId);
	konvaLayer!.add(path);
	konvaLayer!.add(konvaTextPath);

	// Type layers are always on top
	if (layerZIndexMap[1000]) {
		layerZIndexMap[1000].push(imageId);
	} else {
		layerZIndexMap[1000] = [imageId];
	}
};

const getImageUrl = async (
	layer: { thumb_image_path?: string; image_path: string },
	zip: any,
	files: FileList | null
): Promise<string | undefined> => {
	if (!zip && !files) return layer.thumb_image_path || layer.image_path;

	const imagePaths = layer.image_path.replaceAll('\\', '/').split('/');

	if (zip) {
		const imagePath = [imagePaths[imagePaths.length - 2], imagePaths[imagePaths.length - 1]].join(
			'/'
		);

		const imageBlob = await zip.file(imagePath).async('base64');
		return 'data:image/png;base64,' + imageBlob;
	} else if (files) {
		const imagePath = imagePaths[imagePaths.length - 1];

		const file = Array.from(files).find((file) => file.name === imagePath);

		if (file) return URL.createObjectURL(file);
	}
};

const createKonvaLayer = async (
	layer: any,
	zip: any,
	files: FileList | any,
	imageId: string,
	groupName: string,
	hashtagPart: boolean | string
) => {
	const imageUrl: any = await getImageUrl(layer, zip, files);

	const imageElement: any = await createImageElementFromUrl(imageUrl);

	const konvaImage = new Konva.Image({
		x: layer.x, // + (layer.translateX || 0),
		y: layer.y, //+ (layer.translateY || 0),
		image: imageElement,
		width: layer.width,
		height: layer.height,
		name: layer.name,
		layerHastag: hashtagPart,
		groupName: groupName,
		imagePath: layer?.image_path?.includes('https://') ? layer.image_path : layer.raw_image_path,
		svgPath: layer?.svg_path,
		scaleX: layer.scaleX || null,
		skewY: layer.skewY || null,
		skewX: layer.skewX || null,
		scaleY: layer.scaleY || null
	});

	// if (layer.rotate) {
	//   konvaImage.rotate(layer.rotate);
	// }

	konvaImage.id(imageId);

	imageElement?.remove();

	if (layer.name.startsWith('#')) {
		konvaImage.addEventListener('click', async () => {
			document.querySelector('#' + imageId)!.click();
		});
	}

	konvaLayer!.add(konvaImage);

	if (layerZIndexMap[String(layer.z_index)]) {
		layerZIndexMap[String(layer.z_index)].push(imageId);
	} else {
		layerZIndexMap[String(layer.z_index)] = [imageId];
	}
};

const createCopyLayer = async (layer: any) => {
	const base = layer.children.find((child: any) => child.name.toLowerCase().includes('base'));
	const copy = layer.children.find((child: any) => child.name.toLowerCase().includes('copy'));

	copyLayer = {
		...copyLayer,
		x: (copy?.x || 0) - (base?.x || 0),
		y: (copy?.y || 0) - (base?.y || 0)
	};
};
export const fontStore = writable({
	checkFontInstalled,
	initializeFontCheck,
	createKonvaText,
	createKonvaTextPath,
	createCopyLayer,
	createKonvaLayer,
	setKonvaLayer: (layer: Konva.Layer) => {
		konvaLayer = layer;
	}
});
