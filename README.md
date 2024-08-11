# find-a-float [![Download executable](https://img.shields.io/badge/download-.exe-red)](https://github.com/qtchaos/find-a-float/releases/latest/download/find-a-float-windows-x64-modern.exe)

Finds the lowest (or highest) float listings for a specific skin on the Steam Community Market for Counter-Strike 2.

## Usage

You can download the latest binary from the [releases page](https://github.com/qtchaos/find-a-float/releases), this allows you to run the tool without having Bun nor the repo installed.

```bash
find-a-float.exe <gunName> <skinName> <targetFloat> <targetType (over/under)> [pollInterval (ms)] [flags]
```

Or if you're running from source:

```bash
bun run index.ts <gunName> <skinName> <targetFloat> <targetType (over/under)> [pollInterval (ms)] [flags]
```

## Examples

I want to find all Nova Toy Soldier listings that have a float of 0.95 or higher.

```bash
find-a-float.exe "Nova" "Toy Soldier" 0.95 over
```

I want to find a Huntsman Knife Gamma Doppler thats Factory New and Stattrak™. (P.S You don't have to include the "Knife" part of the name)

```bash
find-a-float.exe "Huntsman" "Gamma Doppler" 0.07 under --stattrak
```

## To-do

Sorted from expected ETA (earliest first):

-   [ ] Add support for Souvenir items
-   [ ] Add support for gloves (without the "Gloves" part of the name)
-   [ ] Add support for different currencies
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
-   Currency conversions are currently hardcoded from USD to EUR and due to Steam fees, they are inaccurate. In the future this will be changed to allow you to choose your base currency.
-   You can't set a price range and therefore might get presented with listings that are out of your budget, an option to set a price range will be added in the future.
-   You can't ignore certain listing ids yet, an ignore list will be added in the future.
