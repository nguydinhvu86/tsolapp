const fs = require('fs');
const file = 'app/globals.css';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject Tailwind Directives
const tailwindDirectives = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n`;

// 2. Remove utility classes block
const utilsStart = content.indexOf('/* Utilities */');
const componentsStart = content.indexOf('/* UI Components */');

if (utilsStart !== -1 && componentsStart !== -1) {
    const beforeUtils = content.substring(0, utilsStart);
    const afterUtils = content.substring(componentsStart);
    content = tailwindDirectives + beforeUtils + afterUtils;
} else if (!content.includes('@tailwind')) {
    content = tailwindDirectives + content;
}

// 3. Optional: replace custom hardcoded colors in body with Tailwind defaults or variables
fs.writeFileSync(file, content);
console.log("globals.css refactored successfully!");
