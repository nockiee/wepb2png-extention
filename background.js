const CONVERSION_FORMATS = {
  PNG: 'png',
  JPG: 'jpg'
};

browser.storage.local.get(['enabled', 'conversionFormat', 'fileSuffix']).then((result) => {
  if (result.enabled === undefined) {
    browser.storage.local.set({ enabled: true });
  }
  if (!result.conversionFormat) {
    browser.storage.local.set({ conversionFormat: CONVERSION_FORMATS.PNG });
  }
  if (!result.fileSuffix) {
    browser.storage.local.set({ fileSuffix: '_converted_from_webp' });
  }
  updateIcon(result.enabled);
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    updateIcon(changes.enabled.newValue);
  }
});

function updateIcon(enabled) {
  const path = enabled ? "icons/icon-128.png" : "icons/icon-disabled-128.png";
  browser.browserAction.setIcon({ path: path });
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    return browser.storage.local.get(['enabled']).then((settings) => {
      if (!settings.enabled) {
        return { cancel: false };
      }
      
      if (details.url.toLowerCase().includes('.webp') || 
          details.type === 'image' && details.url.match(/\.webp(\?|$)/i)) {
        
        return browser.storage.local.get(['conversionFormat', 'fileSuffix']).then((convSettings) => {
          const format = convSettings.conversionFormat || CONVERSION_FORMATS.PNG;
          const suffix = convSettings.fileSuffix || '_converted_from_webp';
          
          return { cancel: true };
        });
      }
      return { cancel: false };
    });
  },
  { urls: ["<all_urls>"], types: ["image"] },
  ["blocking"]
);

browser.downloads.onCreated.addListener((downloadItem) => {
  const url = downloadItem.url.toLowerCase();
  
  if (url.includes('.webp') || url.match(/\.webp(\?|$)/)) {
    browser.storage.local.get(['enabled', 'conversionFormat', 'fileSuffix']).then((settings) => {
      if (settings.enabled) {
        convertAndDownload(downloadItem, settings);
      }
    });
  }
});

async function convertAndDownload(downloadItem, settings) {
  try {
    const format = settings.conversionFormat || CONVERSION_FORMATS.PNG;
    const suffix = settings.fileSuffix || '_converted_from_webp';
    const response = await fetch(downloadItem.url);
    const blob = await response.blob();
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
        await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    let mimeType, fileExtension;
    if (format === CONVERSION_FORMATS.JPG) {
      mimeType = 'image/jpeg';
      fileExtension = 'jpg';
    } else {
      mimeType = 'image/png';
      fileExtension = 'png';
    }
    
    const convertedBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, mimeType, 0.92);
    });
    
    const originalUrl = new URL(downloadItem.url);
    const originalFilename = originalUrl.pathname.split('/').pop().replace('.webp', '');
    const newFilename = `${originalFilename}${suffix}.${fileExtension}`;
    const convertedUrl = URL.createObjectURL(convertedBlob);
    
    browser.downloads.download({
      url: convertedUrl,
      filename: newFilename,
      saveAs: downloadItem.saveAs
    });
    
    URL.revokeObjectURL(img.src);
    
  } catch (error) {
    console.error('Conversion failed:', error);
    browser.downloads.download({
      url: downloadItem.url,
      filename: downloadItem.filename
    });
  }
}