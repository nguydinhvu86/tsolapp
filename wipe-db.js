const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection('mysql://erp_tsolnew_us:tL8kaNtJnmDPCjXm@124.158.9.5:3306/erp_tsolnew?charset=utf8mb4');
    console.log("Connected to remote DB");

    const [rows] = await conn.query('SHOW TABLES');
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);

    for (let row of rows) {
        const tableName = Object.values(row)[0];
        await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        console.log(`Dropped ${tableName}`);
    }

    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("Done wiping DB");
    process.exit(0);
}

main().catch(console.error);
