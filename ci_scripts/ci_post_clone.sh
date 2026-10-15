#!/bin/zsh
# Xcode Cloud：クローン直後に Node・JS 依存・CocoaPods を用意する（docs/XCODE-CLOUD.md）
# 置き場所：Xcode Cloud が選ぶワークスペース（リポジトリ直下の SWCROSSPOINT.xcworkspace）と同じ階層
# - Node は nodejs.org の v22 最新を取得（Homebrew より速い）
# - npm ci → pod install。expo prebuild は再実行しない（ios/ はコミット済みが正。差分は GitHub CI が検出）
set -euo pipefail

REPO="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$REPO"

echo "== Node =="
NODE_DIR="$HOME/node22"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  TARBALL=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | awk '/darwin-arm64\.tar\.gz/ {print $2}')
  echo "download $TARBALL"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$TARBALL" -o /tmp/node.tar.gz
  mkdir -p "$NODE_DIR"
  tar -xzf /tmp/node.tar.gz -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
node --version
npm --version

echo "== npm ci =="
export CI=1 EXPO_NO_TELEMETRY=1
npm ci --no-audit --no-fund

echo "== ios/.xcode.env.local（Bundle React Native フェーズが使う node のパス）=="
echo "export NODE_BINARY=\"$NODE_DIR/bin/node\"" > ios/.xcode.env.local
cat ios/.xcode.env.local

echo "== pod install =="
cd ios
pod --version
pod install

echo "== done =="
