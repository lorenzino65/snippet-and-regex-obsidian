import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting
} from "obsidian";
import { getWord, checkContext, parseResponse } from './trigger'
import { getSnippets, createSnippets } from "./snippets"
import { Extension, Prec } from '@codemirror/state';
import { KeyBinding, keymap } from '@codemirror/view';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	snippetsDir: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
	snippetsDir: "snippets"
};

export default class MyPlugin extends Plugin {
	private settings: MyPluginSettings;
	private stateMachine;
	private snippetsData;// object of 2 objects: fullWord:["Hello":{response,context},...], partWord:["Ciao":response,...]
	// condition on metadata to test for the setting of the snippet found:
	private contextConditions;
	jumpPos: { start: number, end: number }[];
	public async onload(): Promise<void> {
		console.log("Start Loading Snippet Plugin")
		await this.loadSettings();

		this.app.metadataCache.on("resolved", async function stateMachineCallback() {

			console.log("Loading StateMachine")

			this.app.metadataCache.off("resolved", stateMachineCallback);

			({ stateMachine: this.stateMachine, snippetsData: this.snippetsData }
				= await getSnippets(this.settings.snippetsDir));
		}, this)
		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon(
		// 	"dice",
		// 	"Sample Plugin",
		// 	(evt: MouseEvent) => {
		// 		// Called when the user clicks the icon.


		// 		new Notice("This is a notice!");
		// 	}
		// );
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Status Bar Text");
		// statusBarItemEl.onClickEvent((e) => {
		// 	console.log("CLICK");
		// });
		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: "open-sample-modal-simple",
		// 	name: "Open sample modal (simple)",
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	},
		// });

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "refresh-snippets-from-user-data",
			name: "Refresh Snippets Data",
			callback: async () => {
				console.log("reloading Snippets");
				({ stateMachine: this.stateMachine, snippetsData: this.snippetsData }
					= await createSnippets(this.settings.snippetsDir));
			},
		});
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: "open-sample-modal-complex",
		// 	name: "Open sample modal (complex)",
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView =
		// 			this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	},
		// });



		this.registerEditorExtension(this.makeEditorExtension());


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });
		/**(async() => {
	let _foo = await new Promise(res => {
		Object.defineProperty(obj, "foo", { set: res });
	});
	console.log("obj.foo is defined with value:", _foo);
})(); */
		this.registerEvent(
			this.app.workspace.on(
				"editor-change",
				(editor: Editor, markdownView: MarkdownView) => {

					if (editor.hasFocus()) {
						const cursor = editor.getCursor();
						const { word, start } = getWord(editor.getLine(cursor.line), cursor.ch);
						if (word != '') {
							console.log(word)
							// if (word == "ls") {
							// 	editor.replaceRange("ciao", { line: cursor.line, ch: start }, cursor)
							// }else if (word == "ciao") {
							// 	editor.replaceRange("helloWorld\naaddio", { line: cursor.line, ch: start }, cursor)
							// }
							const [startIndex, tag, variables] = this.stateMachine.match(word)
							if (startIndex !== -1) {
								let startOffset = editor.posToOffset({ line: cursor.line, ch: start + startIndex })
								let match;
								if (startIndex === 0) {
									match = this.snippetsData.fullWord[tag[0]]
									if (match) {
										if (checkContext(match.context, this.contextConditions)) {
											let [response, jumpPos] = parseResponse(match.response, variables)
											jumpPos = jumpPos.concat(this.jumpPos)
											this.jumpPos = jumpPos;
											// evidenzi solo quello che servira, volta per volta
											editor.replaceRange(response, { line: cursor.line, ch: start + startIndex }, cursor)
											editor.setSelections([{ anchor: editor.offsetToPos(startOffset + 15), head: editor.offsetToPos(startOffset + 30) }, { anchor: editor.offsetToPos(startOffset + 35), head: editor.offsetToPos(startOffset + 40) }])
											// editor.setSelection()
											return;
										}
									}

								}
								console.log(this.snippetsData.partWord[tag[0]])
								console.log('match:', startIndex, tag);
								console.log(word.slice(startIndex))
								console.log("end", markdownView.editor.getCursor())
								console.log("start", start)
							}

						}

					}
				}
			)
		);

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );
		console.log("Finished Snippet Plugin Configuration")
	}

	public onunload(): void { }

	// makeEditorExtension is used to bind Tab and Enter in the new CM6 Live Preview editor.
	private readonly makeEditorExtension = (): Extension => {
		const keymaps: KeyBinding[] = [];

		keymaps.push({
			key: "ArrowUp",
			run: (): boolean => { console.log("oks"); return false }
		})
		keymaps.push({
			key: "ArrowDown",
			run: (): boolean => { console.log("oks"); return false }
		})
		keymaps.push({
			key: "ArrowLeft",
			run: (): boolean => { console.log("oks"); return false }
		})
		keymaps.push({
			key: "ArrowRight",
			run: (): boolean => { console.log("oks"); return false; }
		})
		// if (false) {
		// 	keymaps.push({
		// 		key: 'Enter',
		// 		run: (): boolean =>
		// 			this.newPerformAction((te: TableEditor) => te.nextRow())(),
		// 		preventDefault: true,
		// 	});console.log("Loading StateMachine")
		// }
		// if (this.settings.bindTab) {
		// 	keymaps.push({
		// 		key: 'Tab',
		// 		run: (): boolean =>
		// 			this.newPerformAction((te: TableEditor) => te.nextCell())(),
		// 		shift: (): boolean =>
		// 			this.newPerformAction((te: TableEditor) =>
		// 				te.previousCell(),
		// 			)(),
		// 		preventDefault: true,
		// 	});
		// }

		return Prec.override(keymap.of(keymaps));
	};

	private readonly newPerformAction = (fn: (te: TableEditor) => void): (() => boolean) =>
		(): boolean => {
			const leaf = this.app.workspace.activeLeaf;
			if (leaf.view instanceof MarkdownView) {
				const te = new TableEditor(
					this.app,
					leaf.view.file,
					leaf.view.editor,
					this.settings,
				);

				if (te.cursorIsInTable()) {
					fn(te);
					return true;
				}
			}
			return false;
		};

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		// let activeLeaf = this.app.workspace.activeLeaf;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Snippet Dir")
			.setDesc("Directory inside Vault where all your snippets are saved")
			.addText((text) =>
				text
					.setPlaceholder("snippets")
					.setValue(this.plugin.settings.snippetsDir)
					.onChange(async (value) => {
						// console.log("Secret: " + value);
						this.plugin.settings.snippetsDir = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
