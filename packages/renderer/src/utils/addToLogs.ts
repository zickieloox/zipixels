const logElement: HTMLElement | null = document.getElementById('logs');

export const addToLogs = (orderId: string, action: string): void => {
	if (!logElement) {
		console.error('Log element not found');
		return;
	}

	const logItem: HTMLParagraphElement = document.createElement('p');
	logItem.className = 'line-clamp-2';
	logItem.innerHTML = `${new Date().toLocaleString()} - ${orderId
		.replaceAll('<', '')
		.replaceAll('>', '')
		.replaceAll('+', '')
		.replaceAll('\u00A0', ' ')} - ${action}`;
	logElement.appendChild(logItem);
};
