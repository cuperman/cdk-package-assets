#!/bin/ash

set -e

cp /asset-input/package.json /asset-output/package.json
yarn install --cwd /asset-output --modules-folder nodejs/node_modules --production
