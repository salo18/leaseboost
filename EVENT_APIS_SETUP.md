# Event APIs Setup Guide

## Implemented APIs

### ✅ **USDA Farmers Market Directory API** (FREE - No API Key Required)

- **Status**: ✅ Implemented
- **Cost**: **FREE** - No API key needed
- **Pros**:
  - Official USDA data
  - Perfect for farmers markets
  - No authentication required
  - Reliable government data source
- **Cons**:
  - Only covers farmers markets (not other events)
  - May not have all market schedules
- **Setup**: No setup required - works automatically!
- **API Endpoint**: `https://search.ams.usda.gov/farmersmarkets/v1/data.svc/locSearch`
- **Documentation**: https://www.ams.usda.gov/local-food-directories/farmersmarkets

---

### ✅ **PredictHQ Events API** (IMPLEMENTED)

- **Status**: ✅ Implemented
- **Cost**: 14-day free trial, then paid plans
- **Pros**:
  - Comprehensive event database
  - Verified and enriched event data
  - Includes concerts, festivals, conferences, sports, etc.
  - Impact ranking and predicted attendance
  - Good API documentation
- **Cons**:
  - Requires paid subscription after trial
  - May need filtering for community events
- **Setup**:
  1. Sign up: https://www.predicthq.com/
  2. Get API token: https://docs.predicthq.com/getting-started/api-quickstart
  3. Add to `.env`: `PREDICTHQ_ACCESS_TOKEN=your_token_here`
- **Documentation**: https://docs.predicthq.com/api

---

## Current API Priority Order

The events API tries sources in this order:

1. **USDA Farmers Market Directory** (always tried first - free)
2. **PredictHQ** (if token provided - combines with USDA results)
3. **Apify Meetup Scraper** (if token provided)
4. **Meetup API** (if Pro subscription)
5. **Facebook Events API** (if approved)
6. **Google Places API** (fallback - finds venues)

---

## Environment Variables

Add to your `.env` file:

```bash
# PredictHQ (optional - for general events)
PREDICTHQ_ACCESS_TOKEN=your_predicthq_token_here

# USDA Farmers Market Directory - NO API KEY NEEDED! ✅
# Works automatically

# Other optional APIs
APIFY_API_TOKEN=your_apify_token_here
MEETUP_API_KEY=your_meetup_key_here
FACEBOOK_ACCESS_TOKEN=your_facebook_token_here
```

---

## How It Works

### USDA Farmers Market Directory

- Automatically searches for farmers markets near the property
- Filters by distance (within specified radius)
- Returns market name, address, location
- No API key required - works immediately!

### PredictHQ

- Searches for general events (concerts, festivals, conferences, etc.)
- Filters for community-focused events
- Combines with USDA results for comprehensive event list
- Requires API token (14-day free trial available)

---

## Testing

1. **USDA (No Setup)**:

   - Just search for a property address
   - Farmers markets will automatically appear if available

2. **PredictHQ**:
   - Sign up for free trial: https://www.predicthq.com/
   - Get your access token
   - Add to `.env`
   - Restart your dev server
   - Search for a property - you'll see both farmers markets and general events

---

## API Response Format

Both APIs return events in a consistent format:

```typescript
{
  id: string;
  name: string;
  description: string;
  start: string | null;
  end: string | null;
  url: string | null;
  venue: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  online_event: boolean;
  is_free: boolean | null;
  has_available_tickets: boolean | null;
  logo: string | null;
  rating: number | null;
  types: string[];
}
```

---

## Benefits

✅ **USDA**: Free, reliable farmers market data
✅ **PredictHQ**: Comprehensive event coverage
✅ **Combined**: Best of both worlds - farmers markets + general events
✅ **Automatic**: USDA works without any setup
✅ **Filtered**: Results filtered for community-relevant events

---

## Next Steps

1. **Test USDA** (works immediately - no setup)
2. **Sign up for PredictHQ** (optional - for more event types)
3. **Add PredictHQ token** to `.env` if you want general events
4. **Search for properties** and see events appear automatically!
