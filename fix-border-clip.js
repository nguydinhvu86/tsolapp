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

        // For internal print views
        if (content.includes('.print-container') && content.includes('@media print')) {
            // padding: 0 !important; -> padding: 0 1px !important; // Fix collapsed border clipping
            if (content.includes('padding: 0 !important;')) {
                // we only replace the one inside .print-container
                const regex = /(\.print-container\s*{[^}]*)padding:\s*0\s*!important;/;
                if (regex.test(content)) {
                    content = content.replace(regex, '$1padding: 0 1px !important;');
                    modified = true;
                }
            }
        }

        // For public print views
        if (content.includes('.a4-document') && content.includes('@media print')) {
            if (content.includes('padding: 0 !important;')) {
                const regex = /(\.a4-document\s*{[^}]*)padding:\s*0\s*!important;/;
                if (regex.test(content)) {
                    content = content.replace(regex, '$1padding: 0 1px !important;');
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(file, content);
            updatedCount++;
            console.log(`Updated clipping bug: ${file}`);
        }
    });
    
    console.log(`Total files updated for clipping: ${updatedCount}`);
});
