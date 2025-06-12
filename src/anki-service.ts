import { App, Notice } from "obsidian";
import { promptForText } from "./utils";

export class AnkiService {
	static addNote(front: string, back: string) {
		throw new Error('Method not implemented.');
	}
    constructor(private readonly app: App) {
        this.app = app;
    }    

    async invoke(action: string, version: number, params: any = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => reject('failed to issue request'));
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (Object.getOwnPropertyNames(response).length != 2) {
                        throw 'response has an unexpected number of fields';
                    }
                    if (!response.hasOwnProperty('error')) {
                        throw 'response is missing required error field';
                    }
                    if (!response.hasOwnProperty('result')) {
                        throw 'response is missing required result field';
                    }
                    if (response.error) {
                        throw response.error;
                    }
                    resolve(response.result);
                } catch (e) {
                    reject(e);
                }
            });
    
            xhr.open('POST', 'http://127.0.0.1:8765');
            xhr.send(JSON.stringify({action, version, params}));
        });
    }

    async addNote(front: string, back: string) {
        return this.invoke("addNote", 6, {
            "note": {
                "deckName": "Default",
                "modelName": "基本",
                "fields": {
                    "表面": front,
                    "裏面": back
                },
                "options": {
                    "allowDuplicate": false
                }
            }
        });
    }

    async addNoteFromPrompt() {
        const front = await promptForText(this.app, '表面', '英単語を入力してください', '追加');
        if (!front) {
            return;
        }
        const back = await promptForText(this.app, '裏面', '日本語を入力してください', '追加');
        if (!back) {
            return;
        }
        await this.addNote(front, back);
        new Notice('Note added to Anki');
    }
}