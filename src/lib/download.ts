/**
 * 下载图片 — 支持跨域 CDN URL
 * 先尝试 blob 下载（跨域友好），失败则直接打开
 */
export async function downloadImage(url: string, filename: string) {
  try {
    // 同源或允许 CORS：用 blob 下载
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch {
    // CORS 阻断，换一种方式
  }

  // 回退：用 img 标签加载后用 canvas 导出
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.replace(/\.\w+$/, '.png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  } catch {
    // 最后回退：在新窗口打开
    window.open(url, '_blank');
  }
}
