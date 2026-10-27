@echo off
cd /d "%~dp0"
echo Font Overlay Lab: open http://127.0.0.1:8000/
py -3 -m http.server 8000 --bind 127.0.0.1 --directory src
