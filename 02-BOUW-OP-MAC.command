#!/bin/bash
set -e
cd "$(dirname "$0")"
echo 'JustAReminder iOS - Xcode op Mac vereist'
command -v node >/dev/null || { echo 'Node.js ontbreekt'; exit 1; }
command -v xcodebuild >/dev/null || { echo 'Xcode ontbreekt'; exit 1; }
npm install
if [ ! -d ios/App ]; then npx cap add ios; fi
npx cap sync ios
npx cap open ios
