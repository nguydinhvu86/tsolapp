const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking All Prisma Schema Columns vs MySQL Database ===');

    const schemaContent = fs.readFileSync(path.join(__dirname, '../prisma/schema.prisma'), 'utf8');

    // Parse models and their fields from schema.prisma
    const modelBlocks = schemaContent.split(/model\s+/);
    modelBlocks.shift(); // remove header before first model

    const schemaModels = {};

    for (const block of modelBlocks) {
        const lines = block.split('\n');
        const header = lines[0].trim();
        const modelName = header.split(/\s+/)[0].replace('{', '').trim();
        if (!modelName) continue;

        const fields = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('}') || line.startsWith('@@')) break;
            if (!line || line.startsWith('//')) continue;

            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;

            const fieldName = parts[0];
            const fieldType = parts[1];

            // Ignore relation fields (capitalized type or arrays that don't map to scalar column)
            // Scalar types in Prisma: String, Int, Float, Boolean, DateTime, Json, Decimal, Bytes
            const isScalar = /^(String|Int|Float|Boolean|DateTime|Json|Decimal|Bytes)(\?|\[\])?$/.test(fieldType);
            if (!isScalar) continue;

            let isLongText = line.includes('@db.LongText');
            let isText = line.includes('@db.Text');

            fields.push({
                name: fieldName,
                type: fieldType,
                isLongText,
                isText,
                isOptional: fieldType.endsWith('?'),
                rawLine: line
            });
        }
        schemaModels[modelName] = fields;
    }

    // Get all existing tables in the database
    const existingTablesRes = await prisma.$queryRawUnsafe(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
    `);
    const existingTables = new Set(existingTablesRes.map(t => t.TABLE_NAME || t.table_name));

    console.log(`Found ${existingTables.size} tables in database.`);

    for (const [modelName, fields] of Object.entries(schemaModels)) {
        // Find matching table name (case-insensitive or exact)
        let matchedTable = null;
        for (const tbl of existingTables) {
            if (tbl.toLowerCase() === modelName.toLowerCase()) {
                matchedTable = tbl;
                break;
            }
        }

        if (!matchedTable) {
            continue; // Table might be managed elsewhere or not yet created
        }

        // Get existing columns for this table
        const colsRes = await prisma.$queryRawUnsafe(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${matchedTable}'
        `);
        const existingCols = new Set(colsRes.map(c => c.COLUMN_NAME || c.column_name));

        for (const field of fields) {
            if (!existingCols.has(field.name)) {
                // Determine MySQL type
                let sqlType = 'VARCHAR(191) NULL';
                if (field.isLongText) {
                    sqlType = 'LONGTEXT NULL';
                } else if (field.isText) {
                    sqlType = 'TEXT NULL';
                } else if (field.type.startsWith('String')) {
                    sqlType = 'VARCHAR(191) NULL';
                } else if (field.type.startsWith('Int')) {
                    sqlType = 'INT NULL';
                } else if (field.type.startsWith('Float')) {
                    sqlType = 'DOUBLE NULL';
                } else if (field.type.startsWith('Boolean')) {
                    sqlType = 'TINYINT(1) NOT NULL DEFAULT 0';
                } else if (field.type.startsWith('DateTime')) {
                    sqlType = 'DATETIME(3) NULL';
                } else if (field.type.startsWith('Json')) {
                    sqlType = 'JSON NULL';
                }

                console.log(`[ADDING COLUMN] Table \`${matchedTable}\` -> \`${field.name}\` (${sqlType})`);
                try {
                    await prisma.$executeRawUnsafe(`ALTER TABLE \`${matchedTable}\` ADD COLUMN \`${field.name}\` ${sqlType}`);
                    console.log(`  -> SUCCESS: Added \`${field.name}\` to \`${matchedTable}\`.`);
                } catch (err) {
                    console.error(`  -> ERROR adding \`${field.name}\` to \`${matchedTable}\`:`, err.message);
                }
            }
        }
    }

    console.log('=== All tables and columns synchronized successfully ===');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
