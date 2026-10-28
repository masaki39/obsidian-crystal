import { requestUrl } from 'obsidian';
import type { AtpAgent } from '@atproto/api';

export interface UrlMetadata {
	title: string;
	description: string;
	image: string;
}

export function extractMetadataFromHtml(html: string): UrlMetadata | null {
	try {
		let title = '';
		const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
		if (ogTitleMatch) {
			title = ogTitleMatch[1];
		} else {
			const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
			if (titleMatch) {
				title = titleMatch[1];
			}
		}

		let description = '';
		const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
		if (ogDescMatch) {
			description = ogDescMatch[1];
		} else {
			const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
			if (descMatch) {
				description = descMatch[1];
			}
		}

		let image = '';
		const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
		if (ogImageMatch) {
			image = ogImageMatch[1];
		}

		title = decodeHtmlEntities(title);
		description = decodeHtmlEntities(description);

		if (!title && !description) {
			return null;
		}

		return { title, description, image };
	} catch (error) {
		console.error('Error extracting metadata from HTML:', error);
		return null;
	}
}

function decodeHtmlEntities(text: string): string {
	const entities: { [key: string]: string } = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
	};

	return text.replace(/&[#\w]+;/g, (entity) => {
		return entities[entity] || entity;
	});
}

export async function getUrlMetadata(url: string): Promise<UrlMetadata | null> {
	try {
		const response = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		if (response.status !== 200) {
			return null;
		}

		return extractMetadataFromHtml(response.text);
	} catch (error) {
		console.error('Error fetching URL metadata:', error);
		return null;
	}
}

export async function createEmbedCard(agent: AtpAgent | null, url: string): Promise<any | null> {
	if (!agent) return null;

	try {
		const metadata = await getUrlMetadata(url);

		let title, description;
		if (!metadata) {
			try {
				const urlObj = new URL(url);
				title = urlObj.hostname;
				description = '';
			} catch (urlError) {
				return null;
			}
		} else {
			title = metadata.title || url;
			description = metadata.description || '';
		}

		let thumb;
		if (metadata?.image) {
			try {
				const imageResponse = await requestUrl({
					url: metadata.image,
					method: 'GET',
				});

				if (imageResponse.status === 200) {
					const uint8Array = new Uint8Array(imageResponse.arrayBuffer);
					let encoding = 'image/jpeg';
					if (metadata.image.toLowerCase().includes('.png')) {
						encoding = 'image/png';
					} else if (metadata.image.toLowerCase().includes('.webp')) {
						encoding = 'image/webp';
					}
					const { data } = await agent.uploadBlob(uint8Array, { encoding });
					thumb = data.blob;
				}
			} catch (imageError) {
				console.warn('Failed to upload image for embed:', imageError);
			}
		}

		return {
			$type: 'app.bsky.embed.external',
			external: {
				uri: url,
				title: title,
				description: description,
				thumb: thumb,
			},
		};
	} catch (error) {
		console.error('Error creating embed card:', error);
		return null;
	}
}

export function extractUrls(text: string): string[] {
	const urlRegex = /https?:\/\/[^\s]+/g;
	return text.match(urlRegex) || [];
}
