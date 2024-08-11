import { $ } from "bun";

let buildTargets = [
    "windows-x64-modern",
    "linux-x64-modern",
    "darwin-x64-modern",
];
const validTargets = ["windows", "macos", "linux"];

if (Bun.argv.length == 3 && Bun.argv[1].toLowerCase() !== "all") {
    switch (Bun.argv[2]) {
        case "windows":
            buildTargets = ["windows-x64-modern"];
            break;
        case "macos":
            buildTargets = ["darwin-x64-modern"];
            break;
        case "linux":
            buildTargets = ["linux-x64-modern"];
            break;
        default:
            console.log(
                "[X] Invalid target, please use one of the following (or leave blank to build all targets):"
            );
            validTargets.forEach((target) =>
                console.log(`${" ".repeat(4)}- ${target}`)
            );

            process.exit(1);
    }
}

for (const target of buildTargets) {
    console.log("=============================");
    try {
        console.log(`[*] Building for ${target}`);
        await $`bun build --compile --target=bun-${target} --sourcemap --minify ./index.ts  --outfile=dist/find-a-float-${target}`.quiet();
        console.log(`[!] Successfully built for ${target}`);
    } catch (e) {
        console.log(`[X] Failed to build for ${target}`);
    }
}
