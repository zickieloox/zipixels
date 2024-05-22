import axios from 'axios';

interface TemplateData {
	success: boolean;
	message: string;
	data?: any;
}

async function handleGetTemplates(event: any): Promise<void> {
	try {
		const { data }: { data: TemplateData } = await axios.get(
			`${process.env.FASTIFY_URL}/templates`
		);
		const templates = data.data;

		event.reply('get-templates-done', {
			success: data.success,
			message: data.message,
			data: templates
		});
	} catch (error) {
		console.log(`Get templates error: ${error}`);

		event.reply('get-templates-done', {
			success: false,
			message: 'Get templates failed'
		});
	}
}

async function handleGetDetailTemplate(event: any, templateId: string): Promise<void> {
	try {
		const { data }: { data: TemplateData } = await axios.get(
			`${process.env.FASTIFY_URL}/templates/${templateId}`
		);
		const detailTemplate = data.data;

		event.reply('get-detail-template-done', {
			success: data.success,
			message: data.message,
			data: detailTemplate
		});
	} catch (error) {
		console.log(`Get detail templates error: ${error}`);

		event.reply('get-detail-template-done', {
			success: false,
			message: 'Get templates failed'
		});
	}
}

export { handleGetTemplates, handleGetDetailTemplate };
