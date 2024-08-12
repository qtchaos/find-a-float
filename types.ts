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

export type Args = {
    gunName: string;
    skinName: string;
    itemCondition: ItemCondition;
    targetFloat: number;
    targetType: TargetType;
    pollInterval: number;
    overrideListingCheck: boolean;
    currency: SteamCurrency;
};

export enum SpecialType {
    LowestPrice = "↯ (Lowest Price)",
    HighestPrice = "⇡ (Highest Price)",
}

export type CompleteListing = ListingInfo & {
    float: number;
    inspectURL: string;
    buyLink: string;
    specialType: SpecialType | null;
};

// https://partner.steamgames.com/doc/store/pricing/currencies#ecurrency_values
export enum SteamCurrency {
    USD = "1", // United States Dollar
    GBP = "2", // United Kingdom Pound
    EUR = "3", // European Union Euro
    CHF = "4", // Swiss Francs
    RUB = "5", // Russian Rouble
    PLN = "6", // Polish Złoty
    BRL = "7", // Brazilian Reals
    JPY = "8", // Japanese Yen
    NOK = "9", // Norwegian Krone
    IDR = "10", // Indonesian Rupiah
    MYR = "11", // Malaysian Ringgit
    PHP = "12", // Philippine Peso
    SGD = "13", // Singapore Dollar
    THB = "14", // Thai Baht
    VND = "15", // Vietnamese Dong
    KRW = "16", // South Korean Won
    UAH = "18", // Ukrainian Hryvnia
    MXN = "19", // Mexican Peso
    CDN = "20", // Canadian Dollars
    AUD = "21", // Australian Dollars
    NZD = "22", // New Zealand Dollar
    CNY = "23", // Chinese Renminbi (yuan)
    INR = "24", // Indian Rupee
    CLP = "25", // Chilean Peso
    PEN = "26", // Peruvian Sol
    COP = "27", // Colombian Peso
    ZAR = "28", // South African Rand
    HKD = "29", // Hong Kong Dollar
    NTD = "30", // New Taiwan Dollar
    SAR = "31", // Saudi Riyal
    AED = "32", // United Arab Emirates Dirham
    ILS = "35", // New Israeli shekel
    KZT = "37", // Kazakhstani Tenge
    KWD = "38", // Kuwaiti Dinar
    QAR = "39", // Qatari Riyal
    CRC = "40", // Costa Rican Colón
    UYU = "41", // Uruguayan Peso
}
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
