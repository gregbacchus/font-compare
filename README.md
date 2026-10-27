# Font Overlay Lab — local source

This is the complete editable source for Font Overlay Lab. It is a buildless web app: `src/index.html`, `src/app.js`, `src/styles.css`, and `src/fonts.json` are the files the browser runs. There is no compiled bundle, package install, or build step.

## Run it

1. Install Python 3 if it is not already available.
2. Extract this ZIP and open a terminal in the extracted `font-overlay-lab-local` folder.
3. On macOS or Linux, run `./start.sh`. On Windows, run `start.bat` (or double-click it).
4. Open <http://127.0.0.1:8000/> in your browser. Press Ctrl+C in the terminal to stop the server.

The scripts serve `src/` directly. Edit a source file and refresh the browser to see your change. If port 8000 is occupied, run `python3 -m http.server 8001 --bind 127.0.0.1 --directory src` (Windows: `py -3 -m http.server 8001 --bind 127.0.0.1 --directory src`) and open port 8001 instead.

Google Fonts needs an internet connection. Uploaded font files are read in the browser and can be used offline. Listing installed fonts depends on browser support for the Local Font Access API; use a current Chromium-based browser for that feature, or upload font files instead.
