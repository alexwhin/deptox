#!/usr/bin/env node
/**
 * Syncs version from package.json to Tauri files
 * Called by release-it after version bump
 */

const fs = require('fs');

const version = process.argv[2] || require('./package.json').version;

let cargoContent = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
cargoContent = cargoContent.replace(/^version = ".*"$/m, `version = "${version}"`);
fs.writeFileSync('src-tauri/Cargo.toml', cargoContent);

const tauriConfig = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
tauriConfig.version = version;
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConfig, null, 2) + '\n');

console.log(`✅ Synced Tauri files to v${version}`);
