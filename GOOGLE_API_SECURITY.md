# Google API Security Setup

## Overview

We've refactored to proxy Google API calls through our API routes to avoid exposing sensitive API keys.

## Current Setup

### ✅ Server-Side Keys (Hidden)

- `GOOGLE_PLACES_API_KEY` - Used for Places API, Geocoding, etc.
- Used in: `/api/events`, `/api/places/nearby`, `/api/properties`
- **Never exposed to browser**

### ⚠️ Maps JavaScript API Key (Required for Map Rendering)

- `GOOGLE_MAPS_API_KEY` - Used ONLY for map rendering
- Fetched via `/api/maps/config` endpoint
- **Still exposed to browser** (required by Google Maps JavaScript API)

## Why Maps Key Still Needs to Be Exposed

Google Maps JavaScript API **requires** the API key in the browser to render maps. This is unavoidable. However, we can secure it:

## Security Best Practices

### 1. Create Separate API Keys

In Google Cloud Console, create **two separate keys**:

**Key 1: Places API Key** (Server-side only)

- Name: `LeaseBoost Places API`
- **API Restrictions**:
  - ✅ Places API
  - ✅ Geocoding API
  - ✅ Reverse Geocoding API
- **Application Restrictions**: None (server-side only)
- Use as: `GOOGLE_PLACES_API_KEY`

**Key 2: Maps JavaScript API Key** (Client-side, restricted)

- Name: `LeaseBoost Maps JS API`
- **API Restrictions**:
  - ✅ Maps JavaScript API ONLY
  - ❌ NO Places API
  - ❌ NO Geocoding API
- **Application Restrictions**: HTTP referrers
  - Add: `localhost:3000/*`
  - Add: `yourdomain.com/*`
  - Add: `*.yourdomain.com/*`
- Use as: `GOOGLE_MAPS_API_KEY`

### 2. Environment Variables

Add to `.env`:

```bash
# Server-side only (never exposed)
GOOGLE_PLACES_API_KEY=your_places_api_key_here

# Client-side (restricted to your domain)
GOOGLE_MAPS_API_KEY=your_maps_js_api_key_here

# Remove this - no longer needed
# NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=...
```

### 3. How It Works Now

1. **Map Rendering**:

   - Client fetches `/api/maps/config` → gets Maps JS API key
   - Key is restricted to your domain only
   - Can only be used for Maps JavaScript API

2. **Data Fetching**:
   - All Places API calls go through server routes
   - Places API key never exposed to browser
   - Server handles all sensitive operations

## Benefits

✅ **Places API key** - Completely hidden from browser
✅ **Maps API key** - Restricted to your domain + Maps JS API only
✅ **No sensitive operations** exposed to client
✅ **Rate limiting** handled server-side

## If Maps Key Gets Exposed

Even if someone steals the Maps API key:

- ❌ Can't use it for Places API (restricted)
- ❌ Can't use it on other domains (HTTP referrer restriction)
- ✅ Can only render maps on your domain
- ✅ Can't access your Places API quota

## Monitoring

Monitor API usage in Google Cloud Console:

- Set up billing alerts
- Check API usage by key
- Review referrer restrictions

## Migration Steps

1. Create two separate API keys in Google Cloud Console
2. Add `GOOGLE_MAPS_API_KEY` to `.env`
3. Remove `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` from `.env`
4. Deploy and test
5. Verify restrictions are working
