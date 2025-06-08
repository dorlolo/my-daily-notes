import { Modal, App, Notice } from 'obsidian';

export class PromptModal extends Modal {
  private input: HTMLInputElement;
  private resolve: (value: string | null) => void;

  constructor(
    app: App,
    private message: string,
    private defaultValue: string,
    resolve: (value: string | null) => void
  ) {
    super(app);
    this.resolve = resolve;
  }

  onOpen() {
    const { contentEl, titleEl, modalEl } = this;
    
    // 设置标题
    titleEl.setText(this.message);
    
    // 直接修改原生模态框样式
    modalEl.style.maxWidth = '700px';
    modalEl.style.width = '90vw';
    modalEl.style.borderRadius = '8px';
    
    // 清空默认内容
    contentEl.empty();
    
    // 内容区域
    contentEl.style.padding = '0';
    
    // 创建内容容器
    const contentContainer = contentEl.createDiv();
    contentContainer.style.padding = '24px';
    
    this.input = contentContainer.createEl('input');
    this.input.type = 'text';
    this.input.value = this.defaultValue;
    // this.input.placeholder = '请输入内容';
    this.input.style.width = '95%';
    this.input.style.padding = '12px 14px'; // 增加上下内边距
    this.input.style.border = '1px solid var(--background-modifier-border)';
    this.input.style.borderRadius = '4px';
    this.input.style.fontSize = '16px';
    this.input.style.backgroundColor = 'var(--background-secondary)';
    this.input.style.color = 'var(--text-normal)';
    this.input.style.outline = 'none';
    this.input.style.height = '44px'; // 明确设置高度
    
    // 输入框焦点状态
    this.input.onfocus = () => {
      this.input.style.borderColor = 'var(--interactive-accent)';
      this.input.style.boxShadow = '0 0 0 2px var(--interactive-accent-hover)';
    };
    
    this.input.onblur = () => {
      this.input.style.borderColor = 'var(--background-modifier-border)';
      this.input.style.boxShadow = 'none';
    };
    this.input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 阻止默认行为（如表单提交）
            this.submit(); // 触发提交逻辑
        }
    });
    
    // 创建按钮区域
    const footerContainer = contentEl.createDiv();
    footerContainer.style.display = 'flex';
    footerContainer.style.justifyContent = 'flex-end';
    footerContainer.style.gap = '12px';
    footerContainer.style.padding = '10px 24px 0 0';
    // footerContainer.style.backgroundColor = 'var(--background-secondary)';
    footerContainer.style.borderTop = '1px solid var(--background-modifier-border)';
    
    // 取消按钮
    const cancelBtn = footerContainer.createEl('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.padding = '0 20px'; // 仅保留左右内边距
    cancelBtn.style.border = '1px solid var(--background-modifier-border)';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.backgroundColor = 'var(--background-primary)';
    cancelBtn.style.color = 'var(--text-normal)';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.transition = 'background-color 0.2s';
    cancelBtn.style.height = '40px'; // 设置按钮高度
    cancelBtn.style.display = 'flex'; // 使用 flex 布局实现垂直居中
    cancelBtn.style.alignItems = 'center'; // 垂直居中
    cancelBtn.style.justifyContent = 'center'; // 水平居中
    
    cancelBtn.onmouseenter = () => {
      cancelBtn.style.backgroundColor = 'var(--background-modifier-hover)';
    };
    
    cancelBtn.onmouseleave = () => {
      cancelBtn.style.backgroundColor = 'var(--background-primary)';
    };
    
    cancelBtn.onclick = () => {
      this.resolve(null);
      this.close();
    };
    
    // 确定按钮
    const confirmBtn = footerContainer.createEl('button');
    confirmBtn.textContent = '确定';
    confirmBtn.style.padding = '0 20px'; // 仅保留左右内边距
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.backgroundColor = 'var(--interactive-accent)';
    confirmBtn.style.color = 'var(--text-on-accent)';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.transition = 'background-color 0.2s';
    confirmBtn.style.height = '40px'; // 设置按钮高度
    confirmBtn.style.display = 'flex'; // 使用 flex 布局实现垂直居中
    confirmBtn.style.alignItems = 'center'; // 垂直居中
    confirmBtn.style.justifyContent = 'center'; // 水平居中
    
    confirmBtn.onmouseenter = () => {
      confirmBtn.style.backgroundColor = 'var(--interactive-accent-hover)';
    };
    
    confirmBtn.onmouseleave = () => {
      confirmBtn.style.backgroundColor = 'var(--interactive-accent)';
    };
    
    confirmBtn.onclick = () => this.submit();
    
    // 聚焦输入框
    this.input.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private submit() {
    const value = this.input.value.trim();
    if (!value) {
      new Notice('输入不能为空');
      return;
    }
    this.resolve(value);
    this.close();
  }
}


export class ConfirmModal extends Modal {
  constructor(app: App, private onConfirm: () => void) {
      super(app);
  }

  onOpen() {
      const {contentEl} = this;
      contentEl.setText('确定要恢复所有设置为默认值吗？');
      
      // 创建按钮容器
      const buttonContainer = contentEl.createDiv({cls: 'modal-button-container'});
      
      // 创建取消按钮
      buttonContainer.createEl('button', {text: '取消'}).onclick = () => {
          this.close();
      };
      
      // 创建确认按钮
      buttonContainer.createEl('button', {text: '确认', cls: 'mod-cta'}).onclick = () => {
          this.onConfirm();
          this.close();
      };
  }

  onClose() {
      const {contentEl} = this;
      contentEl.empty();
  }
}