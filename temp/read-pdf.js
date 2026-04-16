const fs = require('fs');
const PDFParser = require("pdf2json");

function parse(file, outFile) {
    return new Promise((resolve, reject) => {
        let pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError) );
        pdfParser.on("pdfParser_dataReady", pdfData => {
            fs.writeFileSync(outFile, pdfParser.getRawTextContent());
            resolve();
        });
        pdfParser.loadPDF(file);
    });
}

async function run() {
    await parse('c:\\Users\\admin\\Documents\\CONTRACT\\temp\\mau2.pdf', 'out2.txt');
    await parse('c:\\Users\\admin\\Documents\\CONTRACT\\temp\\mau3.pdf', 'out3.txt');
    console.log("Done");
}
run();
