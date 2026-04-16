const fs = require('fs');

async function run() {
    try {
        const index = fs.readFileSync('node_modules/pdf-parse/index.js', 'utf8');
        console.log(index.substring(0, 1000));
    } catch (e) {
        console.error(e.message);
    }
}
run();
