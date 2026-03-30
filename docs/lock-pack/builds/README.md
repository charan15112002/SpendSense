# Builds Folder

Purpose: Store build manifests and release notes for every distributed APK.

Recommended contents:

- one manifest per build ID
- optional changelog per build
- optional checksum file per distributed APK

Rule:

No externally shared build should exist without a matching manifest in this folder.
