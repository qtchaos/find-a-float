import {
    ItemCondition,
    type SteamAPIResponse,
    type ListingInfo,
    TargetType,
    type CSFloatResponse,
} from "./types";

import os from "os";

// Update this if the exchange rate changes by a large margin, currency conversion APIs are expensive :)
// TODO: Add currency flag and pass to Steam API
const usd2eur = 1.09;

const spacer = "    ";
const steamBaseURL = "https://steamcommunity.com/market/listings/730/";
let globalCache: number[] = [];

async function getItemFromSteam(
    gunName: string,
    skinName: string,
    itemCondition: ItemCondition
): Promise<SteamAPIResponse> {
    const fetchURL = new URL(
        `${steamBaseURL}${gunName} | ${skinName} (${itemCondition})/render`
    );

    fetchURL.searchParams.append("count", "100");

    // 2 = USD
    // 3 = EUR
    fetchURL.searchParams.append("currency", "2");
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

async function getListingsByTargetType(
    targetType: TargetType,
    gunName: string,
    skinName: string,
    itemCondition: ItemCondition,
    targetFloat: number,
    overrideListingCheck: boolean
): Promise<
    (ListingInfo & { float: number; inspectURL: string; buyLink: string })[]
> {
    // Get Item info and sort listings by price to get a nicer output
    const itemInfo = await getItemFromSteam(gunName, skinName, itemCondition);

    if (
        itemInfo.total_count === 0 &&
        itemInfo.success === true &&
        !overrideListingCheck
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
                `${gunName} | ${skinName} (${itemCondition})`
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
    if (targetType === TargetType.Under) {
        floatedListings = floatedListings.reverse();
    }

    const filteredListings = floatedListings.filter((listing) => {
        if (targetType === TargetType.Over) {
            return listing!.float > targetFloat;
        } else {
            return listing!.float < targetFloat;
        }
    });

    return filteredListings.filter(
        (listing) => listing !== null
    ) as (ListingInfo & {
        float: number;
        inspectURL: string;
        buyLink: string;
    })[];
}

async function pollListingsForTarget(
    targetType: TargetType,
    gunName: string,
    skinName: string,
    itemCondition: ItemCondition,
    targetFloat: number,
    pollInterval: number,
    overrideListingCheck: boolean
) {
    while (true) {
        console.log("[*] Polling for listings...");
        const listings = await getListingsByTargetType(
            targetType,
            gunName,
            skinName,
            itemCondition,
            targetFloat,
            overrideListingCheck
        );

        // If there are listings, return them
        if (listings.length > 0) {
            return listings;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
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

function formatGunName(gunName: string, isStattrak: boolean) {
    // All knives that have a "Knife" at the end of them
    const needsAppend = [
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
        ...needsAppend,
    ];

    const isKnife = allKnives.includes(gunName);
    if (
        isKnife &&
        !gunName.includes("Knife") &&
        needsAppend.includes(gunName)
    ) {
        gunName += " Knife";
    }

    return `${isKnife ? "★ " : ""}${isStattrak ? "StatTrak™ " : ""}${gunName}`;
}

function checkAndGetArgs() {
    const args = Bun.argv;

    // If running the compiled version, we need to make the file path more readable
    if (args[1].includes("~BUN")) {
        args[1] = `.\\${args[1].split("root/")[1]}${
            os.platform() === "win32" ? ".exe" : ""
        }`;
    } else {
        args[1] = `bun ${args[1]}`;
    }

    if (args.length < 6) {
        console.log(
            `Usage: ${args[1]} "<gunName>" "<skinName>" <targetFloat> <targetType (over/under)> [pollInterval (ms)] [flags]`
        );
        process.exit(1);
    }

    // Map the targetType to the enum
    const targetType =
        args[5].toLowerCase().split("")[0] === "o"
            ? TargetType.Over
            : TargetType.Under;

    // Map the itemCondition to the enum
    const targetFloat = Number(args[4]);
    const mappedItemCondition = mapItemCondition(targetFloat, targetType);

    const isStattrak = args.includes("--stattrak");

    // Check for invalid poll interval and set default
    const pollInterval: number = !isNaN(Number(args[6]))
        ? Number(args[6])
        : 10000;

    if (pollInterval < 1000) {
        console.log(
            "[X] The poll interval must be at least 1000 ms, otherwise you will get rate limited."
        );
        process.exit(1);
    }

    return {
        gunName: formatGunName(args[2], isStattrak),
        skinName: args[3],
        itemCondition: mappedItemCondition,
        targetFloat: Number(args[4]),
        targetType,
        pollInterval,
        overrideListingCheck: args.includes("--certain"),
        isStattrak,
    };
}

const args = checkAndGetArgs();
console.log(
    `[*] Selected: ${args.gunName} | ${args.skinName} (${args.itemCondition}) with a float of ${args.targetFloat} and a target type of ${args.targetType}`
);

const listings = await pollListingsForTarget(
    args.targetType,
    args.gunName,
    args.skinName,
    args.itemCondition,
    args.targetFloat,
    args.pollInterval,
    args.overrideListingCheck
);

console.log("[!] Found listings:");

const lowestPriceListing = listings.reduce((acc, listing) => {
    return acc.converted_price < listing.converted_price ? acc : listing;
}).listingid;

const highestPriceListing = listings.reduce((acc, listing) => {
    return acc.converted_price > listing.converted_price ? acc : listing;
}).listingid;

listings.forEach(async (listing) => {
    const price = (listing.converted_price + listing.converted_fee) / 100;
    console.log(
        `${spacer}-> ${listing.listingid} ${
            lowestPriceListing === listing.listingid
                ? "↯ (Lowest Price)"
                : highestPriceListing === listing.listingid
                ? "⇡ (Highest Price)"
                : ""
        }`
    );

    console.log(
        `${spacer.repeat(2)}Price: ${price} USD ≈ ${(price * usd2eur).toFixed(
            2
        )} EUR`
    );
    console.log(`${spacer.repeat(2)}Float: ${listing.float}`);
    console.log(`${spacer.repeat(2)}Inspect URL: ${listing.inspectURL}`);
    console.log(`${spacer.repeat(2)}Link To Buy: ${listing.buyLink}`);
});