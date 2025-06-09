import { App, TFile, TFolder ,MarkdownView} from 'obsidian';
import { WorkflowPluginSettings } from '../service/settings';

export class FileManager {
    constructor(private app: App, private settings: WorkflowPluginSettings) {}

    async ensureFolderExists(folderPath: string): Promise<void> {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            await this.app.vault.createFolder(folderPath);
        } else if (!(folder instanceof TFolder)) {
            throw new Error(`路径 ${folderPath} 不是文件夹`);
        }
    }

    async openFile(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.openFile(file);
    }
    // 解析文件中未完成的任务
    async getIncompleteTasks(filePath: string): Promise<string[]> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file ||!(file instanceof TFile)) {
                return [];
            }
            const content = await this.app.vault.read(file);
            const incompleteTasks = content.split('\n')
                .filter(line => line.trim().startsWith('- [ ]'))
                .map(line => line.trim());
            
            return incompleteTasks;
        } catch (error) {
        console.error('解析未完成任务时出错:', error);
        return [];
        }
    }
    // 解析文件中不同类型的未完成任务
    async getIncompleteTasksByType(filePath: string): Promise<{ work: string[]; personal: string[] }> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file ||!(file instanceof TFile)) {
                return { work: [], personal: [] };
            }
            if (!file) return { work: [], personal: [] };
            
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            const workTasks: string[] = [];
            const personalTasks: string[] = [];
            let currentSection = '';
        
            // 任务分类标题（可从设置中获取）
            const workSectionTitle = '# 当日工作代办';
            const personalSectionTitle = '# 当日个人代办';
            
            for (const line of lines) {
                if (line.trim() === workSectionTitle) {
                    currentSection = 'work';
                    continue;
                }
                
                if (line.trim() === personalSectionTitle) {
                    currentSection = 'personal';
                    continue;
                }
                
                // 提取未完成任务
                if (line.trim().startsWith('- [ ]')) {
                if (currentSection === 'work') workTasks.push(line.trim());
                if (currentSection === 'personal') personalTasks.push(line.trim());
                }
            }
        
            return { work: workTasks, personal: personalTasks };
        } catch (error) {
            console.error('解析未完成任务时出错:', error);
            return { work: [], personal: [] };
        }
    }

    // 生成Obsidian文件链接
    generateObsLink = (file: TFile) => {
        return `"[[`+this.app.metadataCache.fileToLinktext(file,"")+`]]"`;
    };


    //获取选中的文件内容
    getActiveFileSelection(): string | null {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
          return activeView.editor.getSelection();
        }
        return null;
    }
}
