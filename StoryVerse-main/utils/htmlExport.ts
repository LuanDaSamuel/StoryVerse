export const downloadAsHtml = (htmlContent: string, title: string) => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
    body {
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        color: #333;
    }
    p {
        margin-bottom: 1em;
        text-indent: 2em;
    }
    h1, h2, h3 {
        text-indent: 0;
        margin-bottom: 1em;
    }
    blockquote {
        border-left: 4px solid #ccc;
        margin: 1em 0;
        padding-left: 1em;
        color: #666;
    }
</style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
