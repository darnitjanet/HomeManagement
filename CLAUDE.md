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
