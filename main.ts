import { Plugin, TFile } from 'obsidian';
import { WorkflowPluginSettings, SettingsManager } from './service/settings';
import { FileManager } from './utils/fileManager';
import { DateUtils } from './utils/dateUtils';
import { PromptModal } from './utils/modal';
import { WorkflowSettingTab } from './service/settingTab';

export default class WorkflowPlugin extends Plugin {
    settings: WorkflowPluginSettings;
    ribbonIconEl: HTMLElement;
    private settingsManager: SettingsManager;
    private fileManager: FileManager;
    private dateUtils: DateUtils;

    async onload() {
        console.log('loading workflow plugin');

        // 初始化管理类
        this.settingsManager = new SettingsManager(this);
        this.settings = await this.settingsManager.loadSettings();
        this.fileManager = new FileManager(this.app, this.settings);
        this.dateUtils = new DateUtils(this.settings);

        console.log('addRibbonIcon:');
        // 添加Ribbon按钮
        this.addRibbonIcon('calendar', '打开今日日记', () => {
            this.createOrOpenDailyNote();
        });
        this.addRibbonIcon('target', '创建项目', () => {
            this.createProjectNote();
        });

        // 添加会议内容Ribbon按钮
        this.addRibbonIcon('microphone', '创建会议记录', () => {
            this.createMeetingNote();
        });
        
        // 添加命令
        console.log('addCommands:');
        this.addCommands();

        // 添加设置面板
        console.log('addSettingTab:');
        this.addSettingTab(new WorkflowSettingTab(this.app, this, 
            (settings) => this.settingsManager.saveSettings(settings),
            () => (this.settingsManager.resetToDefaults())
    ));
      
        console.log('registerEvent:');
        // 注册文件右键菜单
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile) {
                    this.addContextMenuItems(menu, file);
                }
            })
        );

        // 检查是否需要自动创建日记
        console.log('checkAndCreateDailyNote:');
        if (this.settings.autoCreate) {
            this.checkAndCreateDailyNote();
        }
        // this.disableDailyNotesPlugin();
        console.log('workflow plugin loaded');
    }

    onunload() {
        console.log('unloading workflow plugin');
    }
    // 添加命令
    addCommands() {
        // 创建当日日记
        this.addCommand({
            id: 'create-daily-note',
            name: '创建/打开今日日记',
            callback: () => {
                this.createOrOpenDailyNote();
            }
        });

        // 创建周记
        this.addCommand({
            id: 'create-weekly-note',
            name: '创建/打开本周周记',
            callback: () => {
                this.createOrOpenWeeklyNote();
            }
        });

        // 创建项目
        this.addCommand({
            id: 'create-project-note',
            name: '创建项目',
            checkCallback: (checking: boolean) => {
                // 使用 getLeaf() 替代 activeLeaf
                const leaf = this.app.workspace.getLeaf();
                if (leaf) {
                    if (!checking) {
                        this.createProjectNote();
                    }
                    return true;
                }
                return false;
            }
        });

        // 创建会议记录
        this.addCommand({
            id: 'create-meeting-note',
            name: '创建会议记录',
            checkCallback: (checking: boolean) => {
                // 使用 getLeaf() 替代 activeLeaf
                const leaf = this.app.workspace.getLeaf();
                if (leaf) {
                    if (!checking) {
                        this.createMeetingNote();
                    }
                    return true;
                }
                return false;
            }
        });
    }

    // 添加右键菜单选项
    addContextMenuItems(menu, file) {
        // 在日记文件上右键创建相关项目
        if (file.path.startsWith(this.settings.dailyFolder)) {
            menu.addItem((item) => {
                item.setTitle('创建相关项目')
                    .setIcon('folder')
                    .onClick(async () => {
                        const projectName = await this.promptUser('请输入项目名称');
                        if (projectName) {
                            this.createProjectNote(projectName, file);
                        }
                    });
            });

            menu.addItem((item) => {
                item.setTitle('创建相关会议记录')
                    .setIcon('calendar')
                    .onClick(async () => {
                        const meetingName = await this.promptUser('请输入会议名称');
                        if (meetingName) {
                            this.createMeetingNote(meetingName, file);
                        }
                    });
            });
        }

        // 在项目文件上右键创建相关会议
        if (file.path.startsWith(this.settings.projectFolder)) {
            menu.addItem((item) => {
                item.setTitle('创建相关会议记录')
                    .setIcon('calendar')
                    .onClick(async () => {
                        const meetingName = await this.promptUser('请输入会议名称');
                        if (meetingName) {
                            this.createMeetingNote(meetingName, file);
                        }
                    });
            });
        }
    }

    // 检查并创建当日日记
    async checkAndCreateDailyNote() {
        const today = this.dateUtils.getFormattedDate(new Date());
        const dailyNotePath = `${this.settings.dailyFolder}/${today}.md`;
        
        const file = this.app.vault.getAbstractFileByPath(dailyNotePath);
        if (!file) {
            await this.createDailyNote(today);
        }
    }

    // 创建或打开当日日记
    async createOrOpenDailyNote() {
        const today = new Date();
        const dailyNotePath = this.getDailyNotePath(today);
        
        // 检查文件是否已在某个标签页中打开
        const leaf = this.findLeafByPath(dailyNotePath);
        if (leaf) {
            // 如果已打开，切换到该标签页
            this.app.workspace.setActiveLeaf(leaf);
            return;
        }

        // 如果文件不存在，创建它
        let file = this.app.vault.getAbstractFileByPath(dailyNotePath) as TFile;
        if (!file) {
            file = await this.createDailyNote(this.dateUtils.getFormattedDate(today));
            // 检查并创建相关周记
            await this.ensureWeeklyNoteExists(today);
        }

        // 打开文件
        await this.fileManager.openFile(file);
    }

    findLeafByPath(path: string): any {
        return this.app.workspace.getLeavesOfType('markdown').find(leaf => {
            const file = leaf.view.file;
            return file && file.path === path;
        }) || null;
    }

    // 创建当日日记
    async createDailyNote(dateStr: string) {
        // 创建文件夹（如果不存在）
        await this.fileManager.ensureFolderExists(this.settings.dailyFolder);
        
        // 获取日期信息
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekNumber = this.dateUtils.getWeekNumber(date);
        const weekday = this.dateUtils.getWeekdayName(date);
        const prevDate = this.dateUtils.getPreviousDate(date);
        const prevDateStr = this.dateUtils.getFormattedDate(prevDate);
        const prevDailyNotePath = `${this.settings.dailyFolder}/${prevDateStr}.md`;
        const  { work, personal }  = await this.fileManager.getIncompleteTasksByType(prevDailyNotePath);
        console.log('incomplete_work',work);
        console.log('incomplete_personal',personal);
        // 生成文件名
        const fileName = `${year}-${month}-${day}_${weekday}.md`;
        const filePath = `${this.settings.dailyFolder}/${fileName}`;
        
        // 生成内容
        let content = this.settings.dailyTemplate;
        content = content.replace(/{{date}}/g, `${year}-${month}-${day}`)
                         .replace(/{{date_year}}/g, `${year}`)
                         .replace(/{{date_month}}/g, `${month}`)
                         .replace(/{{week}}/g, `${weekNumber}`)
                         .replace(/{{weekday}}/g, `${weekday}`);
        // 将未完成的任务添加到内容中
        if (work.length > 0) {
            content = content.replace('{{incomplete_work}}', work.join('\n'));
        } else {
            content = content.replace('{{incomplete_work}}', '');
        }
        if (personal.length > 0) {
            content = content.replace('{{incomplete_personal}}', personal.join('\n'));
        } else {
            content = content.replace('{{incomplete_personal}}', '');
        }
        // 创建文件
        const file = await this.app.vault.create(filePath, content);
        
        // 检查并创建周记
        await this.checkAndCreateWeeklyNote(date);
        
        // 打开文件
        await this.fileManager.openFile(file);
        
        return file;
    }

    // 创建或打开本周周记
    async createOrOpenWeeklyNote() {
        const date = new Date();
        const weekNumber = this.dateUtils.getWeekNumber(date);
        const year = date.getFullYear();
        
        const weeklyNotePath = `${this.settings.weeklyFolder}/${year}-w${weekNumber}.md`;
        
        const file = this.app.vault.getAbstractFileByPath(weeklyNotePath);
        if (file instanceof TFile) {
            await this.fileManager.openFile(file);
        } else {
            await this.createWeeklyNote(date);
        }
    }

    // 创建本周周记
    async createWeeklyNote(date: Date) {
        // 创建文件夹（如果不存在）
        await this.fileManager.ensureFolderExists(this.settings.weeklyFolder);
        
        // 获取日期信息
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const weekNumber = this.dateUtils.getWeekNumber(date);
        
        // 生成文件名
        const fileName = `${year}-w${weekNumber}.md`;
        const filePath = `${this.settings.weeklyFolder}/${fileName}`;
        
        // 生成内容
        let content = this.settings.weeklyTemplate;
        content = content.replace(/{{date_year}}/g, `${year}`)
                         .replace(/{{date_month}}/g, `${month}`)
                         .replace(/{{week}}/g, `${weekNumber}`);
        
        // 创建文件
        const file = await this.app.vault.create(filePath, content);
        
        // 打开文件
        await this.fileManager.openFile(file);
        
        return file;
    }

    // 创建项目笔记
    async createProjectNote(projectName?: string|null, relatedFile?: TFile) {
        if (!projectName) {
            console.log('projectName input');
            projectName = await this.promptUser('请输入项目名称');
            console.log('projectName ',projectName);
            if (!projectName) return;
        }
        
        // 创建文件夹（如果不存在）
        await this.fileManager.ensureFolderExists(this.settings.projectFolder+'/'+projectName);
        
        // 获取日期信息
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // 生成文件名和路径
        const fileName = `${projectName}.md`;
        const filePath = `${this.settings.projectFolder}/${projectName}/${fileName}`;
        
        // 生成内容
        let content = this.settings.projectTemplate;
        content = content.replace(/{{date}}/g, `${year}-${month}-${day}`)
                         .replace(/{{project_name}}/g, `${projectName}`);
        
        // 如果有相关文件，添加引用
        if (relatedFile && relatedFile.path.startsWith(this.settings.dailyFolder)) {
            const dailyFileName = relatedFile.name;
            content = content.replace('相关日记文件', dailyFileName);
        }
        
        // 创建文件
        const file = await this.app.vault.create(filePath, content);
        
        // 打开文件
        await this.fileManager.openFile(file);
        
        return file;
    }

    // 创建会议记录
    async createMeetingNote(meetingName?: string, relatedFile?: TFile) {
        if (!meetingName) {
            meetingName = await this.promptUser('请输入会议名称');
            if (!meetingName) return;
        }
        
        // 创建文件夹（如果不存在）
        await this.fileManager.ensureFolderExists(this.settings.meetingFolder);
        
        // 获取日期和时间信息
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        // 生成文件名和路径
        const fileName = `${year}-${month}-${day}_${meetingName}.md`;
        const filePath = `${this.settings.meetingFolder}/${fileName}`;
        
        // 生成内容
        let content = this.settings.meetingTemplate;
        content = content.replace(/{{date}}/g, `${year}-${month}-${day}`)
                         .replace(/{{time}}/g, `${hours}:${minutes}`)
                         .replace(/{{meeting_name}}/g, `${meetingName}`);
        
        // 如果有相关文件，添加引用
        if (relatedFile) {
            if (relatedFile.path.startsWith(this.settings.projectFolder)) {
                const projectFileName = relatedFile.name;
                content = content.replace('相关项目', projectFileName);
            }
        }
        
        // 创建文件
        const file = await this.app.vault.create(filePath, content);
        
        // 打开文件
        await this.fileManager.openFile(file);
        
        return file;
    }

    // 确保周记存在
    async ensureWeeklyNoteExists(date: Date) {
        const year = date.getFullYear();
        const weekNumber = this.dateUtils.getWeekNumber(date);
        const weeklyNotePath = `${this.settings.weeklyFolder}/${year}-w${weekNumber}.md`;
        const file = this.app.vault.getAbstractFileByPath(weeklyNotePath);
        if (!file) {
            await this.createWeeklyNote(date);
        }
    }

    // 检查并创建周记
    async checkAndCreateWeeklyNote(date: Date) {
        const year = date.getFullYear();
        const weekNumber = this.dateUtils.getWeekNumber(date);
        const weeklyNotePath = `${this.settings.weeklyFolder}/${year}-w${weekNumber}.md`;
        const file = this.app.vault.getAbstractFileByPath(weeklyNotePath);
        if (!file) {
            await this.createWeeklyNote(date);
        }
    }

    // 提示用户输入
    async promptUser(message: string, defaultValue = ''): Promise<string | null > {
        console.log('promptUser:');
        return new Promise(resolve => {
            const promptModal = new PromptModal(this.app, message, defaultValue, resolve);
            promptModal.open();
        });
    }

    // 获取当日日记路径
    getDailyNotePath(date: Date): string {
        const formattedDate = this.dateUtils.getFormattedDate(date);
        return `${this.settings.dailyFolder}/${formattedDate}.md`;
    }

    // 禁用官方日记插件的方法
    // async disableDailyNotesPlugin() {
    //     const dailyNotesPluginId = 'daily-notes';
        
    //     // 通过类型断言访问非公开属性
    //     const plugins = (this.app as any).plugins;
        
    //     // 检查官方日记插件是否已启用
    //     if (plugins.enabledPlugins.has(dailyNotesPluginId)) {
    //         try {
    //             // 禁用官方日记插件
    //             const result =await plugins.disablePlugin(dailyNotesPluginId);
    //             console.log('已禁用官方日记插件',result);
    //         } catch (error) {
    //             console.error('禁用官方日记插件时出错:', error);
    //         }
    //     }
    // }
}
