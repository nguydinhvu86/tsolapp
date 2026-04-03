const fs = require('fs');

const files = [
    'app/public/sales/estimate/[id]/page.tsx',
    'app/public/sales/order/[id]/page.tsx',
    'app/public/sales/invoice/[id]/page.tsx'
];

files.forEach(p => {
    if (!fs.existsSync(p)) return;
    let txt = fs.readFileSync(p, 'utf8');

    const startTag = '{/* Signatures */}';
    const startIdx = txt.indexOf(startTag);
    if (startIdx === -1) {
        console.log('Not found:', p);
        return;
    }

    const flexDivIdx = txt.indexOf('<div className="no-break"', startIdx);
    if (flexDivIdx === -1) return;
    
    let firstBlockStart = txt.indexOf('<DocumentSignatureBlock', flexDivIdx);
    if (firstBlockStart === -1) return;
    
    // Because the second block might have nested `}}` spacing, it's safer to just search for the next `<DocumentSignatureBlock`
    const nextStart1 = txt.indexOf('<DocumentSignatureBlock', firstBlockStart + 10);
    if (nextStart1 === -1) return;
    
    // first block ends right before the next `<DocumentSignatureBlock`
    let firstBlockEnd = nextStart1;
    let block1 = txt.substring(firstBlockStart, firstBlockEnd);
    
    let secondBlockStart = nextStart1;
    // Where does the second block end? It ends at `/>`
    let secondBlockEnd = txt.indexOf('/>', secondBlockStart) + 2; 
    let block2 = txt.substring(secondBlockStart, secondBlockEnd);
    
    // Instead of replacing blindly, we know they are adjacent because firstBlockEnd == secondBlockStart.
    // So there's NO blockSeparator. Wait, there usually is spacing or newlines between `/>` and `<Document`.
    // Let's refine firstBlockEnd to be the `/>` + 2 of the first block!
    firstBlockEnd = txt.indexOf('/>', firstBlockStart) + 2;
    block1 = txt.substring(firstBlockStart, firstBlockEnd);
    
    const blockSeparator = txt.substring(firstBlockEnd, secondBlockStart);
    
    const filePre = txt.substring(0, firstBlockStart);
    const filePost = txt.substring(secondBlockEnd);

    const newTxt = filePre + block2 + blockSeparator + block1 + filePost;
    
    fs.writeFileSync(p, newTxt, 'utf8');
    console.log('Swapped in ' + p);
});
