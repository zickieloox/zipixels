	<script lang="ts">
    import 'notiflix/dist/notiflix-3.2.6.min.css';
	  import Notiflix from 'notiflix';
	  import Toastify from 'toastify-js';

    import { handleFileInput, handleExportImage, handleMergeSVGFilesInput, handleReset, handleUploadServer, handleDownloadSvg, handleZoomInput, handleTemplatesChange} from '../../main2';

    export let uploadPSDInput: HTMLElement;
    export let zoomElement: HTMLElement;
    let templatesElement: HTMLElement;
    let downloadSvgElement: HTMLElement;

  let fileName = '';
	let fileSize = 0;

  async function handleUploadPSDInput(event: Event): Promise<void> {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		//@ts-ignore
		uploadPSDInput.value = null;

		Notiflix.Loading.standard('<span id="processed-layers">0</span> layers processed');

		if (file) {
			fileName = file.path;
			fileSize = file.size;

			if (file.path.endsWith('.psd')) {
				//@ts-ignore
				await window.electronAPI.processPsd(file.path);
			} else if (file.path.endsWith('.svg')) {
				//@ts-ignore
				await window.electronAPI.processSvg(file.path);
			}
		}
	}
  </script>

  <input
		type="range"
		min="10"
		max="100"
		value="10"
		class="fixed top-[calc(100vh-40px)] right-[290px] hidden"
		id="zoom"
    on:input={handleZoomInput}
    bind:this={zoomElement}
	/>

	<label
		for="upload-psd-input"
		class="fixed cursor-pointer top-4 left-4 border border-gray-300 p-2 bg-white rounded-md"
		>Upload PSD file</label
	>
	<input type="file" id="upload-psd-input" class="hidden" accept=".psd, .svg" on:input={handleUploadPSDInput} bind:this={uploadPSDInput}/>

	<button
		id="reset-btn"
		type="button"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 10rem;"
    on:click={handleReset}
	>
		Reset
	</button>

	<button
		id="export-image-btn"
		type="button"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 14.5rem;"
    on:click={handleExportImage}
  >
		Export Image
	</button>

	<button
		id="upload-to-server"
		type="button"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 22.5rem;"
    on:click={handleUploadServer}
	>
		Upload To Server
	</button>

	<label
		for="merge-svg-png"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 32rem;"
	>
		Merge SVG/PNG
	</label>
	<input type="file" id="merge-svg-png" accept=".png, .svg" class="hidden" multiple on:click={handleMergeSVGFilesInput} />

	<button
		id="download-svg"
		type="button"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 41rem;"
    on:click={handleDownloadSvg}
    bind:this={downloadSvgElement}
	>
		Download SVG
	</button>

	<select
		id="templates"
		name="templates"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 49rem; max-width: 165px;"
    on:change={handleTemplatesChange}
    bind:this={templatesElement}
	>
		<option value="" selected>Select a template</option>
	</select>
