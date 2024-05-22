export const createImageElementFromUrl = async (url: string): Promise<HTMLImageElement | null> => {
	const baseImage = new Image();

	const loadImage = (imageUrl: string): Promise<void> => {
		return new Promise((resolve, reject) => {
			baseImage.onload = () => resolve();
			baseImage.onerror = () => reject(new Error('Failed to load image'));
			baseImage.src = imageUrl;
		});
	};

	try {
		await loadImage(url);

		return baseImage;
	} catch (error) {
		console.error('Error loading image:', error);
		return null;
	}
};
