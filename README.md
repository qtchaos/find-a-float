# find-a-float [![Download executable](https://img.shields.io/badge/download-.exe-red)](https://github.com/qtchaos/find-a-float/releases/latest/download/find-a-float-windows-x64-modern.exe)

Finds the lowest (or highest) float listings for a specific skin on the Steam Community Market for Counter-Strike 2.

## Usage

You can download the latest binary from the [releases page](https://github.com/qtchaos/find-a-float/releases), this allows you to run the tool without having Bun nor the repo installed.

```bash
find-a-float.exe <gunName> <skinName> <targetFloat> <targetType (over/under)> [flags]
```

Or if you're running from source:

```bash
bun run index.ts <gunName> <skinName> <targetFloat> <targetType (over/under)> [flags]
```

## Examples

I want to find all "Nova | Toy Soldier" listings that have a float of 0.95 or higher.

```bash
find-a-float.exe "Nova" "Toy Soldier" 0.95 over
```

I want to find a "Stattrak™ Huntsman Knife | Gamma Doppler (Factory New)". (P.S You don't have to include the "Knife" part of the name)

```bash
find-a-float.exe "Huntsman" "Gamma Doppler" 0.07 under --stattrak
```

I want to find a "Souvenir Desert Eagle | Fennec Fox" with a float of 0.06 or lower and I want to see prices in CNY.

```bash
find-a-float.exe "Desert Eagle" "Fennec Fox" 0.06 under --souvenir --currency CNY
```

I want to find "Sport Gloves | Vice" listings with a float of 0.45 or higher. (P.S You don't have to include the "Gloves" part of the name)

```bash
find-a-float.exe "Sport" "Vice" 0.45 over
```

## To-do

Sorted from expected ETA (earliest first):

-   [x] Add support for Souvenir items
-   [x] Add support for gloves (without the "Gloves" part of the name)
-   [x] Add support for different currencies
-   [ ] Add min and max price ranges
-   [ ] Add ignore list for listings
-   [ ] Scrape pages older than the current one for more listings
-   [ ] Add support for different target types (e.g. "between")
-   [ ] Web interface...?
-   [ ] Auto-buy listings

## Building

You can build the tool yourself by cloning the repo and running the following command:

```bash
bun run build.ts
```

This will build all targets (Windows, MacOS, Linux) and output them to the `dist` folder. You can also build a specific target by running:

```bash
bun run build.ts <target (windows/macos/linux)>
```

## Known issues

-   The size of the binary is huge due to it including the Bun runtime, this will not be fixed. If you want a smaller download size, you can clone the repo and run the tool from source.
-   Builds for MacOS and Linux are not included in the released binaries due to a lack of build environments, you can build them yourself by following the instructions above.
-   Buy links may not work for very active items due to the page number being different.
-   You can't set a price range and therefore might get presented with listings that are out of your budget, an option to set a price range will be added in the future.
-   You can't ignore certain listing ids yet, an ignore list will be added in the future.
