const fs = require('fs');

let f1 = 'app/ecatalogs/EcatalogClient.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/^import .* lucide-react.*;\n/gm, '');
c1 = c1.replace(/'use client';\n/g, '');
c1 = "'use client';\nimport { Plus, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';\n" + c1;
fs.writeFileSync(f1, c1);

let f2 = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/^import .* lucide-react.*;\n/gm, '');
c2 = c2.replace(/'use client';\n/g, '');
c2 = "'use client';\nimport { Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Eye } from 'lucide-react';\n" + c2;
fs.writeFileSync(f2, c2);

let f3 = 'app/public/ecatalog/[id]/page.tsx';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/^import .* lucide-react.*;\n/gm, '');
c3 = "import { Box, CheckCircle } from 'lucide-react';\n" + c3;
fs.writeFileSync(f3, c3);
