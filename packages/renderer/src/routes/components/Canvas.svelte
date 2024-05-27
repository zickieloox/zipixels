<script lang="ts">
  import { onMount } from "svelte";
  import { fontStore } from '../stores';

  let canvasWrapperElement: HTMLDivElement | null = null;
  let checkFontCanvas: HTMLCanvasElement;

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

  onMount(async () => {
    await fontStore.update(store => {
      store.initializeFontCheck(checkFontCanvas);
      return store;
    });
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
    background: url('https://i.imgur.com/Jo2gxXr.png');
  }

  li {
    list-style: none;
  }
</style>
