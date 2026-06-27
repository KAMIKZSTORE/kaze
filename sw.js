/* ==========================
   AETHER AI SERVICE WORKER
   ========================== */

const CACHE_NAME = "aether-ai-v3";

const STATIC_ASSETS = [
    "/",
    "/index.html"
];

const ICON_URL = "https://files.catbox.moe/quklhs.png";
const BADGE_URL = "https://files.catbox.moe/quklhs.png";

/* ================= INSTALL ================= */

self.addEventListener("install", (event) => {
    console.log("[SW] Installing...");

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error("[SW] Install error:", err);
                return self.skipWaiting();
            })
    );
});

/* ================= ACTIVATE ================= */

self.addEventListener("activate", (event) => {
    console.log("[SW] Activated");

    event.waitUntil(
        caches.keys().then((cacheNames) => {

            return Promise.all(
                cacheNames.map((cache) => {

                    if (cache !== CACHE_NAME) {
                        console.log("Delete:", cache);
                        return caches.delete(cache);
                    }

                })
            );

        }).then(() => self.clients.claim())
    );
});

/* ================= FETCH ================= */

self.addEventListener("fetch", (event) => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    /* Skip API */
    if (
        url.hostname.includes("api.synoxcloud.xyz") ||
        url.hostname.includes("api.aether.ai")
    ) {
        return;
    }

    /* Skip analytics */
    if (
        url.hostname.includes("google-analytics") ||
        url.hostname.includes("googletagmanager")
    ) {
        return;
    }

    event.respondWith(

        caches.match(request).then((cached) => {

            if (cached) {

                fetch(request)
                    .then((response) => {

                        if (
                            response &&
                            response.status === 200
                        ) {

                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(
                                        request,
                                        response.clone()
                                    );
                                });

                        }

                    })
                    .catch(() => {});

                return cached;
            }

            return fetch(request)

                .then((response) => {

                    if (
                        response &&
                        response.status === 200
                    ) {

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(
                                    request,
                                    response.clone()
                                );
                            });

                    }

                    return response;
                })

                .catch(() => {

                    if (
                        request.headers.get("accept") &&
                        request.headers
                            .get("accept")
                            .includes("text/html")
                    ) {
                        return caches.match("/index.html");
                    }

                    return new Response(
                        "Offline",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain"
                            }
                        }
                    );

                });

        })

    );
});

/* ================= PUSH ================= */

self.addEventListener("push", (event) => {

    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {};
    }

    const title =
        data.title || "AETHER AI";

    const options = {
        body:
            data.body ||
            "Ada notifikasi baru.",

        icon:
            data.icon ||
            ICON_URL,

        badge:
            data.badge ||
            BADGE_URL,

        tag:
            data.tag ||
            "aether-" + Date.now(),

        requireInteraction:
            data.requireInteraction || false,

        silent:
            data.silent || false,

        vibrate:
            data.vibrate || [200, 100, 200],

        data: {
            url:
                data.url || "/",
            timestamp:
                Date.now()
        },

        actions: [
            {
                action: "open",
                title: "Buka"
            },
            {
                action: "dismiss",
                title: "Tutup"
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});

/* ================= NOTIFICATION CLICK ================= */

self.addEventListener(
    "notificationclick",
    (event) => {

        event.notification.close();

        if (
            event.action === "dismiss"
        ) {
            return;
        }

        const url =
            event.notification.data?.url || "/";

        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            })

            .then((clientList) => {

                for (const client of clientList) {

                    if ("focus" in client) {
                        return client.focus();
                    }

                }

                if (clients.openWindow) {
                    return clients.openWindow(url);
                }

            })

        );

    }
);

/* ================= MESSAGE ================= */

self.addEventListener(
    "message",
    (event) => {

        const data = event.data || {};

        if (
            data.type === "SHOW_NOTIFICATION"
        ) {

            event.waitUntil(

                self.registration.showNotification(
                    data.title || "AETHER AI",
                    {
                        body:
                            data.body ||
                            "Notifikasi baru.",

                        icon:
                            data.icon ||
                            ICON_URL,

                        badge:
                            data.badge ||
                            BADGE_URL,

                        tag:
                            data.tag ||
                            "msg-" + Date.now(),

                        vibrate:
                            [100, 50, 100],

                        data: {
                            url:
                                data.url || "/"
                        }
                    }
                )

            );

        }

        if (
            data.type === "SKIP_WAITING"
        ) {
            self.skipWaiting();
        }

        if (
            data.type === "GET_VERSION"
        ) {

            if (
                event.source &&
                event.source.postMessage
            ) {

                event.source.postMessage({
                    type: "VERSION",
                    version: CACHE_NAME
                });

            }

        }

    }
);

/* ================= BACKGROUND SYNC ================= */

self.addEventListener(
    "sync",
    (event) => {

        if (
            event.tag === "aether-sync"
        ) {

            event.waitUntil(

                self.clients
                    .matchAll()

                    .then((clients) => {

                        clients.forEach(
                            (client) => {

                                client.postMessage({
                                    type:
                                        "SYNC_COMPLETE"
                                });

                            }
                        );

                    })

            );

        }

    }
);

/* ================= PERIODIC SYNC ================= */

self.addEventListener(
    "periodicsync",
    (event) => {

        if (
            event.tag === "aether-periodic"
        ) {

            event.waitUntil(

                self.registration.showNotification(
                    "AETHER AI",
                    {
                        body:
                            "AETHER AI aktif di background.",

                        icon:
                            ICON_URL,

                        badge:
                            BADGE_URL,

                        tag:
                            "periodic-" +
                            Date.now()
                    }
                )

            );

        }

    }
);
