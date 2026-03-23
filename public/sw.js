self.addEventListener('push', (event) => {
    let data;
    try {
        data = event.data?.json();
    } catch (e) {
        data = { title: 'Thông báo', body: event.data?.text() };
    }

    if (!data) return;

    const title = data.title || 'TSOL CRM: Thông báo mới';
    const options = {
        body: data.body || 'Bạn có thông báo mới.',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-192x192.png',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there is already a window/tab open with the target URL
            const hadWindowToFocus = clientList.some((client) => {
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    client.focus();
                    return true;
                }
                return false;
            });
            // Otherwise, open a new tab to the applicable URL and focus it.
            if (!hadWindowToFocus && self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// Thêm sự kiện fetch trống để đáp ứng tiêu chí cài đặt PWA của Chrome/Edge.
// Việc này giúp hiển thị nút "Install App" trên thanh địa chỉ mà không làm ảnh hưởng Next.js cache.
self.addEventListener('fetch', (event) => {
    // Không làm gì cả, để trình duyệt tự xử lý request (Pass-through)
});
