import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const files = [
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

try {
  const [arg, option, ...extra] = process.argv.slice(2);
  if (extra.length || (option && option !== "--push") || (arg === "--check" && option)) {
    throw new Error("Usage: pnpm release:version <X.Y.Z> [--push], or --check");
  }
  const source = files.map((file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  const pkg = JSON.parse(source[0]);
  const config = JSON.parse(source[1]);
  const cargoVersion = /\[package\][\s\S]*?\nversion = "([^"]+)"/.exec(source[2])?.[1];
  const cargoName = /\[package\][\s\S]*?\nname = "([^"]+)"/.exec(source[2])?.[1];
  const lockBlock = source[3]
    .split("[[package]]")
    .find((block) => block.includes(`\nname = "${cargoName}"\n`));
  const lockVersion = /\nversion = "([^"]+)"/.exec(lockBlock ?? "")?.[1];
  if (
    !stableVersion.test(pkg.version) ||
    ![config.version, cargoVersion, lockVersion].every((v) => v === pkg.version)
  ) {
    throw new Error(
      "Package, Tauri, Cargo and Cargo.lock versions must match a stable X.Y.Z version."
    );
  }
  if (arg === "--check") {
    console.log(`Release versions match: v${pkg.version}`);
    process.exit(0);
  }
  if (!stableVersion.test(arg ?? ""))
    throw new Error("Usage: pnpm release:version <X.Y.Z> [--push]");
  if (git("status", "--porcelain"))
    throw new Error("Commit or stash changes before creating a release.");
  if (git("branch", "--show-current") !== "main") throw new Error("Create releases from main.");
  const current = pkg.version.split(".").map(Number);
  const next = arg.split(".").map(Number);
  const difference = next.findIndex((value, index) => value !== current[index]);
  if (difference < 0 || next[difference] < current[difference])
    throw new Error("The new version must be greater than the current version.");
  const tag = `v${arg}`;
  if (git("tag", "--list", tag) || git("ls-remote", "--tags", "origin", `refs/tags/${tag}`)) {
    throw new Error(`${tag} already exists.`);
  }
  pkg.version = arg;
  config.version = arg;
  writeFileSync(files[0], `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(files[1], `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(
    files[2],
    source[2].replace(/(\[package\][\s\S]*?\nversion = ")[^"]+"/, `$1${arg}"`)
  );
  writeFileSync(
    files[3],
    source[3].replace(lockBlock, lockBlock.replace(/\nversion = "[^"]+"/, `\nversion = "${arg}"`))
  );
  git("add", "--", ...files);
  git("commit", "-m", `chore: release ${tag}`);
  git("tag", "-a", tag, "-m", `Sticky Notes ${tag}`);
  if (option === "--push") git("push", "--atomic", "origin", "main", tag);
  console.log(
    `Created ${tag}. ${option === "--push" ? "GitHub Actions will publish the downloads." : `Publish with: git push --atomic origin main ${tag}`}`
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
