const { execSync } = require('child_process');
const mysql = require('mysql2/promise');

async function wipe() {
    console.log("Emptying Dev DB just in case...");
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3307,
            user: 'erp_tsoldev',
            password: 'mPcaKhswG5snGrn5'
        });

        await connection.query('DROP DATABASE IF EXISTS erp_tsoldev');
        await connection.query('CREATE DATABASE erp_tsoldev');
        console.log("Dev DB ready for clone!");
        await connection.end();
    } catch (e) {
        console.error("Error setting up dev DB via Node mysql2:", e.message);
    }
}
wipe();
