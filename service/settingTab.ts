import { App,  PluginSettingTab, Setting } from 'obsidian';
import { WorkflowPluginSettings } from './settings';
import WorkflowPlugin from '../main'; // 引入插件主类
import { ConfirmModal } from '../utils/modal';

export class WorkflowSettingTab extends PluginSettingTab {
    private settings: WorkflowPluginSettings;
    private saveSettings: (settings: WorkflowPluginSettings) => Promise<void>;
    private resetDefaultSettings: () => Promise<void>;

    constructor(
        app: App, 
        plugin: WorkflowPlugin, // 接收插件实例
        saveSettings: (settings: WorkflowPluginSettings) => Promise<void>,
        resetDefaultSettings: () => Promise<void>
    ) {
        super(app, plugin); // 传递插件实例给父类
        this.settings = plugin.settings; // 从插件实例获取 settings
        this.saveSettings = saveSettings;
        this.resetDefaultSettings = resetDefaultSettings;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: '每日笔记参数设置'});

        // 文件夹设置
        new Setting(containerEl)
            .setName('日记文件夹路径')
            .setDesc('日记文件的存储位置')
            .addText(text => text
                .setPlaceholder('workFlow/daily')
                .setValue(this.settings.dailyFolder)
                .onChange(async (value) => {
                    this.settings.dailyFolder = value;
                    await this.saveSettings(this.settings);
                }));

        new Setting(containerEl)
            .setName('周记文件夹路径')
            .setDesc('周记文件的存储位置')
            .addText(text => text
                .setPlaceholder('workFlow/weekly')
                .setValue(this.settings.weeklyFolder)
                .onChange(async (value) => {
                    this.settings.weeklyFolder = value;
                    await this.saveSettings(this.settings);
                }));

        new Setting(containerEl)
            .setName('项目文件夹路径')
            .setDesc('项目文件的存储位置')
            .addText(text => text
                .setPlaceholder('workFlow/projects')
                .setValue(this.settings.projectFolder)
                .onChange(async (value) => {
                    this.settings.projectFolder = value;
                    await this.saveSettings(this.settings);
                }));

        new Setting(containerEl)
            .setName('会议记录文件夹路径')
            .setDesc('会议记录文件的存储位置')
            .addText(text => text
                .setPlaceholder('workFlow/meetings')
                .setValue(this.settings.meetingFolder)
                .onChange(async (value) => {
                    this.settings.meetingFolder = value;
                    await this.saveSettings(this.settings);
                }));

        // 自动创建设置
        new Setting(containerEl)
            .setName('自动创建日记')
            .setDesc('每日首次启动时自动创建日记')
            .addToggle(toggle => toggle
                .setValue(this.settings.autoCreate)
                .onChange(async (value) => {
                    this.settings.autoCreate = value;
                    await this.saveSettings(this.settings);
                }));

        // 语言设置
        new Setting(containerEl)
            .setName('语言')
            .setDesc('插件使用的语言')
            .addDropdown(dropdown => dropdown
                .addOption('zh', '中文')
                .addOption('en', '英文')
                .setValue(this.settings.language)
                .onChange(async (value) => {
                    this.settings.language = value;
                    await this.saveSettings(this.settings);
                }));
        new Setting(containerEl)
        .setName('恢复默认设置')
        .setDesc('将所有设置恢复为初始值')
        .addButton(button => button
            .setButtonText('恢复默认')
            .setWarning() // 设置为警告样式（红色按钮）
            .onClick(async () => {
                // if (confirm('确定要恢复所有设置为默认值吗？')) {
                //     await this.resetDefaultSettings();
                //     // 重新加载设置面板以显示默认值
                //     this.display();
                // }
                new ConfirmModal(this.app, async () => {
                    console.log('恢复默认设置');
                    await this.resetDefaultSettings();
                    this.settings = this.plugin.settings;
                    // 重新加载设置面板以显示默认值
                    this.display();
                }).open();
            })
        );
        // 模板设置
        containerEl.createEl('h3', {text: '日记模板'});
        new Setting(containerEl)
            .addTextArea(text => text
                .setValue(this.settings.dailyTemplate)
                .onChange(async (value) => {
                    this.settings.dailyTemplate = value;
                    await this.saveSettings(this.settings);
                })
                .then(text => {
                    text.inputEl.rows = 10;
                    text.inputEl.cols = 50;
                }));

        containerEl.createEl('h3', {text: '周记模板'});
        new Setting(containerEl)
            .addTextArea(text => text
                .setValue(this.settings.weeklyTemplate)
                .onChange(async (value) => {
                    this.settings.weeklyTemplate = value;
                    await this.saveSettings(this.settings);
                })
                .then(text => {
                    text.inputEl.rows = 10;
                    text.inputEl.cols = 50;
                }));

        containerEl.createEl('h3', {text: '项目模板'});
        new Setting(containerEl)
            .addTextArea(text => text
                .setValue(this.settings.projectTemplate)
                .onChange(async (value) => {
                    this.settings.projectTemplate = value;
                    await this.saveSettings(this.settings);
                })
                .then(text => {
                    text.inputEl.rows = 10;
                    text.inputEl.cols = 50;
                }));

        containerEl.createEl('h3', {text: '会议记录模板'});
        new Setting(containerEl)
            .addTextArea(text => text
                .setValue(this.settings.meetingTemplate)
                .onChange(async (value) => {
                    this.settings.meetingTemplate = value;
                    await this.saveSettings(this.settings);
                })
                .then(text => {
                    text.inputEl.rows = 10;
                    text.inputEl.cols = 50;
                }));
    }
}
