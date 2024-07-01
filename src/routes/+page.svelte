<script lang="ts">
	import { onMount } from "svelte";
	import "../app.css";
	import {
		handleFileSelect,
		isVideoFormat,
		outputFormats,
		startConversion,
		type Conversion,
		type OutputFormat,
	} from "$lib";
	import { writable, type Writable } from "svelte/store";

	let files: File[] = [];
	let conversions: Writable<Conversion[]> = writable([]);
	let selectedOutputFormat: OutputFormat = outputFormats[0];
	let audioPlayer: HTMLAudioElement | null = null;
	let videoPlayer: HTMLVideoElement | null = null;

	function convertSelectedFiles() {
		startConversion(files, selectedOutputFormat, conversions);
	}

	function readFiles(event: Event) {
		files = handleFileSelect(event) || [];
	}

	function playMedia(format: string, url: string) {
		const player = isVideoFormat(format) ? videoPlayer : audioPlayer;
		if (!player) {
			console.error("failed to play media");
			return;
		}
		player.src = url;
		player.load();
		player.play().catch((error) => {
			console.error("playback failed:", error);
		});
	}

	onMount(() => {
		audioPlayer = document.getElementById(
			"audioPlayer",
		) as HTMLAudioElement;
		videoPlayer = document.getElementById(
			"videoPlayer",
		) as HTMLVideoElement;
	});
</script>

<svelte:head>
	<title>Conversor Multimedia</title>
	<style>
		/*
			Defino la fuente aqui en vez de con el resto de estilos debido a un bug en el sistema de build.
			https://www.reddit.com/r/sveltejs/comments/17zgr1p/sveltekit_cannot_get_fonts_in_static_to_work_in/
		*/
		@font-face {
			font-family: "Abadi Pro Bold";
			src: url(abadi-mt-pro-bold.ttf);
		}
	</style>
</svelte:head>

<main class="min-h-screen bg-gray-900 text-gray-100 p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-4xl font-bold mb-8 text-center text-blue-400">
			Media Converter
		</h1>

		<div
			class="mb-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4"
		>
			<input
				type="file"
				multiple
				on:change={readFiles}
				accept="audio/*,video/*"
				class="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-gray-300"
			/>
			<select
				bind:value={selectedOutputFormat}
				class="bg-gray-800 text-gray-100 py-2 px-4 rounded-full border-2 border-blue-500 focus:outline-none focus:border-blue-600"
			>
				{#each outputFormats as format}
					<option value={format}>{format.toUpperCase()}</option>
				{/each}
			</select>
			<button
				on:click={convertSelectedFiles}
				disabled={files.length === 0}
				class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-300 ease-in-out transform hover:scale-105"
			>
				Convert Files
			</button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<div class="space-y-6">
				<h2 class="text-2xl font-semibold mb-4 text-blue-300">
					Conversions
				</h2>
				{#each $conversions as conversion (conversion.id)}
					<div class="bg-gray-800 p-6 rounded-lg shadow-lg">
						<p class="font-medium text-lg mb-2">
							{conversion.file} to {conversion.outputFormat}
						</p>
						<div class="w-full bg-gray-700 rounded-full h-2.5 mb-4">
							<div
								class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
								style="width: {conversion.progress}%"
							></div>
						</div>
						<p class="text-sm mb-2">
							Status: <span class="font-semibold"
								>{conversion.status}</span
							>
						</p>
						{#if conversion.url}
							<div class="flex space-x-4">
								<a
									href={conversion.url}
									download={`${conversion.file.split(".")[0]}.${conversion.outputFormat}`}
									class="text-blue-400 hover:text-blue-300 underline transition duration-300 ease-in-out"
								>
									Download
								</a>
								<button
									on:click={() =>
										playMedia(
											conversion.outputFormat,
											conversion.url || "",
										)}
									class="text-green-400 hover:text-green-300 underline transition duration-300 ease-in-out"
								>
									Play
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div>
				<h2 class="text-2xl font-semibold mb-4 text-blue-300">
					Media Player
				</h2>
				<div class="space-y-6">
					<div class="bg-gray-800 p-6 rounded-lg shadow-lg">
						<h3 class="text-lg font-medium mb-4">Audio Player</h3>
						<audio id="audioPlayer" controls class="w-full">
							Your browser does not support the audio element.
						</audio>
					</div>
					<div class="bg-gray-800 p-6 rounded-lg shadow-lg">
						<h3 class="text-lg font-medium mb-4">Video Player</h3>
						<video id="videoPlayer" controls class="w-full">
							<track kind="captions" />
							Your browser does not support the video tag.
						</video>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: "Abadi Pro Bold", sans-serif;
		background-color: #111827;
		color: #f3f4f6;
	}

	audio::-webkit-media-controls-panel,
	video::-webkit-media-controls-panel {
		background-color: #1f2937;
	}

	audio::-webkit-media-controls-current-time-display,
	audio::-webkit-media-controls-time-remaining-display,
	video::-webkit-media-controls-current-time-display,
	video::-webkit-media-controls-time-remaining-display {
		color: #f3f4f6;
	}
</style>
