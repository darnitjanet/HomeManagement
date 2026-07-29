# HomeManagement Project

## Project Structure
Monorepo with packages:
- `packages/backend` - Node.js/Express API with TypeScript
- `packages/frontend` - React frontend

## UI/UX Requirements
- **Touchscreen-first**: This app is designed for touchscreen devices
- **NO hover-only interactions**: All interactive elements must be accessible without hover
  - Action buttons (edit, delete) must always be visible or accessible via tap
  - Tooltips should not be the only way to convey information
  - Dropdown menus should work with tap/click, not just hover

## Color Scheme
**IMPORTANT: Always use these colors. Do not introduce other colors.**
- `#eed6aa` - Light cream/beige (backgrounds, cards)
- `#5b768a` - Slate blue-gray (headers, primary UI elements)
- `#da6b34` - Burnt orange (accents, call-to-action buttons)
- `#fde2e2` - Light pink/blush (error states, danger backgrounds)
- `#dc9e33` - Golden/amber (secondary accents, highlights)

## Database
- SQLite with Knex.js migrations
- Database file: `packages/backend/database/home_management.db`

---

## ⚠️ OPEN ITEMS / SESSION NOTES (2026-07-28 → 29)

### 1. PENDING DEPLOY — "Continue without Google" login + build fix
Committed & pushed to GitHub (`main`, commit `70fa120`) but **NOT yet built/deployed on the Pi.**
Once the Pi is reachable again, deploy with:
```bash
cd ~/HomeManagement && git pull && cd packages/frontend && npx vite build
# then refresh the browser (frontend-only change, no backend restart needed)
```
**What changed:**
- `App.tsx` / `App.css`: Added a **"Continue without Google"** button to the login screen. It sets `localStorage 'localAccess'='true'` and lets the app be used **without** Google sign-in. Everything local (Recipes, Shopping, Chores, Kids, Movies, Books, Pantry, Plants, Meal Plan, etc.) works with no auth. Google login is only needed for **Calendar / Contacts / Gmail sync** (the only routes behind `requireAuth`). This lets any device on the LAN use the app without the OAuth dance below.
- Removed leftover `MicButton` imports from `RecipesList.tsx`, `ShoppingList.tsx`, `PantryInventory.tsx`. They imported a **deleted** `../common/MicButton` (dropped speech-to-text feature) which was breaking the **entire `vite build`**. The build was silently broken in git; the Pi only kept running on an older `dist`. **Do not re-add MicButton/useSpeechInput.**

### 2. Logging into the app FROM A DEVICE OTHER THAN THE PI (OAuth workaround)
`GOOGLE_REDIRECT_URI` = `http://localhost:3000/api/auth/google/callback`. This only resolves correctly **on the Pi itself** (where `localhost` = the app). From a PC/phone, after Google login the browser is sent to `localhost:3000` → **ERR_CONNECTION_REFUSED**.
**Workaround:** On the "localhost refused to connect" page, edit the browser address bar and replace **`localhost`** with **`192.168.68.58`** (leave the rest — the `?code=...` — identical), press Enter. That delivers the auth code to the Pi, completes sign-in, and lands you back in the app logged in. The code is single-use and expires in ~1–2 min, so do it quickly.
**Why not just register the Pi's IP as a redirect URI:** Google rejects raw private IPs (192.168.x.x) and non-HTTPS non-localhost URLs as authorized redirect URIs. A true multi-device fix needs HTTPS (reverse proxy / Cloudflare Tunnel / Tailscale). The "Continue without Google" button (item 1) sidesteps this for all non-Google features.

### 3. Pi keyboard-over-VNC broken + network flapping (UNRESOLVED)
Symptoms observed this session:
- **Physical keyboard typed through RealVNC does NOT enter text into app fields** (used to work). Likely a Wayland/`wayvnc` keyboard-input regression after an OS update — mouse works, keys don't reach the Chromium/Wayland app.
- After a **reboot**, VNC stopped connecting at all ("connection closed remotely", then "timed out"). Port 5900 is open (VNC server running) but the handshake dies because…
- **The Pi is flapping on the network (~50% packet loss)** — app on `:3000` alternates UP/DOWN every few seconds. A power-cycle did **not** fix it. This matches the known **WiFi power-save drop** issue (previously fixed via `nmcli ... wifi.powersave 2` + static IP on Deco UUID `90b5aff8-ca23-4c2d-bba5-28eb82edba8a`); a reboot likely reverted it.

**Access constraints during this session:** no USB keyboard on the Pi, VNC won't hold, and **SSH is OFF** (port 22 closed/filtered from the LAN). No remote command channel available.

**How to recover (need ONE of these):**
- **Ethernet cable** Pi→router: bypasses flaky WiFi; connection goes solid; reconnect via **RealVNC account** (finds the device regardless of IP — wired gets a different DHCP IP than the WiFi static `192.168.68.58`). Also diagnostic: if wired *also* flaps, suspect power supply / SD card, not WiFi.
- **USB keyboard** on the Pi: press **Ctrl+Alt+F2** to drop to a text console (TTY) OUTSIDE the fullscreen Chromium kiosk; **Ctrl+Alt+F1 (or F7)** returns to the kiosk. From the TTY, log in and fix WiFi power-save + **enable SSH** (`sudo raspi-config` → Interface Options → SSH) so future fixes can be done remotely from the PC.

**Once back in, do all of:** re-disable WiFi power-save (persist it), enable SSH, run the pending deploy (item 1), and investigate the wayvnc keyboard-input regression.

**Note:** `RASPBERRY_PI_SETUP.md` references an older DB path/IP; the live values are IP `192.168.68.58`, DB `~/HomeManagement/packages/backend/database/homemanagement.db` (no underscore).

---

## Known Issues & Fixes

### Google OAuth Login 400 Error (Fixed 2026-04-13)
**Problem:** Chromium in `--kiosk` mode on the Pi mangles server-side 302 redirects to Google's OAuth URL, causing Google to show "400 malformed request" (missing `response_type`). The redirect URL is valid (confirmed via curl) — the issue is browser-specific.

**Fix:** Changed login flow from server-side redirect to client-side navigation:
- Added `GET /api/auth/google/url` endpoint that returns the OAuth URL as JSON
- Frontend fetches URL via `fetch()`, then navigates with `window.location.href`
- Also improved OAuth callback to capture Google's error parameter and show it on the login page

**If login breaks again:**
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check OAuth URL endpoint: `curl http://localhost:3000/api/auth/google/url`
3. If Chromium is stuck, kill and restart: `WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 chromium --ozone-platform=wayland --kiosk ...`
4. If Google rejects the URL itself, check Google Cloud Console credentials

### Session Cookie Secure Flag (Fixed 2026-03-09, commit 3e7db51)
**Problem:** Session cookie had `secure: true` in production, but Pi runs on HTTP localhost.
**Fix:** Set `secure: false` in session cookie config.

## Recent Work: Kiosk Kids Rewards Display (COMPLETED)

Added read-only kids rewards tracker display to kiosk dashboard.

**Features:**
- Shows each kid with avatar, name, and current sticker count
- Displays progress bar toward next unclaimed reward
- Shows reward name and progress (e.g., "Ice Cream (5/10)")
- Gold star icons for stickers
- Gift icon for reward goals
- Non-interactive display only (no buttons)
- Tasks list reduced from 5 to 3 items to make room

**Files Modified:**
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Added Kid interface, kids state, loadKids function, kids section UI
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Added kids rewards styling

---

## Recent Work: Kiosk & Notification Fixes (COMPLETED)

Various fixes for the Raspberry Pi kiosk deployment.

**Fixes:**
- **Duplicate notifications bug**: Fixed date comparison in notification.service.ts using `substring(0, 10)` instead of `split('T')[0]` since SQLite stores dates as `YYYY-MM-DD HH:MM:SS` without the T separator
- **Notification bell centering**: Moved notification bell to center of header using absolute positioning
- **Notification dropdown animation**: Fixed glitchy animation by including `translateX(-50%)` in keyframes
- **Settings modal width**: Fixed skinny modal by adding min-width and margin
- **Kiosk URL detection**: App now properly detects `/kiosk` URL path on load to enter kiosk mode
- **Kiosk sleep mode**: Fixed sleep timer not activating by using ref for isSleeping state to prevent callback recreation loops
- **Removed floating keyboard in kiosk**: VirtualKeyboard removed from KioskDashboard (kiosk has its own keyboard icon in controls)
- **Motion detection timing**: Fixed video element not being available by rendering it during loading state

**Files Modified:**
- `packages/backend/src/services/notification.service.ts` - Date comparison fix
- `packages/frontend/src/components/Navigation/Header.tsx` - 3-column layout with centered bell
- `packages/frontend/src/components/Navigation/Header.css` - Absolute positioning for center
- `packages/frontend/src/components/Notifications/NotificationBell.css` - Animation keyframes fix
- `packages/frontend/src/components/Notifications/NotificationSettings.css` - Fixed skinny modal width
- `packages/frontend/src/App.tsx` - URL-based kiosk detection
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Sleep timer ref fix, video element timing fix, removed VirtualKeyboard import and usage

---

## Raspberry Pi Kiosk Setup

**Current Pi IP:** 192.168.68.58 (may change on network reconnect)

**Startup Script:** `~/start-kiosk.sh`
```bash
#!/bin/bash
sleep 10
cd ~/HomeManagement/packages/backend
NODE_ENV=production npx ts-node --transpile-only src/index.ts &
sleep 15
chromium --ozone-platform=wayland --start-fullscreen --noerrdialogs --disable-infobars --password-store=basic --enable-features=WebRTCPipeWireCapturer http://localhost:3000/kiosk
```

**Chromium Flags for Pi (Wayland/Trixie):**
- `--ozone-platform=wayland` - Required for Wayland display
- `--start-fullscreen` - Fullscreen mode
- `--password-store=basic` - Prevents keyring password popup
- `--noerrdialogs --disable-infobars` - Clean kiosk experience
- `--enable-features=WebRTCPipeWireCapturer` - Enable PipeWire for camera on Wayland

**Camera Permissions:** Camera permission for localhost:3000 is saved in Chromium preferences. If motion detection doesn't work, check that permission is granted in browser settings.

**Motion Detection:** When enabled in Settings → Notifications, a green camera indicator shows on the kiosk. The kiosk will wake from sleep when motion is detected.

**Database on Pi:** `~/HomeManagement/packages/backend/database/homemanagement.db` (note: no underscore)

**Deploy Updates to Pi:**
```bash
ssh pi@192.168.68.58 "cd ~/HomeManagement && git pull && cd packages/frontend && npx vite build"
# Then restart Chromium or refresh browser
```

---

## Recent Work: Smart Weather Alerts (COMPLETED)

Added intelligent weather alerts to the kiosk dashboard.

**Features:**
- Contextual alerts based on weather conditions
- "Bring umbrella" for rain/drizzle
- "Freeze warning" when low temp <= 32°F
- "Heat advisory" when high temp >= 95°F
- "Beautiful day" for nice weather
- Color-coded by severity (info/warning/danger)

**Files Modified:**
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - getWeatherAlerts() function
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Alert styling

---

## Recent Work: Shopping List Store Integration (COMPLETED)

Added "Send to Dillons" and "Send to Walmart" buttons to shopping list.

**Features:**
- Step-through modal to shop items one at a time
- Opens store search in new browser tab for each item
- Visual progress tracking (completed/current items)
- Works with Pi kiosk setup (uses --start-fullscreen not --kiosk)

**Files Modified:**
- `packages/frontend/src/components/Shopping/ShoppingList.tsx`
- `packages/frontend/src/components/Shopping/ShoppingList.css`

---

## Recent Work: Barcode Scanner (COMPLETED)

Added barcode scanning to shopping list using USB barcode scanner.

**Features:**
- Scan button opens modal with input field
- USB barcode scanners type barcode + Enter, auto-submits
- Uses Open Food Facts API (free, no API key) to lookup products
- Auto-categorizes products for grocery list
- Shows success/error feedback
- Works with handheld USB barcode scanners

**Files Created/Modified:**
- `packages/backend/src/services/barcode.service.ts` - Product lookup service
- `packages/backend/src/controllers/shopping.controller.ts` - Added lookupBarcode endpoint
- `packages/backend/src/routes/shopping.routes.ts` - Added barcode route
- `packages/frontend/src/components/Shopping/ShoppingList.tsx` - Scan modal UI
- `packages/frontend/src/components/Shopping/ShoppingList.css` - Scan modal styling
- `packages/frontend/src/services/api.ts` - Added lookupBarcode API call

---

## Recent Work: Birthday Reminders (COMPLETED)

Added birthday tracking to regular contacts (Google Contacts sync) with notifications.

**Features:**
- Birthday field (MM-DD format) on contacts, synced from Google Contacts
- Bidirectional sync - adding birthday in app syncs back to Google
- Upcoming birthdays displayed on kiosk dashboard
- Automatic notifications 7 days before birthdays
- Today/tomorrow special highlighting
- Birthday notifications in notification bell

**Files Created/Modified:**
- `packages/backend/database/migrations/20260112000003_add_birthday_to_regular_contacts.js` - Added birthday column to contacts table
- `packages/backend/database/migrations/20260112000002_add_birthday_reminders_preference.js` - Added preference
- `packages/backend/src/repositories/contact.repository.ts` - Added `getContactsWithUpcomingBirthdays()`, birthday field mapping
- `packages/backend/src/controllers/contacts.controller.ts` - Added `getUpcomingBirthdays` and `updateBirthday` endpoints
- `packages/backend/src/routes/contacts.routes.ts` - Added `/birthdays` and `/:id/birthday` routes
- `packages/backend/src/services/google-contacts.service.ts` - Added birthday extraction and update support
- `packages/backend/src/services/contacts-sync.service.ts` - Birthday synced from Google
- `packages/backend/src/services/notification.service.ts` - Added `generateBirthdayNotifications()` using ContactRepository
- `packages/backend/src/schedulers/notification.scheduler.ts` - Added birthday check
- `packages/backend/src/types/index.ts` - Added `birthday_reminder` type, preference, and birthday field to Contact
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Birthday widget on kiosk
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Birthday widget styling
- `packages/frontend/src/services/api.ts` - Added `getUpcomingBirthdays()` and `updateBirthday()` to contactsApi

---

## Recent Work: Seasonal Task Reminders (COMPLETED)

Recurring tasks with seasonal triggers.

**Files Created:**
- `packages/backend/database/migrations/20260112100000_create_seasonal_tasks.js`
- `packages/backend/src/repositories/seasonal-task.repository.ts`
- `packages/backend/src/controllers/seasonal-task.controller.ts`
- `packages/backend/src/routes/seasonal-task.routes.ts`
- `packages/frontend/src/components/SeasonalTasks/`

---

## Recent Work: Package Tracking (COMPLETED)

Track deliveries with email integration.

**Features:**
- Automatic email sync every hour (checks for new shipping & appointment emails)
- Manual "Sync from Email" button for immediate import
- Parses tracking info from major retailers and carriers
- Package delivery notifications
- Appointment reminder notifications (parsed from appointment confirmation emails)

**Supported Vendors:** Amazon, Walmart, Target, eBay, Best Buy, Home Depot, Lowes, Costco, Etsy, AliExpress, Newegg, Chewy, Express Scripts, CVS, Walgreens

**Supported Carriers:** UPS, FedEx, USPS, DHL, OnTrac, Amazon Logistics

**Files Created:**
- `packages/backend/database/migrations/20260112110000_create_packages_table.js`
- `packages/backend/database/migrations/20260112120000_add_email_id_to_packages.js`
- `packages/backend/src/repositories/package.repository.ts`
- `packages/backend/src/controllers/packages.controller.ts`
- `packages/backend/src/routes/packages.routes.ts`
- `packages/backend/src/controllers/gmail.controller.ts`
- `packages/backend/src/routes/gmail.routes.ts`
- `packages/backend/src/services/google-gmail.service.ts`
- `packages/backend/src/services/shipping-email-parser.ts`
- `packages/backend/src/services/appointment-email-parser.ts` - Parses appointment reminder emails
- `packages/backend/src/schedulers/notification.scheduler.ts` - Added hourly email sync (packages + appointments)
- `packages/frontend/src/components/Packages/`

---

## Recent Work: Text-to-Speech Announcements (COMPLETED)

Automatic voice announcements on the kiosk dashboard.

**Features:**
- Wake-up greeting when kiosk wakes from sleep
- Speaks: time, weather summary, weather alerts, calendar preview, birthdays
- User preference to enable/disable TTS in Settings
- Uses browser SpeechSynthesis API

**Files Created/Modified:**
- `packages/frontend/src/hooks/useSpeechSynthesis.ts` - TTS hook
- `packages/frontend/src/utils/announcementGenerator.ts` - Generate spoken text
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Integrate TTS on wake
- `packages/backend/database/migrations/20260112130000_add_tts_enabled_preference.js`
- `packages/backend/src/types/index.ts` - Add ttsEnabled to preferences
- `packages/backend/src/repositories/notification.repository.ts` - Map ttsEnabled
- `packages/frontend/src/stores/useNotificationStore.ts` - Add ttsEnabled
- `packages/frontend/src/components/Notifications/NotificationSettings.tsx` - TTS toggle

---

## Recent Work: Motion Detection Wake-Up (COMPLETED)

Camera-based motion detection to wake the kiosk from sleep mode.

**Features:**
- Camera detects motion and wakes kiosk automatically
- Triggers TTS greeting when waking from motion
- Opt-in for privacy (disabled by default)
- Green camera indicator when active
- TTS mute button added to kiosk UI
- Configurable in Settings → Notifications

**Files Created/Modified:**
- `packages/frontend/src/hooks/useMotionDetection.ts` - Motion detection hook
- `packages/backend/database/migrations/20260112140000_add_motion_detection_preference.js`
- `packages/backend/src/types/index.ts` - Add motionDetectionEnabled to preferences
- `packages/backend/src/repositories/notification.repository.ts` - Map motionDetectionEnabled
- `packages/frontend/src/stores/useNotificationStore.ts` - Add motionDetectionEnabled
- `packages/frontend/src/components/Notifications/NotificationSettings.tsx` - Motion detection toggle
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Integrate motion detection, TTS mute button
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Control buttons styling

---

## Recent Work: "Hey Cosmo" Voice Assistant (COMPLETED)

Voice-activated assistant with wake word detection.

**Features:**
- Say "Hey Cosmo" followed by a command to control the kiosk
- Continuous listening for wake word using Web Speech API
- Supported commands:
  - "Hey Cosmo, add milk to the shopping list" - adds to grocery list
  - "Hey Cosmo, add task call mom" - creates a new task
  - "Hey Cosmo, add chore vacuum" - creates a new chore
  - "Hey Cosmo, set timer for 5 minutes" - timer command
- Visual feedback: indicator shows when listening, awake, or processing
- Toggle button to enable/disable "Hey Cosmo" on kiosk
- TTS response after command execution
- Wakes kiosk from sleep when wake word is detected

**Files Created/Modified:**
- `packages/frontend/src/hooks/useVoiceAssistant.ts` - Voice assistant hook with wake word detection
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Integrate voice assistant
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Cosmo indicator styling

---

## Recent Work: Global Barcode Scanner (COMPLETED)

Detect barcode input anywhere on kiosk dashboard.

**Features:**
- USB barcode scanners work globally on kiosk (no need to focus input)
- Detects fast keyboard input pattern (< 50ms between keys)
- Auto-looks up product via Open Food Facts API
- Adds product to shopping list automatically
- TTS announcement of added item
- Visual feedback (green success / red error toast)
- Barcode icon indicator in controls shows scanner ready status

**Files Created/Modified:**
- `packages/frontend/src/hooks/useBarcodeDetector.ts` - Global barcode detection hook
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Integrate barcode detector
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Barcode indicator/result styling

---

## Recent Work: Kiosk Timer (COMPLETED)

Timer feature for kiosk with voice and manual control.

**Features:**
- Manual timer button in kiosk controls (clock icon)
- Timer modal with preset times (1, 3, 5, 10, 15, 30 min)
- +/- buttons for custom time adjustment
- Large countdown display when timer active
- Voice announcement when timer completes
- Voice commands: "Hey Cosmo, set timer for X minutes" / "cancel timer"

**Files Modified:**
- `packages/frontend/src/hooks/useVoiceAssistant.ts` - Timer voice commands
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Timer UI and logic
- `packages/frontend/src/components/Kiosk/KioskDashboard.css` - Timer styling

---

## Recent Work: Smart Home Integration (ON HOLD)

Integrate Govee lights, Ecobee thermostat, and Eufy cameras into the kiosk dashboard.

**Status:** ON HOLD - Ecobee is not currently issuing new API keys to developers. Govee API key request submitted. Code is complete and will work once API keys are available.

**Features:**
- Smart Home button in kiosk controls opens modal
- Govee lights: on/off toggle, brightness slider
- Ecobee thermostat: current/target temp display, +/- controls, mode buttons (heat/cool/auto/off)
- Eufy cameras: camera list, snapshot viewer
- Graceful degradation - services only show when configured
- Voice commands via Cosmo: "turn on/off the lights", "set temperature to X degrees"

**Environment Variables (add to .env when available):**
- `GOVEE_API_KEY` - Govee API key (request via Govee Home app → Profile → Settings → About Us → Apply for API Key)
- `ECOBEE_API_KEY` + `ECOBEE_REFRESH_TOKEN` - Ecobee OAuth credentials (developer program currently closed)
- `EUFY_EMAIL` + `EUFY_PASSWORD` - Eufy account credentials (same as Eufy Security app login)

**Files Created:**
- `packages/backend/database/migrations/20260112150000_create_smart_home_tables.js`
- `packages/backend/src/services/govee.service.ts` - Govee lights control
- `packages/backend/src/services/ecobee.service.ts` - Ecobee thermostat control
- `packages/backend/src/services/eufy.service.ts` - Eufy cameras (requires `npm install eufy-security-client`)
- `packages/backend/src/controllers/smart-home.controller.ts`
- `packages/backend/src/routes/smart-home.routes.ts`
- `packages/frontend/src/components/SmartHome/SmartHomeModal.tsx`
- `packages/frontend/src/components/SmartHome/SmartHomeModal.css`

**Files Modified:**
- `packages/backend/src/app.ts` - Added smart-home routes
- `packages/frontend/src/services/api.ts` - Added smartHomeApi
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Smart home button and modal
- `packages/frontend/src/hooks/useVoiceAssistant.ts` - Added lights_on, lights_off, set_temperature commands

**To Resume:**
1. When Govee API key arrives via email, add `GOVEE_API_KEY=xxx` to .env
2. When Ecobee reopens developer program, complete OAuth flow and add credentials
3. For Eufy, run `npm install eufy-security-client` and add email/password to .env
4. Restart backend - configured services will automatically appear in the Smart Home modal

---

---

## Recent Work: Interactive Travel Map (COMPLETED)

Interactive travel map to log visited places with comprehensive tracking.

**Features:**
- Interactive Leaflet map with OpenStreetMap tiles (free, no API key)
- Click on map OR search to add places
- Comprehensive tracking: dates, trip name, rating, companions, expenses, highlights, photos, notes
- Stats panel showing places, countries, US states visited
- List view alternative to map view
- Reverse geocoding to auto-fill location details

**Files Created:**
- `packages/backend/database/migrations/20260108000000_create_travel_tables.js`
- `packages/backend/src/repositories/travel.repository.ts`
- `packages/backend/src/controllers/travel.controller.ts`
- `packages/backend/src/routes/travel.routes.ts`
- `packages/frontend/src/components/Travel/TravelMap.tsx`
- `packages/frontend/src/components/Travel/PlaceForm.tsx`
- `packages/frontend/src/components/Travel/TravelMap.css`

---

## Recent Work: Warranty Tracking (COMPLETED)

Warranty tracking integrated into Home Inventory (Assets):

**Backend:**
- `20260107000001_add_warranty_fields_to_assets.js` - warranty_expiration_date, warranty_provider, warranty_type, warranty_document_url
- `20260107000002_add_warranty_preference.js` - warranty_expiring_alerts preference
- `asset.repository.ts` - `getAssetsWithExpiringWarranties()` query
- `notification.service.ts` - `generateWarrantyExpiringNotifications()`
- `notification.scheduler.ts` - warranty check runs every 15 minutes

**Frontend:**
- `AssetForm.tsx` - "Warranty Info" section
- `AssetsList.tsx` - Warranty status badges (Active/Expiring/Expired)
- `NotificationBell.tsx` - ShieldAlert icon for warranty notifications

**Features:**
- Track warranty expiration, provider, type, document URL
- Visual badges: Green (active 30+ days), Yellow (expiring within 30d), Red (expired)
- Automatic notifications 30 days before expiration

## Previous Work: Notifications System (COMPLETED)

**Backend Components:**
- `notification.service.ts` - Core notification logic and generators
- `notification.repository.ts` - Database operations
- `notification.scheduler.ts` - Cron-based scheduling
- `notifications.controller.ts` - API endpoints
- `notifications.routes.ts` - Route definitions

## Recent Work: Goal Chores & Recipe Wake Lock (COMPLETED)

### Goal Chores (Payback System)
Added "Goal Chores" tab to the Chores page for tracking chores done to earn money toward a goal/debt.

**Features:**
- Payback accounts with total owed/earned/remaining balance and progress bar
- Add chores with description and dollar amount ($1/$5 quick buttons)
- Chore log with delete capability
- "Add to Debt" and "Reset Account" options
- Default account created for Cameron
- Integrated as "Goal Chores" tab in existing Chores page (alongside "Routine - Today" and "Routine - Upcoming")

**Files Created:**
- `packages/backend/database/migrations/20260502000000_create_payback_chores.js` — `payback_accounts` and `payback_chores` tables
- `packages/backend/src/repositories/payback.repository.ts`
- `packages/backend/src/controllers/payback.controller.ts`
- `packages/backend/src/routes/payback.routes.ts` — mounted at `/api/payback`
- `packages/frontend/src/components/Payback/PaybackTracker.tsx`
- `packages/frontend/src/components/Payback/PaybackTracker.css`

**Files Modified:**
- `packages/frontend/src/components/Chores/ChoresList.tsx` — Added "Goal Chores" tab, renders PaybackTracker
- `packages/frontend/src/services/api.ts` — Added paybackApi
- `packages/backend/src/app.ts` — Mounted payback routes

### Recipe Wake Lock
Prevents screen sleep and kiosk mode switch while a recipe modal is open.

**How it works:**
- `RecipeDetail.tsx` acquires a Wake Lock on mount, releases on unmount
- Sets `window.__wakeLockActive` flag that the inactivity timer in `App.tsx` checks before switching to kiosk mode

**Files Modified:**
- `packages/frontend/src/components/Recipes/RecipeDetail.tsx` — Wake Lock API + global flag
- `packages/frontend/src/App.tsx` — Inactivity timer checks `__wakeLockActive` before kiosk switch

---

## Recent Work: Misc Fixes & Pi Network Stability (COMPLETED)

**Fixes:**
- **Shopping list auto-categorization broken (Fixed 2026-04-23)**: Items were all going to "Other" because the AI model `claude-3-haiku-20240307` was deprecated. Updated to `claude-haiku-4-5-20251001`. Extracted model ID to a single `AI_MODEL` constant at top of `packages/backend/src/services/ai.service.ts` so future model updates are a one-line change.
- **Plants page text color**: Changed stat card and water status text to darker shades for readability (CSS cascade was causing light text)
- **Home Assets locations**: Expanded location dropdown from 12 to 24 options — added Entry Way, Family Room, Closet, Dining Room, Guest Room, Hallway, Laundry Room, Nursery, Pantry, Patio/Deck, Playroom, Shed, Utility Room. Sorted alphabetically.
- **Shopping list delete button**: Added per-item trash icon button for quick deletion (hidden in print view)
- **Auth routes not deployed**: The `/api/auth/google/url` endpoint had never been committed to git, causing "failed to connect to server" on login. Committed and deployed.
- **OAuth login popup issue**: Popup-based login opened non-fullscreen windows in kiosk mode. Simplified to same-window navigation. Kiosk bypasses auth entirely so login is only needed from the main app.
- **Family messages on kiosk**: Added compact messages display on kiosk dashboard, inline with daily quote (quote left, messages right in one row). Shows up to 3 recent/pinned messages.
- **AI model constant**: All AI calls in `packages/backend/src/services/ai.service.ts` now use a single `AI_MODEL` constant at the top of the file for easy updates when models are deprecated.

**Pi Network Stability (Fixed 2026-04-22):**
- **Static IP**: Set 192.168.68.58 as permanent via NetworkManager (`nmcli connection modify` with `ipv4.method manual`)
- **WiFi power saving disabled**: `wifi.powersave 2` prevents WiFi adapter from sleeping and dropping connection
- **Note**: There are two "Deco" WiFi connections in NetworkManager. The active one is UUID `90b5aff8-ca23-4c2d-bba5-28eb82edba8a`. Always reference by UUID when modifying.

**If Pi loses network again:**
1. Unplug/replug to reboot
2. Check `nmcli connection show --active` to verify Deco is connected
3. If needed: `sudo nmcli connection up 90b5aff8-ca23-4c2d-bba5-28eb82edba8a`

---

## Recent Work: Meal Plan Page, Message Board, Daily Quote (COMPLETED)

Added three new features: standalone Meal Plan page, Family Message Board, and Daily Quote on kiosk.

### Meal Plan Page
- Promoted meal planner from a modal inside Recipes to its own standalone page
- Two views: **Calendar** (weekly grid) and **List** (day cards) with toggle
- Week navigation (prev/next/today), copy last week, clear week
- Add meals via custom text (just type "Tacos") or pick from saved recipes
- Shopping list generation from recipe ingredients
- Accessible from nav bar ("Meals") and home page card

**Files Created:**
- `packages/frontend/src/components/MealPlan/MealPlanPage.tsx`
- `packages/frontend/src/components/MealPlan/MealPlanPage.css`

**Note:** Backend already existed from prior work (meal_plans + meal_plan_entries tables, repository, controller, routes at `/api/meal-plans`). The existing modal in `packages/frontend/src/components/Recipes/MealPlanner.tsx` still works too.

### Family Message Board
- Sticky note board with colored notes (cream, pink, green, blue, yellow, purple)
- Pin important messages to the top
- Author name remembered via localStorage
- Edit and delete messages

**Files Created:**
- `packages/backend/database/migrations/20260419000000_create_message_board.js` — `messages` table
- `packages/backend/src/repositories/message.repository.ts`
- `packages/backend/src/controllers/message.controller.ts`
- `packages/backend/src/routes/message.routes.ts` — mounted at `/api/messages`
- `packages/frontend/src/components/Messages/MessageBoard.tsx`
- `packages/frontend/src/components/Messages/MessageBoard.css`

### Daily Quote (Kiosk)
- 100 inspirational quotes, rotates daily based on day of year
- Displays at bottom of kiosk dashboard

**Files Created:**
- `packages/frontend/src/components/Kiosk/DailyQuote.tsx`
- `packages/frontend/src/components/Kiosk/DailyQuote.css`

**Files Modified:**
- `packages/frontend/src/App.tsx` — Added MealPlanPage and MessageBoard routes
- `packages/frontend/src/components/Navigation/Header.tsx` — Added Meals and Messages nav buttons
- `packages/frontend/src/components/HomePage/HomePage.tsx` — Added Meal Plan and Messages cards
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` — Added DailyQuote component
- `packages/frontend/src/services/api.ts` — Added messagesApi
- `packages/backend/src/app.ts` — Mounted message routes

---

## Recent Work: Kiosk Stability Fixes (COMPLETED)

Multiple fixes to prevent kiosk from breaking on reboot or session expiry.

**Fixes:**
- **Kiosk bypasses auth**: Kiosk mode (`/kiosk` URL) no longer requires Google login. Most kiosk data (weather, todos, shopping, etc.) doesn't need auth. This prevents the kiosk from getting stuck on the login screen after session expiry.
- **Sleep mode not triggering**: Removed `mousemove` and `touchmove` from activity listeners — phantom touch events on the touchscreen were continuously resetting the 2-minute sleep timer. Now only `mousedown`, `touchstart`, and `keydown` reset it.
- **Fullscreen not working**: Added labwc window rule (`~/.config/labwc/rc.xml`) with `serverDecoration="no"` and `Fullscreen` action for Chromium. Also added `--start-fullscreen` to `start-kiosk.sh`.
- **Shopping list print too large**: Reduced print font sizes (body 10px, title 14px, headers 12px), tightened spacing and checkbox size in `@media print` styles.
- **Duplex printing**: Set CUPS default for Brother printer: `lpoptions -p Brother_HL_L3280CDW_series -o sides=two-sided-long-edge`
- **Desktop shortcut**: Created `~/Desktop/HomeManagement.desktop` so the app can be manually launched in fullscreen kiosk mode if auto-start fails.

**Files Modified:**
- `packages/frontend/src/App.tsx` - Kiosk mode renders before auth check
- `packages/frontend/src/components/Kiosk/KioskDashboard.tsx` - Removed mousemove/touchmove from sleep activity listeners
- `packages/frontend/src/components/Shopping/ShoppingList.css` - Compact print styles

**Pi Config Files Modified:**
- `~/.config/labwc/rc.xml` - Fullscreen window rule for Chromium
- `~/start-kiosk.sh` - Added `--start-fullscreen` flag
- `~/Desktop/HomeManagement.desktop` - Desktop shortcut

---

## Recent Work: TMDB TV Show Search & MPAA Filter Fix (COMPLETED)

Added TV show lookup support to movie catalog and fixed filter label.

**Features:**
- TMDB search now uses `/search/multi` endpoint to return both movies and TV shows
- TV shows display seasons, episodes, content rating (TV-MA, TV-14, etc.)
- TV show details show "Created by" instead of "Director", "Network" instead of "Studio"
- Fixed duplicate "All Ratings" filter label — MPAA rating dropdown now says "MPAA Rating"

**Important:** The `movies` table `type` column has a CHECK constraint: only `'Movie'`, `'Series'`, `'Episode'`, `'All'` are valid. TV shows from TMDB are saved as `'Series'`.

**Files Modified:**
- `packages/backend/src/services/tmdb.service.ts` - Changed search from `/search/movie` to `/search/multi`, added `getTvDetails()`, `getTvContentRating()`, and `mapTMDbTvToMovie()` methods, added TV-specific interfaces
- `packages/backend/src/controllers/movies.controller.ts` - Search results include media type, `getOMDbDetails` handles TV via `type` query param, `createMovieFromOMDb` handles TV via `mediaType` body param
- `packages/frontend/src/components/Movies/OMDbSearchModal.tsx` - Tracks `selectedMediaType`, passes type through search/details/add flow, shows TV-specific info in details view
- `packages/frontend/src/components/Movies/MoviesList.tsx` - Changed MPAA filter label from "All Ratings" to "MPAA Rating"
- `packages/frontend/src/services/api.ts` - `getOMDbDetails` accepts optional `type` param, `createMovieFromOMDb` accepts optional `mediaType`

---

## Commands
```bash
# Start backend
npm run dev:backend

# Start frontend
npm run dev:frontend

# Run migrations
npm run db:migrate:latest

# Build
npm run build
```

## Notes
- Add any issues or blockers encountered during testing here
