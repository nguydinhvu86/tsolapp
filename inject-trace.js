const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected!');
    // inject a console log
    conn.exec(`sed -i 's/export async function GET(req: NextRequest, { params }: { params: { path: string\\[\\] } }) {/export async function GET(req: NextRequest, { params }: { params: { path: string\\[\\] } }) { console.log("ROUTE HANDLER HIT: ", params.path); /g' /www/wwwroot/inside.tsol.vn/tsolapp/app/uploads/\\[...path\\]/route.ts && npm run build && pm2 restart tsolapp`, (err, stream) => {
        stream.on('close', () => {
           // wait 3 seconds for pm2
           setTimeout(() => {
               conn.exec(`curl -i -s http://127.0.0.1:3000/uploads/avatars/$(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/avatars/ | grep -E '\\.(png|jpg|jpeg)$' | head -n 1) > /dev/null && pm2 logs tsolapp --lines 20 --nostream`, (e, s) => {
                  let r = '';
                  s.on('data', d => r += d.toString()).on('close', () => {
                      console.log(r);
                      conn.end();
                  });
               });
           }, 5000);
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
