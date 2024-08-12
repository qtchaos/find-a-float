import { SizeHint, Webview } from "webview-bun";
declare var self: Worker;

const webview = new Webview(true, {
    width: 550,
    height: 600,
    hint: SizeHint.FIXED,
});

webview.title = "find-a-float";

// Request the HTML from the main thread
self.postMessage("requestingHTML");
self.onmessage = (event) => {
    if (event.data.html !== undefined) {
        webview.setHTML(event.data.html);
    }
};

setTimeout(() => {
    webview.run();
}, 0);
