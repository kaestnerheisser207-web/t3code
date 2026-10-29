# Localized desktop builds

The fork ships its Simplified Chinese macOS client through `.github/workflows/zh-cn-desktop.yml`. Merge an official nightly tag into `feat/i18n-zh-cn`, push, and let the branch build verify it. Publish an in-app update by tagging the verified commit:

```sh
git tag v0.1.4-nightly.20261029.3853.zh.1 && git push origin v0.1.4-nightly.20261029.3853.zh.1
```

The tag names the official nightly the branch is based on plus a localized build number. Raise the number for translation-only releases on the same base. The workflow publishes a prerelease with the zip, DMG and `nightly-mac.yml` that the desktop updater reads.

Keep the official version as the prefix. Desktop SSH downloads the remote runtime for that official version, so `officialReleaseVersion` strips the `.zh.N` suffix before choosing it; an unpublished base fails before it can connect even to an existing server.

macOS only applies an update whose signature satisfies the installed app's designated requirement. Ad hoc signatures pin the content hash, so every localized build is re-signed with one self-signed certificate, which pins the certificate instead. The private key lives in `~/.config/t3-zh-signing` on the maintainer Mac and in the `ZH_MAC_SIGNING_*` repository secrets. Losing or replacing it breaks updates until the next build is installed by hand.

Local builds use the same wrapper. Without `T3CODE_ZH_UPDATE_REPOSITORY` they carry no update feed; with it they also need `--zh-build` and `T3CODE_ZH_SIGN_IDENTITY` (plus `T3CODE_ZH_SIGN_KEYCHAIN` when the identity is not in the default keychain):

```sh
node scripts/build-localized-desktop.mjs 0.1.4-nightly.20261029.3853 --platform mac --arch arm64 --target dmg
```

If a fork changes server contracts or behavior, an official runtime may no longer be compatible; publish matching fork runtimes and configure their download source before distributing that client.
