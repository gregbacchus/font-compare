#!/bin/sh
set -e
cd "$(dirname "$0")"
printf 'Font Overlay Lab: open http://127.0.0.1:8000/\n'
python3 -m http.server 8000 --bind 127.0.0.1 --directory src
