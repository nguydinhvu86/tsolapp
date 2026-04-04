const fs = require('fs');
const path = require('path');

function walk(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        let i = 0;
        function next() {
            let file = list[i++];
            if (!file) return done(null, results);
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    // Ignore node_modules or .next
                    if (file.includes('node_modules') || file.includes('.next')) return next();
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                        results.push(file);
                    }
                    next();
                }
            });
        }
        next();
    });
}

walk(path.join(__dirname, 'app'), (err, matches) => {
    if (err) throw err;
    let updatedCount = 0;
    
    matches.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;

        if (content.includes('.a4-document') && content.includes('@media print')) {
            if (!content.includes('min-height: auto !important;')) {
                const target = /max-width:\s*none\s*!important;/;
                if (target.test(content)) {
                    content = content.replace(target, 'max-width: none !important;\n                        min-height: auto !important;');
                    modified = true;
                }
            }
            if (content.includes("marginTop: '4rem'") && content.includes("DocumentSignatureBlock")) {
                content = content.replace(/marginTop:\s*'4rem'/g, "marginTop: '2rem'");
                modified = true;
            }
            if (content.includes("marginTop: '5rem'") && content.includes("DocumentSignatureBlock")) {
                content = content.replace(/marginTop:\s*'5rem'/g, "marginTop: '2rem'");
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(file, content);
            updatedCount++;
            console.log(`Updated: ${file}`);
        }
    });
    
    console.log(`Total files updated: ${updatedCount}`);
});
