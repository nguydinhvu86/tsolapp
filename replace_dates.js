const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Pattern for: new Date(X).toLocaleDateString(...)
    // Pattern for: X.toLocaleDateString(...)
    // Regex explanation:
    // (new Date\([^)]+\)|[a-zA-Z0-9_.]+)\.toLocaleDateString\([^)]*\)
    // We capture the object being called.
    const regex = /(new Date\([^)]+\)|[a-zA-Z0-9_?.\[\]]+)\.toLocaleDateString\([^)]*\)/g;

    let matchCount = 0;
    content = content.replace(regex, (match, p1) => {
        matchCount++;
        // If it's new Date(X), we can just do formatDate(X) or formatDate(new Date(X)).
        // Since formatDate handles string, let's just do formatDate(p1).
        return `formatDate(${p1})`;
    });

    if (matchCount > 0) {
        // Ensure imported
        if (!content.includes('import { formatDate }') && !content.includes('import { formatMoney, formatDate }') && !content.includes('import { formatDate, formatMoney }')) {
            // Find existing import from formatters
            if (content.includes('@/lib/utils/formatters')) {
                content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/utils\/formatters['"]/, (m, p1) => {
                    return `import { ${p1.trim()}, formatDate } from '@/lib/utils/formatters'`;
                });
            } else {
                // Add to top, right after other imports
                content = `import { formatDate } from '@/lib/utils/formatters';\n` + content;
            }
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Replaced ${matchCount} occurrences in ${filePath}`);
    }
}

walkDir(path.join(__dirname, 'app'), processFile);
console.log('Done replacing toLocaleDateString with formatDate.');
