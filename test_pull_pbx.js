const fs = require('fs');
const fetch = require('node-fetch');

async function test() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch('http://103.245.251.97/internal/Reports/cdr/format/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: '2d63a13194ff14de8b287af76aa5d515',
                startdate: today,
                enddate: today
            })
        });
        const data = await res.json();
        fs.writeFileSync('pbx_out.json', JSON.stringify(data, null, 2));
        console.log("Saved to pbx_out.json");
    } catch (e) {
        console.error(e);
    }
}
test();
