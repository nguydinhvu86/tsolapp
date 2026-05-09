const fs = require('fs');

let f1 = 'app/ecatalogs/EcatalogClient.tsx';
let code1 = fs.readFileSync(f1, 'utf8');
code1 = code1.replace(/^import .* lucide-react.*;\n/m, '');
code1 = code1.replace(/'use client';/, "'use client';\nimport { Plus, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';");
fs.writeFileSync(f1, code1);

let f2 = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let code2 = fs.readFileSync(f2, 'utf8');
code2 = code2.replace(/^import .* lucide-react.*;\n/m, '');
code2 = code2.replace(/'use client';/, "'use client';\nimport { Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Eye } from 'lucide-react';");
fs.writeFileSync(f2, code2);
