import _package from "./package.json" with {type: "json"};
//@ts-ignore
import html from "./login.html" with {type: "text"};
import type { AuthenticatedSteamResponse, LoginResponse } from "./types";

let mentionedOnce = false;

async function pollAuthStatus(client_id: string, request_id: string){
    return fetch("https://api.steampowered.com/IAuthenticationService/PollAuthSessionStatus/v1/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id,
            request_id
        }),
    }).then((response) => response.json()).then((json) => json["response"]).catch((e) => {
        console.log(e);
    });
}

export async function loginAndGetCookies(): Promise<AuthenticatedSteamResponse> {
    let modifiableHTML: string = html;
    const loginTimeout = 1000 * 60 * 5; // 5 Minute timeout

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const urlencoded = new URLSearchParams();
    urlencoded.append("device_friendly_name", "Galaxy S22");
    urlencoded.append("platform_type", "3");

    const requestOptions: RequestInit = {
        method: "POST",
        headers: myHeaders,
        body: urlencoded,
        redirect: "follow"
    };

    const {challenge_url, client_id, request_id} = await fetch("https://api.steampowered.com/IAuthenticationService/BeginAuthSessionViaQR/v1/", requestOptions)
        .then((response: Response) => response.text().then((text) => JSON.parse(text)["response"]))
    
    const qrCode = new URL("https://api.qrserver.com/v1/create-qr-code");
    qrCode.searchParams.set("size", "250x250");
    qrCode.searchParams.set("color", "212328");
    qrCode.searchParams.set("data", String(challenge_url));

    // Replace the placeholders in the HTML
    modifiableHTML = modifiableHTML.replace("QR_CODE_URL", qrCode.toString());
    modifiableHTML = modifiableHTML.replaceAll("PACKAGE_VERSION", _package.version);
    modifiableHTML = modifiableHTML.replace("LOGIN_TIMEOUT", loginTimeout.toString());

    // Spawn the Webview worker so that we don't block the main thread
    const worker = new Worker("./webview.ts");
    worker.addEventListener("message", (event) => {
        // Worker is initialising, send the HTML to it
        if (event.data === "requestingHTML") {
            worker.postMessage({ html: modifiableHTML });
        }
    });

    // Return a promise that resolves when the authenticated event fires
    return new Promise(async (resolve, _) => {
        while (true) {
            const response = await pollAuthStatus(client_id, request_id);
            if (response["had_remote_interaction"] === true && !response["account_name"] && !mentionedOnce) {
                console.log("[*] Scanned QR code successfully!");
                mentionedOnce = true;
            } else if (response["access_token"]) {
                console.log("[*] Authenticated successfully!");
                resolve(response);
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    });
}

export function rotate(text: string, shift: number) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let rotatedText = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const index = alphabet.indexOf(char);
        if (index === -1) {
            rotatedText += char;
            continue;
        }

        rotatedText += alphabet[(index + shift) % alphabet.length];
    }
    return rotatedText;
}

export async function checkLoginStatus(): Promise<LoginResponse> {
    // If the cache file exists, rotate the tokens by the remaining amount to restore them
    if (await Bun.file("cache.tmp").exists()) {
        const file = await Bun.file("cache.tmp").text();
        let [refresh_token, access_token, account_name] = file.split("||").map((token) => rotate(token, 14));

        // TODO: Check if the tokens are still valid, if not, then login again
        return { refresh_token, access_token, account_name };
    } else {
        console.log("[*] No login cache found, logging in...");
        return loginAndCacheCookies();
    }
}

async function loginAndCacheCookies() {
    const { refresh_token, access_token, account_name } = await loginAndGetCookies();
    console.log(`[!] Logged in as ${account_name}`);

    // Rotate the tokens by an amount so that they cant easily be found by malware
    const fileOut = `${rotate(refresh_token, 12)}||${rotate(access_token, 12)}||${rotate(account_name, 12)}`;
    Bun.write("cache.tmp", fileOut);

    return { refresh_token, access_token, account_name };
}