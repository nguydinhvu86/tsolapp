const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            walk(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            let content = fs.readFileSync(full, 'utf8');
            const hasSingle = content.includes("'use client'");
            const hasDouble = content.includes('"use client"');
            
            if (hasSingle || hasDouble) {
                const trimmed = content.trimStart();
                if (!trimmed.startsWith("'use client'") && !trimmed.startsWith('"use client"')) {
                    // Extract all lines
                    const lines = content.split(/\r?\n/);
                    const clientIndex = lines.findIndex(l => l.trim().startsWith("'use client'") || l.trim().startsWith('"use client"'));
                    if (clientIndex > 0) {
                        const directive = lines[clientIndex].trim();
                        lines.splice(clientIndex, 1);
                        const newContent = `${directive}\n${lines.join('\n')}`;
                        fs.writeFileSync(full, newContent, 'utf8');
                        console.log(`[FIXED] ${full}`);
                    }
                }
            }
        }
    }
}

walk(path.join(process.cwd(), 'app'));
console.log('Finished checking use client directives.');
