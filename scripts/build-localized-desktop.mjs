#!/usr/bin/env node
import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

const [version, ...rawArgs] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+(?:-nightly\.\d{8}\.\d+)?$/.test(version ?? "")) {
  throw new Error("Pass the exact official stable or nightly version, without an i18n suffix.");
}
if (
  rawArgs.some((arg) => /^--(?:build-version|skip-build|output-dir|mock-updates)(?:=|$)/.test(arg))
) {
  throw new Error("Localized builds own the version, output directory and fresh build settings.");
}
const zhBuildIndex = rawArgs.indexOf("--zh-build");
const zhBuild = zhBuildIndex === -1 ? undefined : rawArgs[zhBuildIndex + 1];
const args = zhBuildIndex === -1 ? rawArgs : rawArgs.toSpliced(zhBuildIndex, 2);
if (zhBuild !== undefined && !/^[1-9]\d*$/.test(zhBuild)) {
  throw new Error("--zh-build takes a positive integer.");
}
const updateRepository = process.env.T3CODE_ZH_UPDATE_REPOSITORY?.trim() ?? "";
const signIdentity = process.env.T3CODE_ZH_SIGN_IDENTITY?.trim() ?? "";
const signKeychain = process.env.T3CODE_ZH_SIGN_KEYCHAIN?.trim() ?? "";
if (updateRepository) {
  // The updater needs a newer version per release and a stable signing identity across releases.
  if (!version.includes("-nightly.") || zhBuild === undefined || !signIdentity) {
    throw new Error("Update releases need a nightly version, --zh-build and a signing identity.");
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(updateRepository)) {
    throw new Error("T3CODE_ZH_UPDATE_REPOSITORY must be owner/repo.");
  }
}
const appVersion = zhBuild === undefined ? version : `${version}.zh.${zhBuild}`;

const run = (command, argv, options = {}) =>
  NodeChildProcess.execFileSync(command, argv, { encoding: "utf8", ...options }).trim();
const git = (...argv) => run("git", argv);
const gh = (path) => JSON.parse(run("gh", ["api", path]));
const tag = `v${version}`;
const upstreamCommit = git("rev-parse", `${tag}^{commit}`);
git("merge-base", "--is-ancestor", upstreamCommit, "HEAD");
const release = gh(`repos/pingdotgg/t3code/releases/tags/${tag}`);
if (release.draft) throw new Error("The upstream release is still a draft.");
let publishedCommit = gh(`repos/pingdotgg/t3code/git/ref/tags/${tag}`).object;
while (publishedCommit.type === "tag") {
  publishedCommit = gh(`repos/pingdotgg/t3code/git/tags/${publishedCommit.sha}`).object;
}
if (publishedCommit.sha !== upstreamCommit)
  throw new Error("The local tag does not match the official release.");
for (const name of [
  "SHA256SUMS",
  ...["linux-x64", "linux-arm64", "darwin-arm64"].map(
    (platform) => `t3-${version}-${platform}.tar.gz`,
  ),
  ...["win32-x64", "win32-arm64"].map((platform) => `t3-${version}-${platform}.zip`),
]) {
  if (!release.assets.some((asset) => asset.name === name && asset.state === "uploaded")) {
    throw new Error(`Official release is missing ${name}; cannot build a working SSH client.`);
  }
}
const output = NodePath.resolve("release", `zh-CN-${appVersion}`);
NodeFS.rmSync(output, { recursive: true, force: true });
NodeFS.mkdirSync(output, { recursive: true });
const env = {
  ...process.env,
  T3CODE_DESKTOP_UPDATE_REPOSITORY: updateRepository,
  GITHUB_REPOSITORY: "",
  T3CODE_DESKTOP_MOCK_UPDATES: "false",
  T3CODE_DESKTOP_SKIP_BUILD: "false",
};
const result = NodeChildProcess.spawnSync(
  process.execPath,
  [
    "scripts/build-desktop-artifact.ts",
    ...args,
    "--build-version",
    appVersion,
    "--output-dir",
    output,
  ],
  { stdio: "inherit", env },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const zipName = NodeFS.readdirSync(output).find((name) => name.endsWith(".zip"));
if (signIdentity) {
  if (!zipName) throw new Error("Signing needs the macOS zip artifact; build with --target dmg.");
  resignMacArtifacts(NodePath.join(output, zipName));
}
NodeFS.writeFileSync(
  NodePath.resolve(output, "localization-build.json"),
  JSON.stringify(
    {
      locale: "zh-CN",
      version,
      appVersion,
      upstreamCommit,
      sourceCommit: git("rev-parse", "HEAD"),
      dirty: git("status", "--porcelain").length > 0,
      release: release.html_url,
      updateRepository: updateRepository || null,
      signed: Boolean(signIdentity),
    },
    null,
    2,
  ) + "\n",
);

// electron-builder signs only with trusted identities, so the self-signed identity is applied
// afterwards; the zip, DMG and update manifest are then rebuilt from the re-signed app.
function resignMacArtifacts(zipPath) {
  const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-zh-sign-"));
  try {
    const stage = NodePath.join(work, "stage");
    run("ditto", ["-x", "-k", zipPath, stage]);
    const appName = NodeFS.readdirSync(stage).find((name) => name.endsWith(".app"));
    if (!appName) throw new Error("The macOS zip does not contain an app bundle.");
    const app = NodePath.join(stage, appName);
    const feed = NodePath.join(app, "Contents/Resources/app-update.yml");
    if (updateRepository) {
      const config = NodeFS.readFileSync(feed, "utf8");
      const [owner, repo] = updateRepository.split("/");
      if (!config.includes(`owner: ${owner}`) || !config.includes(`repo: ${repo}`)) {
        throw new Error("The app update feed does not point at the localized repository.");
      }
    } else if (NodeFS.existsSync(feed)) {
      throw new Error("Unexpected update feed in a build without an update repository.");
    }
    run("codesign", [
      "--force",
      "--deep",
      ...(signKeychain ? ["--keychain", signKeychain] : []),
      "--sign",
      signIdentity,
      app,
    ]);
    run("codesign", ["--verify", "--deep", "--strict", app]);
    const inspected = NodeChildProcess.spawnSync("codesign", ["-d", "-r-", app], {
      encoding: "utf8",
    });
    const requirement = `${inspected.stdout}${inspected.stderr}`;
    if (!/certificate root = H"/.test(requirement)) {
      throw new Error(`Unexpected designated requirement: ${requirement}`);
    }

    for (const name of NodeFS.readdirSync(output)) {
      if (/\.(?:zip|dmg|blockmap)$/.test(name) || /-mac\.yml$/.test(name)) {
        NodeFS.rmSync(NodePath.join(output, name));
      }
    }
    const zip = NodePath.join(output, NodePath.basename(zipPath));
    run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", app, zip]);
    NodeFS.symlinkSync("/Applications", NodePath.join(stage, "Applications"));
    run("hdiutil", [
      "create",
      "-volname",
      appName.replace(/\.app$/, ""),
      "-srcfolder",
      stage,
      "-format",
      "UDZO",
      zip.replace(/\.zip$/, ".dmg"),
    ]);
    if (updateRepository) {
      const bytes = NodeFS.readFileSync(zip);
      const sha512 = NodeCrypto.createHash("sha512").update(bytes).digest("base64");
      const file = NodePath.basename(zip);
      NodeFS.writeFileSync(
        NodePath.join(output, "nightly-mac.yml"),
        [
          `version: ${appVersion}`,
          "files:",
          `  - url: ${file}`,
          `    sha512: ${sha512}`,
          `    size: ${bytes.length}`,
          `path: ${file}`,
          `sha512: ${sha512}`,
          `releaseDate: '${new Date().toISOString()}'`,
          "",
        ].join("\n"),
      );
    }
  } finally {
    NodeFS.rmSync(work, { recursive: true, force: true });
  }
}
