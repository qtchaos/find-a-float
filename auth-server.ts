declare var self: Worker;

let challenge_url = "";

self.addEventListener("message", (event) => {
    console.log("[S] Received challenge URL");
    challenge_url = event.data;
});

Bun.serve({
    async fetch(_) {
        const qrCode = new URL("https://api.qrserver.com/v1/create-qr-code");
        qrCode.searchParams.set("size", "250x250");
        qrCode.searchParams.set("color", "212328");
        qrCode.searchParams.set("data", String(challenge_url));
        const image = await fetch(qrCode.toString()).then((res) =>
            res.arrayBuffer()
        );

        const png = new Uint8Array(image);
        return new Response(png, {
            headers: {
                "Content-Type": "image/png",
            },
        });
    },
    port: 8081,
});
