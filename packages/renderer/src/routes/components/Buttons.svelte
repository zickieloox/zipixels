	<script lang="ts">
    import { handleFileInput, handleExportImage, handleMergeSVGFilesInput, handleReset, handleUploadServer, handleDownloadSvg, handleZoomInput, handleTemplatesChange} from '../../main2';
  </script>

  <input
		type="range"
		min="10"
		max="100"
		value="10"
		class="fixed top-[calc(100vh-40px)] right-[290px] hidden"
		id="zoom"
    on:input={handleZoomInput}
	/>

	<label
		for="upload-psd-input"
		class="fixed cursor-pointer top-4 left-4 border border-gray-300 p-2 bg-white rounded-md"
		>Upload PSD file</label
	>
	<input type="file" id="upload-psd-input" class="hidden" accept=".psd, .svg" on:input={handleFileInput}/>

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
	>
		Download SVG
	</button>

	<select
		id="templates"
		name="templates"
		class="fixed cursor-pointer top-4 border border-gray-300 p-2 bg-white rounded-md"
		style="left: 49rem; max-width: 165px;"
    on:change={handleTemplatesChange}
	>
		<option value="" selected>Select a template</option>
	</select>
