import { ImageResponse } from 'next/og';
import { getLayoutSettings } from '@/app/components/layout/actions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { logo } = await getLayoutSettings();
        const { origin } = new URL(request.url);
        
        let logoUrl = logo;
        if (!logoUrl) {
           logoUrl = `${origin}/icons/icon-512x512.png`;
        } else if (logoUrl.startsWith('/')) {
           logoUrl = `${origin}${logoUrl}`;
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        background: '#f8fafc',
                        width: '100%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <img
                        src={logoUrl}
                        style={{
                            maxWidth: '800px',
                            maxHeight: '400px',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.error('OG Image Generation Error:', e);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
