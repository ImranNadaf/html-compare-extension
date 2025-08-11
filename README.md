# HTML Baseline & Compare Chrome Extension

## Overview
This Chrome extension lets you **capture** the HTML of any webpage as a *baseline* and later **compare** it against the same page after changes (e.g., new builds or updated content).  
It automatically stores multiple timestamped baselines per URL and always compares against the most recent one.  

It also **ignores whitespace-only changes** so you only see meaningful differences.

---

## Features
- **Capture Baseline:** Save the current page’s HTML for future comparison.  
- **Multiple Baselines per URL:** Every capture is stored with a timestamp — no overwriting.  
- **Compare Against Latest:** Compare the current HTML with the most recent saved baseline for that URL.  
- **Whitespace Normalization:** Ignore trailing spaces, tabs, and blank lines to avoid false differences.  
- **Clear Diff View:** Additions and deletions are highlighted for easy visual inspection.

---

## Installation

1. **Download or clone** this repository to your computer.
2. **Open Chrome** and go to:  
   `chrome://extensions/`
3. **Enable** “Developer mode” in the top-right corner.
4. Click **"Load unpacked"** and select the folder containing the extension files.
5. The extension icon should now appear in your Chrome toolbar.

---

## Usage

1. **Open a webpage** you want to track.
2. Click the extension’s icon to open the popup.
3. Click **Capture**  
   → This saves the HTML of the current page as a baseline with the current timestamp.
4. Later, revisit the same URL after changes have been made.
5. Click **Compare**  
   → The extension will compare the current HTML with the **latest saved baseline** and display differences side-by-side.

---

## Notes
- The extension will **not** work on Chrome internal pages (e.g., `chrome://extensions/`) or some restricted domains due to Chrome security policies.
- If you need to capture `file://` pages, enable “Allow access to file URLs” in the extension’s details.
- Multiple baselines are stored per URL, but only the most recent one is used in comparisons in this version.

---

## File Structure
'''
/extension
│── manifest.json # Extension manifest file
│── popup.html # Popup UI
│── popup.js # Main logic for capture & compare
│── styles.css # Popup styles
│── diff.js # Diff algorithm
│── icons/ # Extension icons
└── README.md # This file
'''
---

## License
MIT License — free to use and modify.