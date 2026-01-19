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
