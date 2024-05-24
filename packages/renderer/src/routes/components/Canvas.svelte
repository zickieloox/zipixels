<script lang="ts">
  import { onMount } from "svelte";
  import { writable } from 'svelte/store';

  let canvasWrapperElement: HTMLDivElement | null = null;
  let checkFontCanvas: HTMLCanvasElement;
  let checkFontContext;

  const handleMouseDown = () => {
    if (canvasWrapperElement) {
      canvasWrapperElement.style.cursor = 'grabbing';
    }
  }

  const handleMouseUp = () => {
    if (canvasWrapperElement) {
      canvasWrapperElement.style.cursor = 'grab';
    }
  }

	onMount(() => {
		checkFontContext = checkFontCanvas.getContext('2d');
	});
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

	let arialBmp;

	setTimeout(() => {
		checkFontContext!.drawImage(img, 0, 0);
		arialBmp = checkFontContext!.getImageData(0, 0, 500, 100).data;
		checkFontContext!.clearRect(0, 0, checkFontCanvas.width, checkFontCanvas.height);
	}, 0);

	export const checkFontInstalled = (font: any) => {
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

				for (let i = 0; i < arialBmp.length; i++) {
					if (arialBmp![i] !== fontBmp[i]) {
						resolve(true);
					}
				}

				resolve(false);
			}, 0);
		});
	};

  export const fontUtils = writable({
    checkFontInstalled
  });

</script>

  <canvas
		id="check-font-container"
		width="500"
		height="100"
		style="display: none;"
		bind:this={checkFontCanvas}
  />

	<div
		class="cursor-grab w-full h-[100vh] overflow-hidden min-w-[75%]"
		id="canvas-wrapper"
		bind:this={canvasWrapperElement}
		on:mousedown={handleMouseDown}
		on:mouseup={handleMouseUp}
	>
		<div id="container" />
		<div id="temp-container" class="hidden" />
	</div>

  <style>
    #canvas-wrapper {
      /* border: 1px solid black !important; */
      background: url('https://i.imgur.com/Jo2gxXr.png');
    }

    li {
      list-style: none;
    }
  </style>
