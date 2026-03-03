import { prisma } from '../lib/prisma';

async function main() {
    const estimates = await prisma.salesEstimate.findMany({
        where: {
            code: {
                contains: 'NaN'
            }
        }
    });

    console.log(`Found ${estimates.length} corrupted estimates.`);

    if (estimates.length > 0) {
        const validEstimates = await prisma.salesEstimate.findMany({
            where: {
                NOT: { code: { contains: 'NaN' } }
            }
        });

        let maxNum = 0;
        for (const est of validEstimates) {
            const m = est.code.match(/\d+/);
            if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxNum) maxNum = n;
            }
        }

        for (const badEst of estimates) {
            maxNum++;
            const newCode = `BG${String(maxNum).padStart(4, '0')}`;
            console.log(`Updating ${badEst.id} from ${badEst.code} to ${newCode}`);
            await prisma.salesEstimate.update({
                where: { id: badEst.id },
                data: { code: newCode }
            });
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
