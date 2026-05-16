// Lightweight SVG -> PNG exporter for Recharts SVG charts
export async function exportChartRefAsPNG(ref, filename = 'chart.png') {
  if (!ref || !ref.current) {
    console.warn('exportChartRefAsPNG: invalid ref');
    return;
  }

  const svg = ref.current.querySelector && ref.current.querySelector('svg');
  if (!svg) {
    console.warn('exportChartRefAsPNG: no svg found in ref');
    return;
  }

  try {
    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(svg);

    // Inline external styles by adding computed styles where possible - basic approach
    svgStr = `<?xml version="1.0" encoding="UTF-8"?>\n${svgStr}`;

    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rect = svg.getBoundingClientRect();
      canvas.width = rect.width || svg.clientWidth || 800;
      canvas.height = rect.height || svg.clientHeight || 400;
      const ctx = canvas.getContext('2d');
      // white background to avoid transparent PNGs over dark UI
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = png;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      console.error('Failed to render SVG to image', err);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (err) {
    console.error('exportChartRefAsPNG error', err);
  }
}

export default exportChartRefAsPNG;
