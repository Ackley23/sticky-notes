import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const nextVersion = `${Number(JSON.parse(readFileSync(join(root, "package.json"))).version.split(".")[0]) + 1}.2.3`;
const nextTag = `v${nextVersion}`;
const files = [
  "package.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "scripts/release-version.mjs",
];

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "sticky-release-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, "src-tauri"));
  mkdirSync(join(dir, "scripts"));
  for (const file of files) copyFileSync(join(root, file), join(dir, file));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "-b", "main");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("config", "tag.gpgsign", "false");
  git("add", ".");
  git("commit", "-m", "initial");
  // A local bare remote exercises the real tag lookup and atomic push without network access.
  git("init", "--bare", "remote.git");
  writeFileSync(join(dir, ".gitignore"), "remote.git/\n");
  git("add", ".gitignore");
  git("commit", "-m", "ignore test remote");
  git("remote", "add", "origin", join(dir, "remote.git"));
  const run = (...args) =>
    spawnSync(process.execPath, ["scripts/release-version.mjs", ...args], {
      cwd: dir,
      encoding: "utf8",
    });
  return { dir, git, run };
}

test("checks versions without changing files", (t) => {
  const { git, run } = fixture(t);
  assert.equal(run("--check").status, 0);
  assert.equal(git("status", "--porcelain"), "");
});

test("accepts Windows CRLF version files", (t) => {
  const { dir, run } = fixture(t);
  for (const file of files.slice(0, 4)) {
    const path = join(dir, file);
    writeFileSync(path, readFileSync(path, "utf8").replace(/\r?\n/g, "\r\n"));
  }
  assert.equal(run("--check").status, 0);
});

test("creates a synchronized version commit and annotated tag, then pushes atomically", (t) => {
  const { dir, git, run } = fixture(t);
  const result = run(nextVersion, "--push");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(run("--check").status, 0);
  assert.equal(JSON.parse(readFileSync(join(dir, "package.json"))).version, nextVersion);
  assert.equal(git("cat-file", "-t", nextTag), "tag");
  assert.equal(git("rev-parse", "HEAD"), git("rev-parse", `${nextTag}^{commit}`));
  assert.ok(git("ls-remote", "--tags", "origin").includes(`refs/tags/${nextTag}`));
  assert.equal(git("status", "--porcelain"), "");
});

test("rejects dirty trees, malformed versions, downgrades and duplicate tags without a commit", (t) => {
  const { dir, git, run } = fixture(t);
  const head = git("rev-parse", "HEAD");
  for (const version of ["garbage", "01.2.3", "1.0.0-beta.1", "0.0.1"])
    assert.notEqual(run(version).status, 0);
  git("tag", nextTag);
  assert.notEqual(run(nextVersion).status, 0);
  writeFileSync(join(dir, "uncommitted.txt"), "pending");
  assert.notEqual(run(nextVersion).status, 0);
  assert.equal(git("rev-parse", "HEAD"), head);
});

test("rejects mismatched version files", (t) => {
  const { dir, run } = fixture(t);
  const path = join(dir, "src-tauri/tauri.conf.json");
  const config = JSON.parse(readFileSync(path));
  config.version = "9.9.9";
  writeFileSync(path, JSON.stringify(config));
  assert.notEqual(run("--check").status, 0);
});
