<script lang="ts">
  import type Konva from "konva";
  export let stage: Konva.Stage;
  export let konvaLayer: Konva.Layer;
  import { handleCustomFont } from "../../main2";
  let orderListElement: HTMLElement;
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

  const MIN_SCALE = 0.05;

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
		defaultShowText  = false;
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

</script>

<div
	class="w-[25%] h-[100vh] bg-yellow-50 relative"
	style="max-width: 25%; min-width: 25%;"
	id="sidebar"
>
	<div class="w-full h-[10%]">
		<label for="custom-font">Custom Font:</label>
		<input id="custom-font" type="file" accept=".ttf" on:change={handleCustomFont}/>
	</div>
	<br />
	<div class="overflow-auto" id="order-list" style="padding-bottom: 1rem; height: 90%;" bind:this={orderListElement}></div>

	<div
		id="progress-bar-container"
		class="w-[250px] mx-auto h-6 bg-gray-200 rounded-lg overflow-hidden mb-4"
		style="position: relative; display: none"
	>
		<div id="progress-bar" class="bg-[#f3bf72] h-full" style="width: 0%"></div>
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
		></div>
	</div>
</div>
