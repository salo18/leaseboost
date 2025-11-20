# Event APIs Summary

## Current Implementation Priority

The events API tries multiple sources in this order:

1. **Apify Meetup Scraper** (if API token provided) - ✅ IMPLEMENTED
2. **Meetup API** (if API key provided)
3. **Facebook Events API** (if access token provided)
4. **Google Places API** (fallback - finds venues, not specific events)

---

## Available Event APIs

### ✅ **Apify Event Scrapers** (IMPLEMENTED)

- **Status**: ✅ Implemented
- **Cost**: Pay-per-use (~$0.50 per 1,000 results), free tier available
- **Pros**:
  - Scrapes **REAL events** from Meetup.com, Eventbrite, Facebook
  - No subscription required (pay per use)
  - Great for community events via Meetup scraper
  - Multiple scrapers available
- **Cons**:
  - Requires reverse geocoding (lat/lng → city name)
  - Scrapers run asynchronously (may take a few seconds)
  - Pay-per-use pricing
- **Setup**:
  1. Sign up at https://apify.com
  2. Get API token from https://console.apify.com/account/integrations
  3. Add to `.env`: `APIFY_API_TOKEN=your_token_here`
- **Available Scrapers**:
  - `filip_cicvarek/meetup-scraper` - ✅ Currently used (best for community events)
  - `aitorsm/eventbrite` - Eventbrite events
  - `pratikdani/facebook-event-scraper` - Facebook events
- **⚠️ NOTE**: The "local-event-scraper" generates **fictional events** - don't use it!
- **Documentation**: https://apify.com/store

---

### ✅ **Meetup API** (IMPLEMENTED)

- **Status**: ✅ Implemented
- **Cost**: Requires **Meetup Pro subscription** (~$10-15/month)
- **Pros**:
  - Great for community events, meetups, local gatherings
  - GraphQL API with good documentation
  - Returns actual events with dates/times
  - Good for farmers markets, community events
- **Cons**:
  - Requires paid Pro subscription
  - Need to create OAuth consumer
- **Setup**: Add `MEETUP_API_KEY` to `.env`
- **Documentation**: https://www.meetup.com/api/

---

### ⚠️ **Facebook Events API** (IMPLEMENTED but restricted)

- **Status**: ⚠️ Implemented but requires app review
- **Cost**: Free (but requires Facebook App approval)
- **Pros**:
  - Free if approved
  - Large event database
  - Returns events with dates/times
- **Cons**:
  - Requires Facebook App review/approval
  - Most apps get error: "Application does not have the capability"
  - Complex setup process
- **Setup**: Add `FACEBOOK_ACCESS_TOKEN` to `.env`
- **Note**: Currently falls back to Google Places due to restrictions

---

### ✅ **Google Places API** (IMPLEMENTED - Fallback)

- **Status**: ✅ Working as fallback
- **Cost**: Free tier available, then pay-per-use
- **Pros**:
  - Already configured in your project
  - Finds venues/places where events happen
  - Good coverage
- **Cons**:
  - Returns **venues**, not specific events with dates
  - No event schedules
- **Setup**: Already configured with `GOOGLE_PLACES_API_KEY`

---

## Other Event APIs (Not Implemented)

### 💰 **LocalEventsAPI**

- **Cost**: Paid service
- **Pros**: Real-time events, covers 100+ cities, 9,000+ events
- **Cons**: Requires payment
- **Website**: https://www.localeventsapi.com/

### 🎵 **JamBase API**

- **Cost**: Free (public API)
- **Pros**: Free, public API
- **Cons**: Focused on **music/concerts only** (not community events)
- **Website**: https://www.jambase.com/

### ❌ **Eventful API**

- **Status**: Defunct/Deprecated (as of Feb 2021)
- **Note**: No longer available

### 🔓 **Mobilizon**

- **Status**: Open source platform
- **Pros**: Free, open source
- **Cons**: Limited API documentation, smaller user base
- **Website**: https://joinmobilizon.org/

---

## Recommendations

### For Free Solution:

1. **Google Places API** (current fallback) - Finds venues where events happen
2. **JamBase API** - If you want music/concert events (free but limited scope)

### For Paid Solution:

1. **Apify Scrapers** - Pay-per-use, scrapes real events (~$0.50/1k results) ✅ RECOMMENDED
2. **Meetup API** - Best for community events (~$10-15/month)
3. **LocalEventsAPI** - Comprehensive events database (pricing varies)

### Current Best Approach:

Since you're looking for **farmers markets and community events** that building managers can partner with:

1. **Meetup API** is the best fit if you can get a Pro subscription
2. **Google Places** works well as a free fallback to find venues
3. Consider combining multiple sources for better coverage

---

## Setup Instructions

### Apify Setup (RECOMMENDED):

1. Sign up for free account: https://apify.com
2. Get API token: https://console.apify.com/account/integrations
3. Add to `.env`: `APIFY_API_TOKEN=your_token_here`
4. The API will automatically use Meetup scraper for community events
5. **Note**: First run may take 10-30 seconds as scraper runs

### Meetup API Setup:

1. Sign up for Meetup Pro: https://www.meetup.com/pro/
2. Create OAuth consumer: https://secure.meetup.com/meetup_api/oauth_consumers/
3. Get your API key
4. Add to `.env`: `MEETUP_API_KEY=your_key_here`

### Facebook API Setup:

1. Create Facebook App: https://developers.facebook.com/apps/
2. Request app review for events permission
3. Get access token
4. Add to `.env`: `FACEBOOK_ACCESS_TOKEN=your_token_here`

---

## Testing

The API will automatically try sources in order:

1. Meetup (if configured)
2. Facebook (if configured)
3. Google Places (always available)

Check console logs to see which API is being used and what results are returned.
