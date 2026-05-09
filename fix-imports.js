const fs = require('fs');

let f1 = 'app/ecatalogs/EcatalogClient.tsx';
let code1 = fs.readFileSync(f1, 'utf8');
code1 = "import { Plus, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';\n" + code1;
fs.writeFileSync(f1, code1);

let f2 = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let code2 = fs.readFileSync(f2, 'utf8');
code2 = "import { Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Eye } from 'lucide-react';\n" + code2;
fs.writeFileSync(f2, code2);

let f3 = 'app/public/ecatalog/[id]/page.tsx';
let code3 = fs.readFileSync(f3, 'utf8');
code3 = "import { Box, CheckCircle } from 'lucide-react';\n" + code3;
fs.writeFileSync(f3, code3);
