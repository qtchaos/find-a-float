import arg from "arg";
import _package from "./package.json" with {type: "json"};
import {
    ItemCondition,
    type SteamAPIResponse,
    type ListingInfo,
    TargetType,
    type CSFloatResponse,
    SteamCurrency,
    type Args,
    type CompleteListing,
    SpecialType,
} from "./types";

import os from "os";
import { checkLoginStatus, loginAndGetCookies } from "./auth";

const spacer = "    ";
const steamBaseURL = "https://steamcommunity.com/market/listings/730/";
let globalCache: number[] = [];

async function getItemFromSteam(
    gunName: string,
    skinName: string,
    itemCondition: ItemCondition,
    currency: SteamCurrency
): Promise<SteamAPIResponse> {
    const fetchURL = new URL(
        `${steamBaseURL}${gunName} | ${skinName} (${itemCondition})/render`
    );

    fetchURL.searchParams.append("count", "100");

    // The currency param changes the converted_* values to the currency of the user's choice.
    fetchURL.searchParams.append("currency", currency);
    fetchURL.searchParams.append("language", "english");

    const APIResponse = await fetch(fetchURL, {
        headers: {
            Host: "steamcommunity.com",
        },
    }).then(async (res) => res.json() as Promise<SteamAPIResponse>);

    return APIResponse;
}

function decodeInspectURL(itemInfo: ListingInfo) {
    const inspectURL = itemInfo.asset.market_actions[0].link;
    const D = inspectURL.split("%D")[1];
    const A = itemInfo.asset.id;
    const M = itemInfo.listingid;

    return `${inspectURL.split("%20")[0]} M${M}A${A}D${D}`;
}

async function getInspectFloat(inspectURL: string) {
    const baseURL = new URL("https://api.csfloat.com");
    baseURL.searchParams.append("url", inspectURL);

    // Spoof the Origin header to bypass the CSFloat API's CORS policy
    const CSFloatResponse = await fetch(baseURL, {
        headers: {
            Host: "api.csfloat.com",
            Origin: "chrome-extension://jjicbefpemnphinccgikpdaagjebbnhg",
        },
    }).then(async (res) => res.json() as Promise<CSFloatResponse>);

    return CSFloatResponse.iteminfo.floatvalue;
}

async function getListingsByTargetType(args: Args): Promise<CompleteListing[]> {
    // Get Item info and sort listings by price to get a nicer output
    const itemInfo = await getItemFromSteam(
        args.gunName,
        args.skinName,
        args.itemCondition,
        args.currency
    );

    if (
        itemInfo.total_count === 0 &&
        itemInfo.success === true &&
        !args.overrideListingCheck
    ) {
        console.log(
            "[?] No listings found for the given item and condition combo!"
        );
        console.log(
            "[?] Maybe this item is float-capped or you misspelled the name of the item or skin?"
        );
        console.log(
            '[?] If this item is so rare that it has no listings, you can add "--certain" to the end of your run command to override this check. '
        );
        process.exit(1);
    }

    // Add float to listings
    let floatedListings = await Promise.all(
        Object.values(itemInfo.listinginfo).map(async (listing) => {
            if (globalCache.includes(Number(listing.listingid))) {
                return null;
            }

            globalCache.push(Number(listing.listingid));
            const completeName = encodeURIComponent(
                `${args.gunName} | ${args.skinName} (${args.itemCondition})`
            );

            return {
                ...listing,
                inspectURL: decodeInspectURL(listing).replace(" ", "%20"),
                buyLink: `${steamBaseURL}${completeName}?count=100#listing_${listing.listingid}`,
                float: await getInspectFloat(decodeInspectURL(listing)),
            };
        })
    );

    // Remove all null listings using a type guard
    floatedListings = floatedListings.filter((listing) => listing !== null);

    // Sort by lowest float
    floatedListings = floatedListings.sort((a, b) => a!.float - b!.float);

    // If the target type is under, reverse the listings to get the highest float first
    // @ts-ignore
    if (args.targetType === TargetType.Under) {
        floatedListings = floatedListings.reverse();
    }

    const filteredListings = floatedListings.filter((listing) => {
        if (args.targetType === TargetType.Over) {
            return listing!.float > args.targetFloat;
        } else {
            return listing!.float < args.targetFloat;
        }
    });

    return filteredListings.filter(
        (listing) => listing !== null
    ) as CompleteListing[];
}

async function pollListingsForTarget(args: Args) {
    while (true) {
        console.log("[*] Polling for listings...");
        const listings = await getListingsByTargetType(args);

        // If there are listings, return them
        if (listings.length > 0) {
            const lowestPriceListing = listings.reduce((acc, listing) => {
                return acc.converted_price < listing.converted_price
                    ? acc
                    : listing;
            }).listingid;

            const highestPriceListing = listings.reduce((acc, listing) => {
                return acc.converted_price > listing.converted_price
                    ? acc
                    : listing;
            }).listingid;

            listings.forEach(async (listing) => {
                if (listing.listingid === lowestPriceListing) {
                    listing.specialType = SpecialType.LowestPrice;
                } else if (listing.listingid === highestPriceListing) {
                    listing.specialType = SpecialType.HighestPrice;
                }
            });

            return listings;
        }

        await new Promise((resolve) => setTimeout(resolve, args.pollInterval));
    }
}

function mapItemCondition(
    targetFloat: number,
    targetType: TargetType
): ItemCondition {
    // Map the float to a valid item condition and handle the issues with on the dot values.
    // If there is a more clever way to do this, please commit a PR, im too lazy to figure it out

    if (targetFloat === 0 || targetFloat === 1) {
        console.log(
            "[X] A float target of 0 or 1 is not a valid target float."
        );
        process.exit(1);
    }

    if (
        targetFloat > 0 &&
        (targetFloat < 0.07 ||
            (targetType === TargetType.Under && targetFloat === 0.07))
    ) {
        return ItemCondition.FactoryNew;
    } else if (
        (targetFloat > 0.07 ||
            (targetType === TargetType.Over && targetFloat === 0.07)) &&
        (targetFloat < 0.15 ||
            (targetType === TargetType.Under && targetFloat === 0.15))
    ) {
        return ItemCondition.MinimalWear;
    } else if (
        (targetFloat > 0.15 ||
            (targetType === TargetType.Over && targetFloat === 0.15)) &&
        (targetFloat < 0.37 ||
            (targetType === TargetType.Under && targetFloat === 0.37))
    ) {
        return ItemCondition.FieldTested;
    } else if (
        (targetFloat > 0.37 ||
            (targetType === TargetType.Over && targetFloat === 0.37)) &&
        (targetFloat < 0.45 ||
            (targetType === TargetType.Under && targetFloat === 0.45))
    ) {
        return ItemCondition.WellWorn;
    } else if (
        (targetFloat > 0.45 ||
            (targetType === TargetType.Over && targetFloat === 0.45)) &&
        targetFloat <= 1
    ) {
        return ItemCondition.BattleScarred;
    }

    console.log("[X] Could not map the target float to an item condition");
    process.exit(1);
}

function formatGunName(
    gunName: string,
    isStattrak: boolean,
    isSouvenir: boolean
) {
    // All gloves that have a "Gloves" at the end of them
    const needsGlovesAppend = [
        "Bloodhound",
        "Broken Fang",
        "Driver",
        "Hydra",
        "Moto",
        "Specialist",
        "Sport",
    ];
    const allGloves = ["Hand Wraps", ...needsGlovesAppend];
    const isGlove = allGloves.includes(gunName.replace(/ Gloves/g, ""));

    // All knives that have a "Knife" at the end of them
    const needsKnivesAppend = [
        "Bowie",
        "Butterfly",
        "Classic",
        "Falchion",
        "Flip",
        "Gut",
        "Huntsman",
        "Kukri",
        "Navaja",
        "Nomad",
        "Paracord",
        "Skeleton",
        "Stiletto",
        "Survival",
        "Talon",
        "Ursus",
    ];
    const allKnives = [
        "Bayonet",
        "Karambit",
        "M9 Bayonet",
        "Shadow Daggers",
        ...needsKnivesAppend,
    ];
    const isKnife = allKnives.includes(gunName.replace(/ Knife/g, ""));

    if (
        isKnife &&
        !gunName.includes("Knife") &&
        needsKnivesAppend.includes(gunName)
    ) {
        gunName += " Knife";
    } else if (
        isGlove &&
        !gunName.includes("Gloves") &&
        needsGlovesAppend.includes(gunName)
    ) {
        gunName += " Gloves";
    }

    const hasStar = isKnife || isGlove;

    return `${hasStar ? "★ " : ""}${isSouvenir ? "Souvenir " : ""}${
        isStattrak ? "StatTrak™ " : ""
    }${gunName}`;
}

async function checkAndGetArgs(): Promise<Args> {
    const friendlyCurrencies = Object.keys(SteamCurrency).join(", ");
    const rawArgs = Bun.argv;
    let parsedArgs: arg.Result<{
        [key: string]: any;
    }>;

    const availableFlags = [
        {
            name: "--help",
            type: Boolean,
            alias: "-h",
            description: "Show this help message",
        },
        {
            name: "--stattrak",
            type: Boolean,
            alias: "-s",
            description: "Use the StatTrak™ version of the item",
        },
        {
            name: "--souvenir",
            type: Boolean,
            description: "Use the souvenir version of the item",
        },
        {
            name: "--currency",
            type: String,
            alias: "-c",
            description: `The currency to use for the listings, must be one of the following: ${friendlyCurrencies}`,
        },
        {
            name: "--certain",
            type: Boolean,
            description: "Override the listing check",
        },
        {
            name: "--interval",
            type: Number,
            alias: "-i",
            description: "Polling interval in milliseconds",
        },
        {
            name: "--login",
            type: arg.COUNT,
            alias: "-l",
            description: "How much to force the login by, 1 = check cache, 2 = force new login",
        }
    ];

    try {
        const argConfig: { [key: string]: any } = {};
        availableFlags.forEach((flag) => {
            argConfig[flag.name] = flag.type;
            if (flag.alias) {
                argConfig[flag.alias] = flag.name;
            }
        });

        parsedArgs = arg(argConfig);
    } catch (e) {
        console.log(`[X] ${String(e)}`);
        process.exit(1);
    }

    // This is placed early so we can avoid arg length checks for quicker debugging
    if (parsedArgs["--login"] === 1) {
        console.log("[*] Checking cache for login...");
        const resp = await checkLoginStatus();
        console.log(`[!] Logged in as ${resp.account_name}`);
    } else if (parsedArgs["--login"] > 1) {
        console.log("[*] Forcing new login...");
        await loginAndGetCookies();
    }

    // If running the compiled version, we need to make the file path more readable
    if (rawArgs[1].includes("~BUN")) {
        rawArgs[1] = `.\\${rawArgs[1].split("root/")[1]}${
            os.platform() === "win32" ? ".exe" : ""
        }`;
    } else {
        rawArgs[1] = `bun ${rawArgs[1]}`;
    }

    if (parsedArgs["_"].length != 4 || parsedArgs["--help"]) {
        console.log(
            `Usage: ${rawArgs[1]} "<gunName>" "<skinName>" <targetFloat> <targetType (over/under)> [flags]`
        );

        // Print all available flags
        availableFlags.forEach((flag) => {
            console.log(
                `${spacer}${flag.name}${flag.alias ? `, ${flag.alias}` : ""}${
                    flag.type === Boolean ? "" : " <value>"
                }${flag.description ? `: ${flag.description}` : ""}`
            );
        });

        process.exit(1);
    }

    // Map the targetType to the enum
    const targetType =
        parsedArgs["_"][3].toLowerCase().split("")[0] === "o"
            ? TargetType.Over
            : TargetType.Under;

    const targetFloat = Number(parsedArgs["_"][2]);
    const mappedItemCondition = mapItemCondition(targetFloat, targetType);

    const isStattrak = Boolean(parsedArgs["--stattrak"]);

    let pollInterval: number = 10000;
    if (parsedArgs["--interval"] !== undefined) {
        if (isNaN(Number(parsedArgs["--interval"]))) {
            console.log(
                "[X] The poll interval must be a number, continuing anyway with 1000ms..."
            );
        } else if (Number(parsedArgs["--interval"]) < 1000) {
            console.log(
                "[X] The poll interval must be at least 1000 ms, continuing anyway with 1000ms..."
            );
        } else {
            pollInterval = Number(parsedArgs["--interval"]);
        }
    }

    let currency: SteamCurrency = SteamCurrency.USD;
    if (parsedArgs["--currency"] !== undefined) {
        const stringToCurrency =
            SteamCurrency[
                String(
                    parsedArgs["--currency"]
                ).toUpperCase() as keyof typeof SteamCurrency
            ];

        if (stringToCurrency === undefined) {
            console.log(
                `[X] The currency must be one of the following: ${friendlyCurrencies}, continuing anyway with USD...`
            );
        } else {
            currency = stringToCurrency;
        }
    }

    return {
        gunName: formatGunName(
            parsedArgs["_"][0],
            isStattrak,
            Boolean(parsedArgs["--souvenir"])
        ),
        skinName: parsedArgs["_"][1],
        itemCondition: mappedItemCondition,
        targetFloat: Number(parsedArgs["_"][2]),
        targetType,
        pollInterval,
        overrideListingCheck: Boolean(parsedArgs["--certain"]),
        currency,
        login: Boolean(parsedArgs["--login"]),
    };
}

async function checkForUpdates() {
    const currentVersion = _package.version;
    const response = await fetch("https://api.github.com/repos/qtchaos/find-a-float/releases/latest");
    const latestVersion = JSON.parse(await response.text()).tag_name;

    if (Number(currentVersion.replaceAll(".", "")) < Number(latestVersion.replace("v", "").replaceAll(".", ""))) {
        console.log(`[!] New version available: ${latestVersion}`);
        console.log(`[!] Download it from https://github.com/qtchaos/find-a-float/releases/latest`);
    }
}

function prettyPrintListings(listings: CompleteListing[], currency: SteamCurrency) {
    const currencyCode = Object.keys(SteamCurrency).find(
        (key) => SteamCurrency[key as keyof typeof SteamCurrency] === currency
    );

    console.log("[!] Found listings:");
    listings.forEach(async (listing) => {
        const price = (listing.converted_price + listing.converted_fee) / 100;
        let header = `${spacer}-> ${listing.listingid}`;
        if (listing.specialType !== undefined) {
            header += ` ${listing.specialType}`;
        }

        console.log(header);
        console.log(`${spacer.repeat(2)}Price: ${price} ${currencyCode}`);
        console.log(`${spacer.repeat(2)}Float: ${listing.float}`);
        console.log(`${spacer.repeat(2)}Inspect URL: ${listing.inspectURL}`);
        console.log(`${spacer.repeat(2)}Link To Buy: ${listing.buyLink}`);
    });
}

await checkForUpdates();
const args = await checkAndGetArgs();

console.log(
    `[*] Selected: ${args.gunName} | ${args.skinName} (${args.itemCondition}) with a float of ${args.targetType} ${args.targetFloat}`
);

const listings = await pollListingsForTarget(args);
prettyPrintListings(listings, args.currency);
