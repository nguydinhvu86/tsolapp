const fs = require('fs');
const paths = [
    'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx',
    'app/sales/orders/[id]/SalesOrderDetailClient.tsx',
    'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx'
];

paths.forEach(p => {
    let txt = fs.readFileSync(p, 'utf8');

    // Find the signature block
    const sigStart = txt.indexOf('                    {/* Signatures Card */}');
    let sigEnd = txt.indexOf('                    </div>', txt.indexOf('</DocumentSignatureBlock>', txt.indexOf('role="CUSTOMER"', sigStart)));
    
    // Account for the closing div tag itself
    const endSnippet = '                    </div>';
    sigEnd += endSnippet.length;

    if (sigStart === -1 || sigEnd === -1) {
        console.log('Could not find in', p);
        return;
    }

    const sigHTML = txt.substring(sigStart, sigEnd);
    
    // Remove it from its current position
    txt = txt.substring(0, sigStart) + txt.substring(sigEnd + 1); // +1 to remove newline
    
    // Find the end of the Grid container. 
    // The grid container ends right before the first Modal
    // E.g. `            </div>\n            {/* Convert Modal */}` or `<Modal `
    const modalIndex = txt.indexOf('            {/* '); // Generic search for modals
    let insertPos = -1;
    if (modalIndex !== -1) {
        // Find the `</div>` right before the modal comment
        insertPos = txt.lastIndexOf('            </div>', modalIndex);
    } else {
        insertPos = txt.lastIndexOf('            </div>');
    }

    if (insertPos !== -1) {
        // Insert it right AFTER the grid closes.
        const newSigHTML = `\n            {/* Signatures Container */}\n            <div className="mt-6 w-full">\n` + sigHTML.replace(/                    /g, '                ') + `\n            </div>\n`;
        
        txt = txt.substring(0, insertPos + 18) + newSigHTML + txt.substring(insertPos + 18);
        fs.writeFileSync(p, txt, 'utf8');
        console.log('Moved in', p);
    }
});
