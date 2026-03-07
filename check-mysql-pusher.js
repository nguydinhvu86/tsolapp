const mysql = require('mysql2/promise');

async function main() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3307,
            user: 'tsolapp',
            password: 'P@ssw0rdVu',
            database: 'tsolapp'
        });

        console.log('Connected to local forwarded DB port 3307.');

        const [rows, fields] = await connection.execute(
            "SELECT `key`, `value` FROM SystemSetting WHERE `key` LIKE 'PUSHER_%'"
        );

        console.log('--- Pusher Settings ---');
        console.log(JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
