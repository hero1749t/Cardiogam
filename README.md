# Cardiogam

Cardiogam is a lightweight front-end project for ECG visualization and quick device/demo testing. It supports real Bluetooth heart-rate devices (when available) and a realistic simulated/demo waveform for testing.

---

## Quick summary
- Project: ECG monitoring UI + demo simulator
- Main pages: `index.html` (home), `dashboard.html` (ECG test flow), `login.html`
- JS: `js/` contains connection, dashboard logic, ECG renderer and demo generators
- CSS: `css/` contains `common.css`, `dashboard.css`, `home.css`

---

## File map (important files)
- `index.html` — main landing page
- `dashboard.html` — multi-step ECG test (user details → device connect → 30-sec ECG → results)
- `login.html` — login page (UI only)
- `css/` — styles
  - `common.css`, `home.css`, `dashboard.css`
- `js/`
  - `main.js` — site-wide helpers and UI initialization
  - `dashboard.js` — step flow, timers, form handling
  - `bluetooth.js` — device connect helpers and demo-mode data generator
  - `ecg.js` — ECG renderer and data sources (simulated / real device abstraction)
- `bluetooth-test.html` — (experimental/test page)

---

## Features
- Demo (simulated) ECG waveform with realistic P-QRS-T complex
- Quick Connect flow to pair via Web Bluetooth (browser support required)
- 30-second test flow with timer, live ECG, and simple report generation
- Modular ECG renderer with data source abstraction (so real or simulated data can be used)

---

## Run locally (simple)
You can serve the files with any static HTTP server. Example options for PowerShell:

1) If you have Python 3 installed:

```powershell
cd 'C:\Users\deepu\Cardiogam'
python -m http.server 8000
# Then open http://localhost:8000/dashboard.html in browser
```

2) If you have Node.js installed, you can use `http-server`:

```powershell
cd 'C:\Users\deepu\Cardiogam'
npm install -g http-server
http-server . -p 8000
# Open http://localhost:8000/dashboard.html
```

3) Or use VS Code Live Server extension: open the folder and click "Go Live".

Notes:
- Use Chrome / Edge / Opera for Web Bluetooth features
- For demo-mode testing no hardware is required

---

## Demo Mode vs Real Device
- Demo mode: click "Use Demo Mode" on the Device Connection step. This starts a simulated stream and forces the ECG renderer into the simulated (advanced) waveform mode.
- Real device: click "Connect via Bluetooth". Your browser will show the system device picker. After pairing, the live ECG will use device data.

If demo mode is active the dashboard's device state is updated so the 30-second test can start without a physical device.

---

## Where to change ECG behavior
- `js/ecg.js` contains `ECG_MODE` and the `CURRENT_MODE` variable. Change `CURRENT_MODE` if you want the default renderer mode changed.
- `js/bluetooth.js` contains the demo generators and calls into `window.switchToSimulated()` when demo starts.

---

## Troubleshooting
- "Please connect device first!" — means `patientData.deviceConnected` is false. Demo mode now sets this flag automatically. For real devices, complete pairing.
- Web Bluetooth not available: make sure your browser supports Web Bluetooth (Chrome/Edge/Opera) and you're using a secure origin (http://localhost or https).
- If JavaScript errors appear, open DevTools (F12) → Console and share the error text.

---

## Collaboration / GitHub
- Repo URL: `https://github.com/hero1749t/Cardiogam`
- To clone:

```powershell
git clone https://github.com/hero1749t/Cardiogam.git
```

- Add collaborators on GitHub: Repo → Settings → Manage access → Invite collaborators

---

## Development notes
- Keep commits small and descriptive (e.g., "fix: demo mode device flag" )
- Use issues in GitHub to track TODOs found in code (there are a couple of `// TODO` markers in `js/ecg.js`)

---

## License
Add a license if you want to publish. (MIT is common for small projects.)

---

If you want, I can also:
- Add a `CONTRIBUTING.md` with contribution steps
- Add a simple GitHub Issue template for bug reports
- Set up GitHub Actions for automated checks (lint/test)

Tell me which of those you'd like next.