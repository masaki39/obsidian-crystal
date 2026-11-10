import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { promptForText } from '../../shared/ui/prompt-modal';

/**
 * Insert OGP link at cursor position
 */
export async function insertOgpLink(app: App, editor: Editor, view: MarkdownView, layout: 'horizontal' | 'vertical') {
	const url = await promptForText(
		app,
		'Enter URL',
		'https://example.com',
		'Insert'
	);

	if (!url) {
		return;
	}

	// Validate URL format
	try {
		new URL(url);
	} catch (error) {
		new Notice('⚠️ Invalid URL');
		return;
	}

	// Create layout option parameter
	const layoutOption = layout === 'horizontal' ? '' : `&layout=${layout}`;

	// Create OGP link markdown
	const ogpLink = `[![](https://ogpf.vercel.app/c?url=${url}${layoutOption})](${url})`;

	// Insert at cursor position
	editor.replaceSelection(ogpLink);

	new Notice('✅ OGP link inserted');
}
