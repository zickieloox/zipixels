<script lang="ts">
	import { Toastify } from 'toastify-js';
	import { handleCustomFont } from '../../main2';
	import { onMount } from 'svelte';
	import Konva from 'konva';

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

	export let stage: Konva.Stage;
	let tempStage: Konva.Stage;
	export let konvaLayer: Konva.Layer;
	let tempKonvaLayer: Konva.Layer;

	function drawKonva() {
		stage = new Konva.Stage({
			container: 'container',
			width: canvasWidth,
			height: canvasHeight,
			draggable: true
		});

		stage.scale({
			x: MIN_SCALE,
			y: MIN_SCALE
		});

		konvaLayer = new Konva.Layer();

		tempStage = new Konva.Stage({
			container: 'temp-container',
			width: canvasWidth,
			height: canvasHeight,
			draggable: true
		});

		tempKonvaLayer = new Konva.Layer();

		const backgroundImage = new Image();
		backgroundImage.src =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAWBAMAAACrl3iAAAAABlBMVEUAAAD+AciWmZzWAAAAAnRSTlMAApidrBQAAAB9SURBVBjTbVGBDcAgDKIf8P+1iwhtY1YTtRkgZcB/1S3ddkd95Vmcrg4CBwid7oQy1ic3+movNMIRztp+26udTPH1jWwmGRbDUqeuFoxxecqA8JDNnDzuhseISH5k+S6HYhLbM9HqnUJNkJNGlBMh1nCxDTwJXiTXv2xpMT5HqQWkLibjHgAAAABJRU5ErkJggg==';
		backgroundImage.onload = function () {
			const transparentBg = new Konva.Image({
				x: 0,
				y: 0,
				image: backgroundImage,
				width: canvasWidth,
				height: canvasHeight
			});

			konvaLayer.add(transparentBg);
			stage.add(konvaLayer);

			tempKonvaLayer.add(transparentBg);
			tempStage.add(tempKonvaLayer);
		};

		stage.on('wheel', (e) => {
			e.evt.preventDefault();

			const oldScale = stage.scaleX();
			const pointer = stage.getPointerPosition();

			const mousePointTo = {
				x: (pointer!.x - stage.x()) / oldScale,
				y: (pointer!.y - stage.y()) / oldScale
			};

			const direction = e.evt.deltaY > 0 ? -1 : 1;

			const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
			if (newScale < MIN_SCALE || newScale > MAX_SCALE) return;
			//@ts-ignore
			zoomElement.value = newScale * INITIAL_ZOOM_PERCENT;
			stage.scale({ x: newScale, y: newScale });

			const newPos = {
				x: pointer!.x - mousePointTo.x * newScale,
				y: pointer!.y - mousePointTo.y * newScale
			};

			stage.position(newPos);
		});
	}

	onMount(drawKonva);

	//
	export const resetContainer = (): void => {
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
  export let orderListContent;

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
	) => {}
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
  {@html orderListContent}
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
