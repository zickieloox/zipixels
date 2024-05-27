<script lang="ts">
	import { handleCustomFont } from '../../main2';
	import { onMount } from 'svelte';
	import Konva from 'konva';
  import { isInViewport, createImageElementFromUrl } from '../../utils';
  import { fontStore } from '../stores';
  import { nanoid } from 'nanoid';
  import Notiflix from 'notiflix';
  import Toastify from 'toastify-js';
  import type { Text } from 'konva/lib/shapes/Text';
	import type { TextPath } from 'konva/lib/shapes/TextPath';
	import type { Path } from 'konva/lib/shapes/Path';
	import type { LayerConfig } from 'konva/lib/Layer';

	export let orderListElement: HTMLElement;

	const SIDEBAR_WIDTH = 270;
	const canvasWidth = window.innerWidth - SIDEBAR_WIDTH;
	const canvasHeight = window.innerHeight;
	const INITIAL_ZOOM_PERCENT = 10;
	const MAX_SCALE = 10;
	const MIN_SCALE = 0.05;
	const scaleBy = 1.2;

	let fileName = '';
	let psdData: any = null;
	let fileSize = 0;
	let imageIds: string[] = [];
	let unknownCount = 1;
	let relateElements: { [key: string]: any } = {};
	let defaultShowText = false;
	let layerZIndexMap: any = {};
	let sizeScale: any = {};
	let currentScale = 1;
	let copyLayer: { [key: string]: any } = {};
	let copyElements: any[] = [];

  let initTextPathFontSize: number[] = [];
  let textPathnum = -1;

  // export let zoomElement: HTMLElement;
  export let uploadPSDInput: HTMLElement;

	export let stage: Konva.Stage;
	let tempStage: Konva.Stage;
	export let konvaLayer: Konva.Layer;
	let tempKonvaLayer: Konva.Layer;

	// function drawKonva() {
	// 	stage = new Konva.Stage({
	// 		container: 'container',
	// 		width: canvasWidth,
	// 		height: canvasHeight,
	// 		draggable: true
	// 	});

	// 	stage.scale({
	// 		x: MIN_SCALE,
	// 		y: MIN_SCALE
	// 	});

	// 	konvaLayer = new Konva.Layer();

	// 	tempStage = new Konva.Stage({
	// 		container: 'temp-container',
	// 		width: canvasWidth,
	// 		height: canvasHeight,
	// 		draggable: true
	// 	});

	// 	tempKonvaLayer = new Konva.Layer();

	// 	const backgroundImage = new Image();
	// 	backgroundImage.src =
	// 		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAWBAMAAACrl3iAAAAABlBMVEUAAAD+AciWmZzWAAAAAnRSTlMAApidrBQAAAB9SURBVBjTbVGBDcAgDKIf8P+1iwhtY1YTtRkgZcB/1S3ddkd95Vmcrg4CBwid7oQy1ic3+movNMIRztp+26udTPH1jWwmGRbDUqeuFoxxecqA8JDNnDzuhseISH5k+S6HYhLbM9HqnUJNkJNGlBMh1nCxDTwJXiTXv2xpMT5HqQWkLibjHgAAAABJRU5ErkJggg==';
	// 	backgroundImage.onload = function () {
	// 		const transparentBg = new Konva.Image({
	// 			x: 0,
	// 			y: 0,
	// 			image: backgroundImage,
	// 			width: canvasWidth,
	// 			height: canvasHeight
	// 		});

	// 		konvaLayer.add(transparentBg);
	// 		stage.add(konvaLayer);

	// 		tempKonvaLayer.add(transparentBg);
	// 		tempStage.add(tempKonvaLayer);
	// 	};

	// 	stage.on('wheel', (e) => {
	// 		e.evt.preventDefault();

	// 		const oldScale = stage.scaleX();
	// 		const pointer = stage.getPointerPosition();

	// 		const mousePointTo = {
	// 			x: (pointer!.x - stage.x()) / oldScale,
	// 			y: (pointer!.y - stage.y()) / oldScale
	// 		};

	// 		const direction = e.evt.deltaY > 0 ? -1 : 1;

	// 		const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
	// 		if (newScale < MIN_SCALE || newScale > MAX_SCALE) return;
	// 		//@ts-ignore
	// 		zoomElement.value = newScale * INITIAL_ZOOM_PERCENT;
	// 		stage.scale({ x: newScale, y: newScale });

	// 		const newPos = {
	// 			x: pointer!.x - mousePointTo.x * newScale,
	// 			y: pointer!.y - mousePointTo.y * newScale
	// 		};

	// 		stage.position(newPos);
	// 	});
	// }

	// onMount(drawKonva);

	//
	export const resetContainer = (): void => {
		// imageIds.length = 0;
		// unknownCount = 1;
		// orderListElement.innerHTML = '';
		// psdData = null;
		// fileName = '';
		// fileSize = 0;
		// imageIds = [];
		// unknownCount = 1;
		// relateElements = {};
		// defaultShowText = false;
		// layerZIndexMap = {};
		// sizeScale = {};
		// currentScale = 1;
		// copyLayer = {};
		// copyElements = [];

		// stage.scale({ x: MIN_SCALE, y: MIN_SCALE });
		// stage.position({ x: 0, y: 0 });

		// konvaLayer.destroyChildren();
		// konvaLayer.clear();
	};

  const handleHtmlLayerClick = (orderId: string, imageId: string, element: HTMLElement) => {
		if (!orderId.startsWith('#')) return;

		const konvaLayer = stage.findOne('#' + imageId);
		if (!konvaLayer) return;

		if (!element.classList.contains('bg-gray-200')) {
			element.classList.add('bg-gray-200');
		} else {
			element.classList.remove('bg-gray-200');
		}

		if (!isInViewport(element)) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

  const splitGroupName = (groupName: string): [string, string, string, string, string] => {
		const str: string = groupName.toLowerCase().replace('choose', '');
		const parts: string[] = [];

		if (str.indexOf('@') > -1) {
			parts.push(str.slice(0, str.indexOf('@')));
			parts.push(str.slice(str.indexOf('@'), str.length));
		} else {
			parts.push(str);
		}

		for (const part of [...parts]) {
			if (part.indexOf('#') > -1) {
				parts.splice(parts.indexOf(part), 1);
				parts.push(part.slice(0, part.indexOf('#')));
				parts.push(part.slice(part.indexOf('#'), part.length));
			}
		}

		let name = '',
			hashtag = '',
			atSign = '',
			vector = '',
			size = '';

		for (const part of parts) {
			if (part[0] === '@') {
				atSign = part.replace('@', '').trim();
			} else if (part[0] === '#') {
				hashtag = part.replace('#', '').trim();
			} else {
				name = part.trim();
			}
		}

		vector = name.toLowerCase().includes('vector')
			? name.toLowerCase().split('-vector')[0]?.trim()
			: '';
		size = name.toLowerCase().includes('size') ? name.toLowerCase().split('-size')[0]?.trim() : '';

		return [name, hashtag, atSign, vector, size];
	};

  const handleHtmlLayerInputChange = (
		imageId: string,
		inputText: string,
		standardSize = 20,
		label = null,
		maxLength = 0
	) => {
		const konvaLayer: Text | undefined = stage.findOne('#' + imageId);

		if (!konvaLayer) return;

		if (!inputText || inputText.length === 0) {
			// @ts-ignore
			konvaLayer.text('');
			konvaLayer.fontSize(standardSize);
			return;
		}

		const desiredWidth = konvaLayer.width();
		let currentFontSize = standardSize;

		konvaLayer.width(0);
		konvaLayer.fontSize(standardSize);
		konvaLayer.text(inputText);

		while (konvaLayer.getTextWidth() > desiredWidth) {
			currentFontSize -= 1;
			konvaLayer.fontSize(currentFontSize);
		}
		konvaLayer.width(desiredWidth);

		// // Get current label text
		// if (label) {
		//   const currentLabelText = label.innerHTML;
		//   const innerContentParts = currentLabelText.split('(');
		//   innerContentParts.pop();
		//   label.innerHTML = maxLength > 0 ? `${innerContentParts.join('(')} (${inputText.length}/${maxLength})` : currentLabelText;
		// }

		if (copyElements) {
			triggerCopyLayer();
		}
	};

  const triggerCopyLayer = () => {
		if (!copyLayer || !copyLayer.x) return;

		const orderListElements = document.querySelectorAll<HTMLImageElement>(
			'#order-list div ul li img[data-is-visible="1"]'
		);
		const textElements = document.querySelectorAll<HTMLInputElement>('#order-list div ul li input');

		const copyImageObjects: Konva.Node[] = [];

		orderListElements.forEach((elem) => {
			const obj = stage.findOne<Konva.Image>('#' + elem.alt);

			if (obj && !elem.dataset.groupName?.toLowerCase().includes('background')) {
				copyImageObjects.push(obj);
			}
		});

		if (copyImageObjects.length === 0) {
			return;
		}

		textElements.forEach((elem) => {
			const textLayer = stage.findOne<Konva.Text>('#' + elem.parentElement!.id);
			if (textLayer && textLayer.textWidth > 0) {
				copyImageObjects.push(textLayer);
			}
		});

		copyElements.forEach((copyElem) => {
			copyElem.destroy();
		});

		copyElements = [];

		copyImageObjects.forEach((elem) => {
			const copyElem = elem.clone();
			copyElem.setAttrs({
				x: copyElem.attrs.x + copyLayer.x,
				y: copyElem.attrs.y + copyLayer.y,
				baseElementId: elem.id()
			});
			copyElements.push(copyElem);
			konvaLayer.add(copyElem);
		});
	};

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

	// const fontAvailable = await checkFontInstalled(`${fontName}`);

	// if (!fontAvailable) {
	// 	Toastify({
	// 		text: `Missing font: ${fontName}`,
	// 		duration: 10000,
	// 		position: 'right',
	// 		style: {
	// 			background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
	// 		}
	// 	}).showToast();
	// }

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

	// const fontAvailable = await checkFontInstalled(`${fontName}`);

	// if (!fontAvailable) {
	// 	Toastify({
	// 		text: `Missing font: ${fontName}`,
	// 		duration: 10000,
	// 		position: 'right',
	// 		style: {
	// 			background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
	// 		}
	// 	}).showToast();
	// }
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
      //@ts-ignore
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

  interface Layer {
		name: string;
		kind: string;
		text_data?: any;
		image_path?: string;
		crop_image_path?: string;
		thumb_image_path?: string;
		children?: Layer[];
	}

	interface File {
		path: string;
		data: string;
	}
	export const createLayer = async (
		layer: Layer,
		parentElement: any,
		level: number | undefined,
		zip: any,
		files: File,
		layerOption = '',
		groupName = '',
		processingLayer: Promise<void>[] = []
	) => {
		if (!layer || layer.name.toLowerCase().includes('frame')) return;
		if (layer.name.toLowerCase().includes('copy')) {
      createCopyLayer(layer);
      return;
		}

		if (level === undefined) level = -1;
		level += 1;

		const imageId = 'image-' + nanoid(8);
		imageIds.push(imageId);
		const [namePart, hashtagPart, atSignPart, vectorPart, sizePart] = splitGroupName(groupName);

		// canvas
		if (layer.kind === 'type' && layer.text_data) {
			processingLayer.push(createKonvaText(layer, imageId, namePart, defaultShowText, hashtagPart));
		} else if (layer.kind === 'textpath' && layer.text_data) {
			processingLayer.push(
				createKonvaTextPath(layer, imageId, namePart, defaultShowText, hashtagPart)
			);
		} else if (layer.image_path && namePart.toLowerCase() !== 'size') {
			processingLayer.push(createKonvaLayer(layer, zip, files, imageId, namePart, hashtagPart));
		}


		if (layer.children && layer.children.length > 0) {
			const createdAt = new Date().getTime().toString();

			if (!parentElement) {
				parentElement = orderListElement;
			}

			const toggleWrapper = document.createElement('div');
			const toggleElement = document.createElement('button');
			toggleWrapper.appendChild(toggleElement);
			parentElement.appendChild(toggleWrapper);
			toggleElement.id = imageId;
			toggleWrapper.setAttribute('class', 'w-full my-2');
			toggleElement.setAttribute('style', `padding-left: ${level * 30 || 8}px`);
			toggleElement.setAttribute(
				'class',
				'flex items-center w-full p-2 text-base font-normal text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100'
			);
			toggleElement.setAttribute('data-collapse-toggle', `dropdown-${createdAt}`);
			toggleElement.innerHTML = `
      <span
      class="flex-1 ml-3 text-left whitespace-nowrap font-bold"
      sidebar-toggle-item
      >${layer.name
				.replaceAll('<', '')
				.replaceAll('>', '')
				.replaceAll('+', '')
				.replaceAll('\u00A0', ' ')}</span
      >
      <svg
      sidebar-toggle-item
      class="w-6 h-6"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      >
      <path
        fill-rule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clip-rule="evenodd"
      ></path>
      </svg>`;

			if (layer.name.startsWith('*')) {
				const isChecked = layer.name === layerOption;
				toggleWrapper.setAttribute('type', 'option');
				const toggleOptions = `<input
        class="w-[10%] toggle-options" for="${layer.name}" type="radio" name="option" ${
					isChecked ? 'checked' : ''
				}></input>`;
				toggleElement.innerHTML = toggleOptions + toggleElement.innerHTML;
			}

			const ulElement = document.createElement('ul');
			toggleWrapper.append(ulElement);
			ulElement.setAttribute('id', `dropdown-${createdAt}`);
			ulElement.setAttribute('class', 'flex flex-wrap gap-2.5');

			toggleElement.addEventListener('click', () => {
				handleHtmlLayerClick(layer.name, imageId, toggleElement);

				ulElement.classList.toggle('hidden');
			});

			for (let i = 0; i < layer.children.length; i++) {
				const child = layer.children[i];
				if (layer.name.startsWith('*') && layerOption !== layer.name) {
					// Skip option layers if it doesn't match the selected option
					continue;
				} else {
					createLayer(child, ulElement, level, zip, files, '', layer.name, processingLayer);
				}
			}
		} else {
			// sidebar
			const newParentElement = parentElement || orderListElement;
			const liElement = document.createElement('li');
			liElement.id = imageId;
			const liClasses = ['w-full'];

			if (atSignPart) {
				const relatedLayerName = layer.name.includes('@')
					? layer.name.split('@')[0].trim()
					: layer.name.trim();
				const relatedName = `${atSignPart}-${relatedLayerName}`.toLowerCase();

				if (relateElements[relatedName]) {
					relateElements[relatedName].push(imageId);
				} else {
					relateElements[relatedName] = [imageId];
				}
				if (layer.kind === 'type' && layer.text_data) {
					liClasses.push('hidden');
				} else {
					newParentElement.parentElement!.style.display = 'none';
				}
			}

			if (vectorPart) {
				const relatedLayerName = layer.name.trim();
				const relatedName = `${vectorPart}-${relatedLayerName}`.toLowerCase();
				(relateElements[relatedName] = relateElements[relatedName] || []).push(imageId);
			}

			if (sizePart) {
				sizeScale[imageId] = layer.name.split(' ')[0];
			}

			if (layer.kind === 'type' && layer.text_data) {
				liElement.setAttribute('class', liClasses.join(' '));
				liElement.innerHTML =
					`<label for="${imageId}" data-is-visible="0" class="w-full block mb-2 text-md font-md text-black ml-4">
        ${layer.name.replaceAll('.', '')}</label>` + // (${:  ? layer.name.length : 0}|${layer.text_data.text.length})
					`<input for="${imageId}" value="${
						defaultShowText ? layer.text_data.text.replaceAll('.', '') : ''
					}" type="text" class="h-[40px] w-[90%] border-1 border-black-300 rounded ml-4 p-2 mr-4"  placeholder="${
						layer.name
					}" maxlength="12"></input>`;
				liElement.addEventListener('input', (event) => {
					const label: any = document.querySelector(`label[for="${imageId}"]`);
					handleHtmlLayerInputChange(
						imageId,
						// @ts-ignore
						event.target?.value,
						layer.text_data?.font_size,
						label
						// layer.text_data?.text.length,
					);
				});
			} else if (layer.crop_image_path || layer.thumb_image_path) {
				const imageClassStyle =
					'w-[76px] h-[76px] object-contain cursor-pointer toggle-visibility border-4 border-transparent rounded-sm';
				const colorClassStyle =
					'w-[38px] h-[38px] object-contain cursor-pointer toggle-visibility border-4 border-transparent rounded-full';
				liElement.innerHTML = `<img class="${
					namePart === 'color' ? colorClassStyle : imageClassStyle
				}" draggable="false" data-is-visible="0" data-name="${layer.name.trim()}" data-group-name="${namePart}" src='${
					layer.crop_image_path
				}' alt="${imageId}" ></img>`;
			} else if (layer.kind === 'textpath' && layer.text_data) {
				textPathnum++;
				liElement.setAttribute('class', liClasses.join(' '));
				liElement.innerHTML =
					`<label for="${imageId}" data-is-visible="0" class="w-full block mb-2 text-md font-md text-black ml-4">
        ${layer.name.replaceAll('.', '')}</label>` + // (${:  ? layer.name.length : 0}|${layer.text_data.text.length})
					`<input for="${imageId}" value="${
						defaultShowText ? layer.text_data.text.replaceAll('.', '') : ''
					}" type="text" class="h-[40px] w-[90%] border-1 border-black-300 rounded ml-4 p-2 mr-4"  placeholder="${
						layer.name
					}" maxlength="12"</input>`;

				liElement.addEventListener('input', (e) => {
					const textpath: TextPath | undefined = stage.findOne('#' + imageId);

					if (!textpath) {
						return;
					}

					const maxFontSize = initTextPathFontSize[textPathnum];
					const minFontSize = maxFontSize / 2;
					const overflowText = 1.95;

					textpath.text((e.target as HTMLInputElement)?.value);
					const textLength = textpath?.text().length;
					let fontSize = textpath.fontSize();
					const pathLength = (stage.findOne('#' + imageId + 'path') as Path).getLength();

					while (textLength * fontSize > pathLength * overflowText && fontSize > minFontSize) {
						fontSize = fontSize - 1;
						textpath?.fontSize(fontSize);
					}

					while (textLength * fontSize < pathLength * overflowText && fontSize < maxFontSize) {
						fontSize = fontSize + 1;
						textpath?.fontSize(fontSize);
					}
				});
			}
			newParentElement?.append(liElement);

			liElement.addEventListener('click', () => {
				handleHtmlLayerClick(layer.name, imageId, liElement);
			});
		}
	};

  const layerCustomSort = (
		a: { name: string; z_index?: number },
		b: { name: string; z_index?: number }
	): number => {
		const primaryCriteriaOrder: string[] = ['color', 'background', 'choose', 'text'];

		const getCriteriaIndex = (str: string, criteriaOrder: string[]): number => {
			const lowerStr = str.toLowerCase();
			for (let i = 0; i < criteriaOrder.length; i++) {
				if (lowerStr.includes(criteriaOrder[i])) {
					return i;
				}
			}
			return criteriaOrder.length;
		};

		const indexA = getCriteriaIndex(a.name, primaryCriteriaOrder);
		const indexB = getCriteriaIndex(b.name, primaryCriteriaOrder);

		if (indexA === indexB && primaryCriteriaOrder[indexA] === 'choose' && a.z_index && b.z_index) {
			return (a.z_index || 0) - (b.z_index || 0);
		}

		return indexA - indexB;
	};

  const validatePSDLayer = (element: any, isNestedError: boolean) => {
		if (!element) return false;
		if (element.children !== null && element.children.length > 0) {
			if (element.name.startsWith('#')) {
				if (isNestedError) return false;
				isNestedError = true;
			}

			return !element.children.some((child: any) => !validatePSDLayer(child, isNestedError));
		} else if (!element.name.trim()) {
			if (element.name.startsWith('#')) {
				if (isNestedError) return false;
			}

			element.name = `Unknown_${unknownCount}`;
			unknownCount += 1;
		}

		return true;
	};

	const validatePsd = (psdData: any) => {
		for (let i = 0; i < psdData.layers.length; i++) {
			if (!psdData.layers[i] || psdData.layers[i].name.toLowerCase() === 'background') continue;

			if (!validatePSDLayer(psdData.layers[i], false)) return false;
		}

		return true;
	};

  const resetLayerIndexes = () => {
		const zIndexes = Object.keys(layerZIndexMap).sort((a, b) => {
			return Number(a) - Number(b);
		});

		let incrementZIndex = 0;
		zIndexes.forEach((zIndex) => {
			const layers = layerZIndexMap[zIndex];

			if (!layers) {
				return;
			}

			for (let i = 0; i < layers.length; i++) {
				incrementZIndex++;
				const layer = stage.findOne('#' + layers[i]);

				if (layer) {
					layer.setZIndex(incrementZIndex);
				}
			}
		});
	};

  const toggleVisibility = (elem: HTMLElement | null, triggerCopy = true) => {
		if (!elem || !elem.parentElement) return;

		if (elem.classList.contains('border-amber-600')) {
			return;
		}

		let relatedElementName;

		if (elem?.dataset?.groupName) {
			relatedElementName = `${elem.dataset.groupName}-${elem.dataset.name}`.toLowerCase();
		}

		const imageId = elem.parentElement.id;
		const isVisible = elem.dataset.isVisible;

		const konvaImage = stage.findOne('#' + imageId);

		// Set size if needed
		if (sizeScale[imageId]) {
			currentScale = sizeScale[imageId] || 1;
		}
		const parentElement = elem.parentElement?.parentElement;
		if (!parentElement) return;

		// Turn off same level image
		parentElement.querySelectorAll<HTMLImageElement>(`li img`).forEach((img) => {
			img.classList.remove(`border-amber-600`);
			img.classList.add('border-transparent');
			img.dataset.isVisible = '0';
			const sameLevelKonvaImage = stage.findOne('#' + img?.parentElement?.id);
			sameLevelKonvaImage?.hide();
		});

		if (Number(isVisible) === 1) {
			elem.dataset.isVisible = '0';
			konvaImage?.hide();
		} else {
			elem.dataset.isVisible = '1';
			elem.classList.remove('border-transparent');
			elem.classList.add(`border-amber-600`);
			konvaImage?.show();
		}

		// Show relate elements
		if (relatedElementName && relateElements[relatedElementName]) {
			for (const elementId of relateElements[relatedElementName]) {
				const sameLevelElements = document.querySelector(`li#${elementId}`)?.parentElement
					?.children;

				if (!sameLevelElements) {
					return;
				}

				// @ts-ignore
				for (const element of sameLevelElements) {
					if (
						!relateElements ||
						!relateElements[relatedElementName] ||
						!relateElements[relatedElementName].includes(element.id)
					) {
						const inputElement = element.querySelector('input');
						const konvaText = stage.findOne('#' + element.id);

						if (inputElement) {
							inputElement.value = '';
							// @ts-ignore
							konvaText?.text('');
							element.classList.add('hidden');
						}
					} else {
						element?.classList.remove('hidden');
					}
				}
			}
		}

		const relatedImageIds: string[] = [];

		const elemDatasetName = elem.dataset.name;
		if (elemDatasetName && relateElements[elemDatasetName]) {
			const relatedIds = relateElements[elemDatasetName] || [];
			relatedImageIds.push(...relatedIds);
		}

		if (relatedElementName) {
			const relatedIds = relateElements[relatedElementName] || [];
			relatedImageIds.push(...relatedIds);
		}

		const uniqueRelatedImageIds = [...new Set(relatedImageIds)];
		if (uniqueRelatedImageIds.length > 0) {
			uniqueRelatedImageIds.forEach((id) => {
				const relatedImage: HTMLElement | null = document.querySelector(`img[alt=${id}]`);
				toggleVisibility(relatedImage, false);
			});
		}

		// Trigger Copy layer after running recursion
		if (triggerCopy && copyLayer && copyLayer.x) {
			triggerCopyLayer();
		}
	};

  const initSelectList = () => {
		const chooseElements = document.querySelectorAll('#order-list div > ul');
		chooseElements.forEach((elem) => {
			// No toggle hight level ul
			if (elem.querySelector('ul')) {
				return;
			}

			if (elem.childElementCount > 0) {
				toggleVisibility(elem.childNodes[0]?.firstChild as HTMLElement);
			}
		});
	};

	const initScaleValue = () => {
		if (Object.keys(sizeScale).length > 0) {
			let maxScale = 0;
			for (const imageId in sizeScale) {
				maxScale = Math.max(maxScale, Number(sizeScale[imageId]));
			}

			for (const imageId in sizeScale) {
				sizeScale[imageId] = sizeScale[imageId] / maxScale;
			}
		}
	};

	const initScreen = (width: number, height: number): void => {
		const scaleX: number = stage.width() / width;
		const scaleY: number = stage.height() / height;
		const scale: number = Math.max(Math.min(scaleX, scaleY, MAX_SCALE), MIN_SCALE);
		stage.scale({ x: scale, y: scale });
	};

  export const exportImage = (outputFileName = '', width = null, height = null) => {
		const orderListElements: any = document.querySelectorAll(
			'#order-list div ul li img[data-is-visible="1"]'
		);
		const textElements = document.querySelectorAll<HTMLInputElement>('#order-list div ul li input');
		const exportImageObjects: any[] = [...copyElements];
		orderListElements.forEach((elem: any) => {
			const obj = stage.findOne('#' + elem.alt);

			if (obj) exportImageObjects.push(obj);
		});

		if (exportImageObjects.length === 0) {
			Toastify({
				text: 'No selected items',
				duration: 3000,
				position: 'right',
				style: {
					background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
				}
			}).showToast();
			return;
		}

		textElements.forEach((elem) => {
			const textLayer: Text | undefined = stage.findOne('#' + elem!.parentElement!.id);
			if (textLayer && textLayer.textWidth > 0) {
				exportImageObjects.push(textLayer);
			}
		});

		let minX = Number.POSITIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		let maxWidth = 0;
		let maxHeight = 0;
		const offset = 10;

		exportImageObjects.forEach((obj) => {
			minX = Math.min(minX, obj.attrs.x);
			minY = Math.min(minY, obj.attrs.y);
			maxX = Math.max(maxX, obj.attrs.x + (obj.attrs.width || obj.textWidth));
			maxY = Math.max(maxY, obj.attrs.y + (obj.attrs.height || obj.textHeight));
			maxWidth = Math.max(maxWidth, obj.attrs.width || obj.textWidth);
			maxHeight = Math.max(maxHeight, obj.attrs.height || obj.textHeight);
		});

		const exportImages: any[] = [];
		exportImageObjects.forEach(function (obj) {
			const clonedObj = obj.clone();
			clonedObj.setAttrs({
				x: obj.attrs.x - minX,
				y: obj.attrs.y - minY + 144
			});

			if (clonedObj.text) {
				tempKonvaLayer.add(clonedObj);
				const bufferData = tempKonvaLayer.toDataURL({
					x: clonedObj.attrs.x,
					y: clonedObj.attrs.y,
					width: obj.width(),
					height: obj.height() * 2
				});
				clonedObj.setAttrs({
					width: obj.width(),
					height: obj.height() * 2,
					imagePath: bufferData
				});
				tempKonvaLayer.destroyChildren();
			}

			exportImages.push({ ...clonedObj.attrs });
		});

		let screenShot = null;
		if (width && width !== 0 && height && height !== 0) {
			screenShot = stage.toDataURL({
				x: 0,
				y: 0,
				width: width * stage.scaleX(),
				height: height * stage.scaleY()
			});
		} else {
			screenShot = stage.toDataURL();
		}

		const exportData = {
			fileName: outputFileName || 'export_image.png',
			images: exportImages,
			screenShot,
			width: maxWidth || 0,
			height: maxHeight || 0,
			scale: currentScale
		};
		//@ts-ignore
		window.electronAPI.exportImage(exportData);
	};


  export const processZip = async (psdData: any, zip: any, files: File, layerOption = '') => {
		if (!validatePsd(psdData)) {
			alert("Can't nested #");

			return;
		}

		psdData.layers.sort(layerCustomSort);
		const processingLayer: any[] = [];
		for (let i = 0; i < psdData.layers.length; i++) {
			const layer = psdData.layers[i];
			if (!layer) return;

			createLayer(
				layer,
				undefined,
				undefined,
				zip,
				files,
				layerOption,
				layer.name,
				processingLayer
			);
		}

		await Promise.all(processingLayer);
		resetLayerIndexes();

		document.querySelectorAll<HTMLElement>('.toggle-visibility').forEach((elem) => {
			elem.addEventListener('click', async function (event) {
				event.stopPropagation();
				toggleVisibility(elem);
			});
		});

		document.querySelectorAll('.toggle-options').forEach((elem) => {
			elem.addEventListener('click', async (event) => {
				event.stopPropagation();

				if (elem.getAttribute('checked') !== null) {
					return;
				}

				Notiflix.Loading.standard('<span id="processed-layers">Processing</span>');

				resetContainer();
				const forAttribute = elem.getAttribute('for');
				if (forAttribute) {
					await processZip(psdData, zip, files, forAttribute);
				}
				Notiflix.Loading.remove();
			});
		});

		initScaleValue();
		initSelectList();
		initScreen(psdData.width, psdData.height);
		exportImage('0', psdData.width, psdData.height);
		Notiflix.Loading.remove();

		if (psdData.missing_fonts) {
			for (const fonts of psdData.missing_fonts) {
				Toastify({
					text: `Missing font: '${fonts}.ttf'`,
					duration: 10000,
					position: 'right',
					style: {
						background: 'linear-gradient(to right, #ff5f6d, #ffc371)'
					}
				}).showToast();
			}
		}
	};

  //@ts-ignore
  window.electronAPI.onProcessPsdDone(async (value: any) => {
		//@ts-ignore
		uploadPSDInput.value = '';

		if (value.success) {
			if (value.data) {
				//@ts-ignore
				await processZip(value.data);
			} else {
				Toastify({
					text: value.message,
					duration: 10000,
					position: 'right',
					style: {
						background: 'linear-gradient(to right, #11998e, #38ef7d)'
					}
				}).showToast();
			}

			Notiflix.Loading.remove();
		} else {
			alert('Error: ' + value.message);
			Notiflix.Loading.remove();
		}
	});
</script>

<div
	class="w-[25%] h-[100vh] bg-yellow-50 relative"
	style="max-width: 25%; min-width: 25%;"
	id="sidebar"
>
	<div class="w-full h-[10%]">
		<label for="custom-font">Custom Font:</label>
		<input id="custom-font" type="file" accept=".ttf" on:change={handleCustomFont} />
	</div>
	<br />
	<div
		class="overflow-auto"
		id="order-list"
		style="padding-bottom: 1rem; height: 90%;"
		bind:this={orderListElement}
	/>
	<div
		id="progress-bar-container"
		class="w-[250px] mx-auto h-6 bg-gray-200 rounded-lg overflow-hidden mb-4"
		style="position: relative; display: none"
	>
		<div id="progress-bar" class="bg-[#f3bf72] h-full" style="width: 0%" />
		<div
			id="progress-text"
			style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.75rem;
      color: #000;
    "
		/>
	</div>
</div>
