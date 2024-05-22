import { join } from 'path';

async function handleRequireLog(event: any, filePath: string): Promise<void> {
	event.reply('on-log', [
		__dirname,
		process.cwd(),
		process.env.EXE_PATH,
		join(process.cwd(), 'main.exe')
	]);
}

export { handleRequireLog };
