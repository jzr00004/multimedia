import { type Writable } from "svelte/store";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "$lib/utils";

export interface Conversion {
	id: number;
	file: string;
	progress: number;
	status: string;
	outputFormat: string;
	url?: string;
}
export const outputFormats = [
	"mp4",
	"webm",
	"mov",
	"avi",
	"mp3",
	"wav",
	"ogg",
	"flac",
	"aac",
] as const;
export type OutputFormat = (typeof outputFormats)[number];

export function isVideoFormat(format: string): boolean {
	return ["mp4", "webm", "mov", "avi"].includes(format);
}

function getMimeType(format: string): string {
	const mimeTypes: { [key: string]: string } = {
		mp4: "video/mp4",
		webm: "video/webm",
		mov: "video/quicktime",
		avi: "video/x-msvideo",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		flac: "audio/flac",
		aac: "audio/aac",
	};
	return mimeTypes[format] || "application/octet-stream";
}

export function handleFileSelect(event: Event): File[] | undefined {
	const target = event.target as HTMLInputElement;
	if (target.files) {
		return Array.from(target.files);
	}
}

function getFileFormat(fileName: string): string {
	return fileName.split(".").pop()?.toLowerCase() || "";
}

function updateConversionProgress(conversions: Writable<Conversion[]>, id: number, progress: number) {
	conversions.update((convs) =>
		convs.map((conv) =>
			conv.id === id ? { ...conv, progress } : conv,
		),
	);
}

function updateConversionStatus(conversions: Writable<Conversion[]>, id: number, status: string, url?: string) {
	conversions.update((convs) =>
		convs.map((conv) =>
			conv.id === id ? { ...conv, status, url } : conv,
		),
	);
}


export async function startConversion(files: File[], selectedOutputFormat: OutputFormat, conversions: Writable<Conversion[]>): Promise<void> {
	files.forEach((file, index) => {
		const conversion: Conversion = {
			id: Date.now() + index,
			file: file.name,
			progress: 0,
			status: "Converting",
			outputFormat: selectedOutputFormat,
		};
		conversions.update((convs) => [...convs, conversion]);
		convertFile(conversions, file, conversion);
	});
	files = [];
}

/**
 * Empieza la conversión de un archivo concreto desde una instancia nueva de FFMPEG 
 * Asigna las actualizaciones necesarias en caso de "progreso" y "error"
 */
async function convertFile(
	conversions: Writable<Conversion[]>,
	file: File,
	conversion: Conversion,
): Promise<void> {
	try {
		const ffmpeg = new FFmpeg();
		await ffmpeg.load({
			coreURL:
				"https://unpkg.com/@ffmpeg/core@0.12.2/dist/esm/ffmpeg-core.js",
			wasmURL:
				"https://unpkg.com/@ffmpeg/core@0.12.2/dist/esm/ffmpeg-core.wasm",
		});

		ffmpeg.on("progress", ({ progress }: { progress: number }) => {
			updateConversionProgress(
				conversions,
				conversion.id,
				Math.round(progress * 100),
			);
		});

		const inputFileName = file.name;
		const outputFileName = `converted_${file.name.split(".")[0] + Date.now()}.${conversion.outputFormat}`;

		await ffmpeg.writeFile(inputFileName, await fetchFile(file));

		const inputFormat = getFileFormat(inputFileName);
		const outputFormat = conversion.outputFormat;

		const ffmpegCommand = getFfmpegCommand(
			inputFormat,
			outputFormat,
			inputFileName,
			outputFileName,
		);

		await ffmpeg.exec(ffmpegCommand);

		const data = await ffmpeg.readFile(outputFileName);
		const url = URL.createObjectURL(
			new Blob([data], {
				type: getMimeType(outputFormat),
			}),
		);

		updateConversionStatus(conversions, conversion.id, "Completed", url);

		await ffmpeg.deleteFile(inputFileName);
		await ffmpeg.deleteFile(outputFileName);
	} catch (error) {
		console.error("Conversion error:", error);
		updateConversionStatus(conversions, conversion.id, "Error");
	}
}

/**
 * Comandos correspondientes para cada conversión.
 */
function getFfmpegCommand(
	inputFormat: string,
	outputFormat: string,
	inputFileName: string,
	outputFileName: string,
): string[] {
	const baseCommand = ["-i", inputFileName];

	if (inputFormat === outputFormat) {
		return [...baseCommand, "-c", "copy", outputFileName];
	}

	switch (outputFormat) {
		case "mp4":
			return [
				...baseCommand,
				"-c:v",
				"libx264",
				"-crf",
				"23",
				"-c:a",
				"aac",
				"-q:a",
				"100",
				outputFileName,
			];
		case "webm":
			return [
				...baseCommand,
				"-c:v",
				"libvpx",
				"-b:v",
				"1M",
				"-crf",
				"31",
				"-c:a",
				"libvorbis",
				outputFileName,
			];
		case "mov":
			return [
				...baseCommand,
				"-c:v",
				"libx264",
				"-crf",
				"23",
				"-c:a",
				"aac",
				"-q:a",
				"100",
				"-f",
				"mov",
				outputFileName,
			];
		case "avi":
			return [
				...baseCommand,
				"-c:v",
				"libx264",
				"-crf",
				"23",
				"-c:a",
				"mp3",
				"-q:a",
				"100",
				outputFileName,
			];
		case "mp3":
			return [
				...baseCommand,
				"-vn",
				"-ar",
				"44100",
				"-ac",
				"2",
				"-b:a",
				"192k",
				outputFileName,
			];
		case "wav":
			return [
				...baseCommand,
				"-vn",
				"-acodec",
				"pcm_s16le",
				"-ar",
				"44100",
				"-ac",
				"2",
				outputFileName,
			];
		case "ogg":
			return [
				...baseCommand,
				"-c:a",
				"libvorbis",
				"-q:a",
				"4",
				outputFileName,
			];
		case "flac":
			return [
				...baseCommand,
				"-c:a",
				"flac",
				"-compression_level",
				"5",
				outputFileName,
			];
		case "aac":
			return [
				...baseCommand,
				"-c:a",
				"aac",
				"-b:a",
				"192k",
				outputFileName,
			];
		default:
			throw new Error(`Unsupported output format: ${outputFormat}`);
	}
}

