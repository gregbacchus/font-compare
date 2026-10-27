# Font Overlay Lab — local source

This is the complete editable source for Font Overlay Lab. It is a buildless web app: `src/index.html`, `src/app.js`, `src/styles.css`, and `src/fonts.json` are the files the browser runs. There is no compiled bundle, package install, or build step.

## Run it

1. Install Python 3 if it is not already available.
2. Extract this ZIP and open a terminal in the extracted `font-overlay-lab-local` folder.
3. On macOS or Linux, run `./start.sh`. On Windows, run `start.bat` (or double-click it).
4. Open <http://127.0.0.1:8000/> in your browser. Press Ctrl+C in the terminal to stop the server.

The scripts serve `src/` directly. Edit a source file and refresh the browser to see your change. If port 8000 is occupied, run `python3 -m http.server 8001 --bind 127.0.0.1 --directory src` (Windows: `py -3 -m http.server 8001 --bind 127.0.0.1 --directory src`) and open port 8001 instead.

## Deploy to GitHub Pages

This project is a static website with no build step, so it can be deployed directly to GitHub Pages.

1. Push this repository to GitHub.
2. Open the repository on GitHub and go to Settings → Pages.
3. Set the source to GitHub Actions.
4. Commit the workflow file at `.github/workflows/deploy-pages.yml`.
5. Push or merge to `main`; GitHub Actions will publish the contents of `src/` to your Pages site.

GitHub Pages serves the site from the repository root of the generated artifact, so the app's relative asset URLs (`./styles.css`, `./app.js`, `./fonts.json`) keep working without any build config.

Google Fonts needs an internet connection. Uploaded font files are read in the browser and can be used offline. Listing installed fonts depends on browser support for the Local Font Access API; use a current Chromium-based browser for that feature, or upload font files instead.
