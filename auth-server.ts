declare var self: Worker;

let challengeURL = "";

self.addEventListener("message", (event) => {
    console.log("[S] Received challenge URL");
    challengeURL = event.data;
});

Bun.serve({
    async fetch(_) {
        const qrCode = new URL("https://api.qrserver.com/v1/create-qr-code");
        qrCode.searchParams.set("size", "250x250");
        qrCode.searchParams.set("color", "212328");
        qrCode.searchParams.set("data", String(challengeURL));
        const image = await fetch(qrCode.toString()).then((res) =>
            res.arrayBuffer()
        );

        const png = new Uint8Array(image);
        return new Response(png, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    },
    port: 8081,
});
