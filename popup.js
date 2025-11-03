class WebPConverterPopup {
  constructor() {
    this.initializeElements();
    this.loadSettings();
    this.attachEventListeners();
  }

  initializeElements() {
    this.toggleEnabled = document.getElementById('toggleEnabled');
    this.formatGroup = document.getElementById('formatGroup');
    this.fileSuffix = document.getElementById('fileSuffix');
    this.settingsSection = document.getElementById('settingsSection');
    this.status = document.getElementById('status');
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['enabled', 'conversionFormat', 'fileSuffix']);
      
      this.toggleEnabled.checked = result.enabled !== false;
      this.updateUIState(this.toggleEnabled.checked);
      
      const format = result.conversionFormat || 'png';
      this.setSelectedFormat(format);
      
      this.fileSuffix.value = result.fileSuffix || '_converted_from_webp';
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  setSelectedFormat(format) {
    const options = this.formatGroup.querySelectorAll('.radio-option');
    options.forEach(option => {
      const radio = option.querySelector('input');
      if (radio.value === format) {
        option.classList.add('selected');
        radio.checked = true;
      } else {
        option.classList.remove('selected');
        radio.checked = false;
      }
    });
  }

  attachEventListeners() {
    this.toggleEnabled.addEventListener('change', () => {
      this.saveSettings();
      this.updateUIState(this.toggleEnabled.checked);
    });

    this.formatGroup.addEventListener('click', (e) => {
      const option = e.target.closest('.radio-option');
      if (option) {
        const format = option.dataset.value;
        this.setSelectedFormat(format);
        this.saveSettings();
      }
    });

    let timeoutId;
    this.fileSuffix.addEventListener('input', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.saveSettings();
      }, 500);
    });
  }

  updateUIState(enabled) {
    if (enabled) {
      document.body.classList.remove('disabled');
    } else {
      document.body.classList.add('disabled');
    }
  }

  async saveSettings() {
    try {
      const enabled = this.toggleEnabled.checked;
      const format = this.formatGroup.querySelector('input:checked')?.value || 'png';
      const suffix = this.fileSuffix.value.trim() || '_converted_from_webp';

      await browser.storage.local.set({
        enabled: enabled,
        conversionFormat: format,
        fileSuffix: suffix
      });

      this.showStatus('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings', true);
    }
  }

  showStatus(message, isError = false) {
    this.status.textContent = message;
    this.status.style.background = isError ? '#FF4444' : '#6DD011';
    this.status.classList.add('show');
    
    setTimeout(() => {
      this.status.classList.remove('show');
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebPConverterPopup();
});