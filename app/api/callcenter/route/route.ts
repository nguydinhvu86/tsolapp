import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    let body: any = {};
    if (request.method === 'POST') {
        try {
            const rawText = await request.text();
            
            // Try to parse as JSON first in case Content-Type is missing
            try {
                body = JSON.parse(rawText);
            } catch (e) {
                // If not JSON, try form urlencoded
                const formParams = new URLSearchParams(rawText);
                formParams.forEach((val, key) => body[key] = val);
            }
        } catch(e) {}
    }

    try {
        const headers = Object.fromEntries(request.headers.entries());
        require('fs').appendFileSync('./public/route-log.txt', new Date().toISOString() + ' | ROUTE | ' + request.url + ' | H: ' + JSON.stringify(headers) + ' | B: ' + JSON.stringify(body) + '\n');
    } catch(e) {}

    try {
        let phone = searchParams.get('phone') || body.phone || searchParams.get('callerid') || body.callerid || searchParams.get('caller') || body.caller || body.caller_number;
        
        if (!phone) {
            return NextResponse.json({ status: 400, message: "Missing phone number" }, { status: 400 });
        }

        const pbxConfig = await (prisma as any).pbxConfig.findFirst();
        const cacheDays = pbxConfig?.cacheDays || 3;

        // Date limit
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - cacheDays);

        // Normalize phone (last 9 digits)
        const cleanPhone = phone.replace(/\D/g, '').slice(-9);

        if (cleanPhone) {
            // Retrieve only the absolute latest call involving a specific agent extension
            const lastCall = await (prisma as any).callLog.findFirst({
                where: {
                    phone: { endsWith: cleanPhone },
                    extension: { notIn: ['', 'QUEUE'] },
                    startedAt: { gte: dateLimit }
                },
                orderBy: { startedAt: 'desc' }
            });

            if (lastCall && lastCall.extension) {
                let shouldRoute = false;
                const status = (lastCall.status || '').toUpperCase();

                if (lastCall.type === 'OUTBOUND' || lastCall.type === 'UNKNOWN') {
                    // Always sticky to agents who proactively called them
                    shouldRoute = true;
                } else if (lastCall.type === 'INBOUND' && (status === 'ANSWER' || status === 'ANSWERED')) {
                    // Stick to the agent who successfully talked to them
                    shouldRoute = true;
                } else {
                    // This was an INBOUND call that the agent MISSED.
                    // Instead of falling back to a much older answered call, cut the sticky cord and drop to Queue.
                    shouldRoute = false;
                }

                if (shouldRoute) {
                    try {
                        require('fs').appendFileSync('./public/route-log.txt', new Date().toISOString() + ' | ROUTE_RESULT | ' + phone + ' -> ' + lastCall.extension + ' (Reason: ' + lastCall.type + ' ' + status + ')\n');
                    } catch(e) {}
                    return new NextResponse(lastCall.extension, { 
                        status: 200, 
                        headers: { 'Content-Type': 'text/plain' } 
                    });
                }
            }
        }

        try {
            require('fs').appendFileSync('./public/route-log.txt', new Date().toISOString() + ' | ROUTE_RESULT | ' + phone + ' -> QUEUE\n');
        } catch(e) {}

        // Return empty so PBX forces the call into default IVR according to the tech instructions
        return new NextResponse("", { 
            status: 200, 
            headers: { 'Content-Type': 'text/plain' } 
        });

    } catch (e: any) {
        console.error('Call Routing error:', e);
        return NextResponse.json({ status: 500, message: "Server error" }, { status: 500 });
    }
}

export const GET = handler;
export const POST = handler;
