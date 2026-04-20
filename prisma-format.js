const { exec } = require('child_process');
const fs = require('fs');
exec('npx prisma format', (error, stdout, stderr) => {
    fs.writeFileSync('prisma-err-out.txt', stderr, 'utf8');
    console.log("Done");
});
