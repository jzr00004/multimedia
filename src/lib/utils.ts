/**
 * Implementación de [@@fmpeg/utils] fetchFile debido a 
 * https://github.com/ffmpegwasm/ffmpeg.wasm/issues/603
 */

export async function fetchFile(file: Blob): Promise<Uint8Array> {
	return new Promise((resolve) => {
		const fileReader = new FileReader();

		fileReader.onload = () => {
			const { result } = fileReader;
			if (result instanceof ArrayBuffer) {
				resolve(new Uint8Array(result));
			}
		};
		fileReader.readAsArrayBuffer(file);
	});
}