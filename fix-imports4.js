const fs = require('fs');

function cleanFile(f, newImport, isClient) {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/^import .* lucide-react.*;\r?\n/gm, '');
    if (isClient) {
        c = c.replace(/'use client';\r?\n/g, '');
        c = "'use client';\n" + newImport + "\n" + c;
    } else {
        c = newImport + "\n" + c;
    }
    fs.writeFileSync(f, c);
}

cleanFile('app/ecatalogs/EcatalogClient.tsx', "import { Plus, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';", true);
cleanFile('app/ecatalogs/[id]/EcatalogDetailClient.tsx', "import { Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Eye } from 'lucide-react';", true);
cleanFile('app/public/ecatalog/[id]/page.tsx', "import { Box, CheckCircle } from 'lucide-react';", false);
