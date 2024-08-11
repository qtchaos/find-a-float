export enum ItemCondition {
    FactoryNew = "Factory New",
    MinimalWear = "Minimal Wear",
    FieldTested = "Field-Tested",
    WellWorn = "Well-Worn",
    BattleScarred = "Battle-Scarred",
}

export enum TargetType {
    Over = "over",
    Under = "under",
}

export type Asset = {
    currency: number;
    appid: number;
    contextid: string;
    id: string;
    amount: string;
    market_actions: {
        link: string;
        name: string;
    }[];
};

export type ListingInfo = {
    listingid: string;
    price: number;
    fee: number;
    publisher_fee_app: number;
    publisher_fee_percent: string;
    currencyid: number;
    steam_fee: number;
    publisher_fee: number;
    converted_price: number;
    converted_fee: number;
    converted_currencyid: number;
    converted_steam_fee: number;
    converted_publisher_fee: number;
    converted_price_per_unit: number;
    converted_fee_per_unit: number;
    converted_steam_fee_per_unit: number;
    converted_publisher_fee_per_unit: number;
    asset: Asset;
};

export type ListingInfoResponse = {
    [key: string]: ListingInfo;
};

export type SteamAPIResponse = {
    success: boolean;
    total_count: number;
    listinginfo: ListingInfoResponse;
};

export type CSFloatResponse = {
    iteminfo: {
        origin: number;
        quality: number;
        rarity: number;
        paintseed: number;
        defindex: number;
        paintindex: number;
        floatvalue: number;
        floatid: number;
        imageurl: string;
        min: number;
        max: number;
        weapon_type: string;
        item_name: string;
        rarity_name: string;
        quality_name: string;
        wear_name: string;
        full_item_name: string;
        s: string;
        a: string;
        d: string;
        m: string;
    };
};
