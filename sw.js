const CACHE_NAME = 'aether-ai-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/xml.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/css.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js',
    'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js',
    'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js'
];

const ICON_URL = 'https://files.catbox.moe/quklhs.png';
const BADGE_URL = 'https://files.catbox.moe/quklhs.png';

/* ===== INSTALL ===== */
self.addEventListener('install', function(event) {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(function() {
            return self.skipWaiting();
        }).catch(function(err) {
            console.log('[SW] Cache failed:', err);
            return self.skipWaiting();
        })
    );
});

/* ===== ACTIVATE ===== */
self.addEventListener('activate', function(event) {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

/* ===== FETCH ===== */
self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API calls (network only)
    if (url.hostname.indexOf('api.synoxcloud.xyz') !== -1) {
        return;
    }

    // Skip analytics / tracking
    if (url.hostname.indexOf('google-analytics') !== -1 ||
        url.hostname.indexOf('googletagmanager') !== -1) {
        return;
    }

    event.respondWith(
        caches.match(request).then(function(cachedResponse) {
            if (cachedResponse) {
                // Return cached and revalidate in background
                fetch(request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                }).catch(function() {});
                return cachedResponse;
            }

            // Network first, fallback cache
            return fetch(request).then(function(networkResponse) {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                var responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(request, responseClone);
                });
                return networkResponse;
            }).catch(function() {
                // Fallback for HTML
                if (request.headers.get('accept') && request.headers.get('accept').indexOf('text/html') !== -1) {
                    return caches.match('/index.html');
                }
                return new Response('Offline - No cache available', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});

/* ===== PUSH NOTIFICATION ===== */
self.addEventListener('push', function(event) {
    console.log('[SW] Push event received');
    var data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {};
    }

    var title = data.title || 'AETHER AI';
    var body = data.body || 'Ada notifikasi baru dari AETHER AI!';
    var tag = data.tag || 'aether-ai-' + Date.now();
    var url = data.url || '/';

    var options = {
        body: body,
        icon: data.icon || ICON_URL,
        badge: data.badge || BADGE_URL,
        tag: tag,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        vibrate: data.vibrate || [200, 100, 200],
        data: {
            url: url,
            timestamp: Date.now()
        },
        actions: data.actions || [
            {
                action: 'open',
                title: 'Buka Aplikasi'
            },
            {
                action: 'dismiss',
                title: 'Tutup'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

/* ===== NOTIFICATION CLICK ===== */
self.addEventListener('notificationclick', function(event) {
    console.log('[SW] Notification click:', event.action);
    var notification = event.notification;
    var data = notification.data || {};
    var url = data.url || '/';

    notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Focus existing client
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.indexOf(url) !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(url);
            }
        })
    );
});

/* ===== NOTIFICATION CLOSE ===== */
self.addEventListener('notificationclose', function(event) {
    console.log('[SW] Notification closed');
});

/* ===== MESSAGE FROM CLIENT ===== */
self.addEventListener('message', function(event) {
    console.log('[SW] Message from client:', event.data);
    var data = event.data || {};

    if (data.type === 'SHOW_NOTIFICATION') {
        var title = data.title || 'AETHER AI';
        var body = data.body || 'Notifikasi baru';
        var options = {
            body: body,
            icon: data.icon || ICON_URL,
            badge: data.badge || BADGE_URL,
            tag: data.tag || 'aether-ai-msg-' + Date.now(),
            requireInteraction: false,
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/',
                timestamp: Date.now()
            }
        };
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }

    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (data.type === 'GET_VERSION') {
        if (event.source && event.source.postMessage) {
            event.source.postMessage({
                type: 'VERSION',
                version: CACHE_NAME
            });
        }
    }
});

/* ===== SYNC (Background Sync) ===== */
self.addEventListener('sync', function(event) {
    console.log('[SW] Sync event:', event.tag);
    if (event.tag === 'aether-sync') {
        event.waitUntil(
            self.clients.matchAll().then(function(clients) {
                clients.forEach(function(client) {
                    client.postMessage({ type: 'SYNC_COMPLETE' });
                });
            })
        );
    }
});

/* ===== PERIODIC SYNC ===== */
self.addEventListener('periodicsync', function(event) {
    console.log('[SW] Periodic sync:', event.tag);
    if (event.tag === 'aether-periodic') {
        event.waitUntil(
            self.registration.showNotification('AETHER AI', {
                body: 'AETHER AI aktif di background',
                icon: ICON_URL,
                badge: BADGE_URL,
                tag: 'aether-periodic-' + Date.now(),
                requireInteraction: false
            })
        );
    }
});
