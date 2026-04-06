// This is a standalone Node script run by PM2 to trigger the PBX Sync every 5 minutes
// Requires Node 18+ for native fetch.

console.log("Starting PBX Cron Job - executing every 5 minutes...");

setInterval(async () => {
    try {
        console.log(`[${new Date().toISOString()}] Triggering PBX sync...`);
        const res = await fetch("http://127.0.0.1:3000/api/callcenter/sync");
        const json = await res.json();
        console.log(`[${new Date().toISOString()}] Sync result:`, JSON.stringify(json));
    } catch (e) {
        console.error(`[${new Date().toISOString()}] Cron Error:`, e.message);
    }
}, 5 * 60 * 1000);

// Run immediately on boot
setTimeout(async () => {
    try {
        console.log(`[${new Date().toISOString()}] Initial PBX sync...`);
        await fetch("http://127.0.0.1:3000/api/callcenter/sync");
    } catch (e) {}
}, 5000);
