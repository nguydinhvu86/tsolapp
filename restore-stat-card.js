const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'app', 'globals.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

const statCardCSS = `
@layer components {
  /* Restored Dashboard & Report KPI Stat Cards using Tailwind @apply */
  .stat-card {
    @apply bg-white rounded-xl border border-gray-100 shadow-sm p-6 relative overflow-hidden flex flex-col transition-all duration-300;
  }
  .stat-card:hover {
    @apply shadow-md -translate-y-1;
  }
  .stat-card-purple { @apply border-l-4 border-l-primary; }
  .stat-card-amber { @apply border-l-4 border-l-amber-500; }
  .stat-card-blue { @apply border-l-4 border-l-blue-500; }
  .stat-card-green { @apply border-l-4 border-l-emerald-500; }
  .stat-card-red { @apply border-l-4 border-l-red-500; }
  .stat-card-emerald { @apply border-l-4 border-l-emerald-400; }
  .stat-card-indigo { @apply border-l-4 border-l-indigo-500; }

  .stat-title {
    @apply text-gray-500 text-sm font-semibold uppercase tracking-wide;
  }
  .stat-icon {
    @apply p-2 rounded-xl flex items-center justify-center;
  }
  .stat-card-purple .stat-icon { @apply bg-primary/10 text-primary; }
  .stat-card-amber .stat-icon { @apply bg-amber-100 text-amber-600; }
  .stat-card-blue .stat-icon { @apply bg-blue-100 text-blue-600; }
  .stat-card-green .stat-icon { @apply bg-emerald-100 text-emerald-600; }
  .stat-card-red .stat-icon { @apply bg-red-100 text-red-600; }
  .stat-card-emerald .stat-icon { @apply bg-emerald-100 text-emerald-600; }
  .stat-card-indigo .stat-icon { @apply bg-indigo-100 text-indigo-600; }

  .stat-info {
    @apply flex flex-col mt-auto;
  }
  .stat-value {
    @apply text-gray-900 text-3xl font-bold mb-1;
  }
}
`;

if (!cssContent.includes('.stat-card {')) {
    cssContent += '\n' + statCardCSS;
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('Successfully injected .stat-card components layer into globals.css.');
} else {
    console.log('.stat-card already exists in globals.css.');
}
