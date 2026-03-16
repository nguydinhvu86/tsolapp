'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, BellOff } from 'lucide-react';

export function PushPermissionToggle() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);

            // Manually register SW since next-pwa register is disabled to fix Next 14 App Router 500 error
            navigator.serviceWorker.register('/sw.js').then((registration) => {
                checkSubscription(registration);
            }).catch(console.error);

        } else {
            setIsLoading(false);
        }
    }, []);

    const checkSubscription = async (registration: ServiceWorkerRegistration) => {
        try {
            if (registration && registration.pushManager) {
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            }
        } catch (error) {
            console.error('Error checking push subscription', error);
        } finally {
            setIsLoading(false);
        }
    };

    const subscribeToPush = async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) throw new Error("Service Worker not registered");

            await navigator.serviceWorker.ready;

            // Fetch public key from the application statically or via API
            // For now we use the env variable if it was exposed to NEXT_PUBLIC
            const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!applicationServerKey) {
                console.error("No VAPID public key available");
                alert("Thiếu cấu hình VAPID Key trên Server.");
                setIsLoading(false);
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
            });

            // Send subscription to our server
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                        auth: arrayBufferToBase64(subscription.getKey('auth'))
                    },
                    userAgent: navigator.userAgent
                })
            });

            if (response.ok) {
                setIsSubscribed(true);
            } else {
                console.error('Failed to store subscription on server');
            }
        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported || isLoading) return null;

    if (isSubscribed) {
        return (
            <button
                title="Đã bật thông báo thiết bị"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                disabled
            >
                <BellRing size={18} />
            </button>
        );
    }

    return (
        <button
            title="Bật thông báo đẩy (Push)"
            onClick={subscribeToPush}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
            <BellOff size={18} />
        </button>
    );
}

// Utility functions
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
    if (!buffer) return '';
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
