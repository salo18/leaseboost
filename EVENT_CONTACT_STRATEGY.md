# Event Contact Information Strategy

## Problem

PredictHQ API doesn't provide reliable event URLs or direct contact information for event organizers. We need a scalable solution to help users find contact information.

## Solution: Multi-Layer Enrichment Approach

### Layer 1: PredictHQ (Discovery)

- **Use for**: Finding events, dates, locations, categories
- **Provides**: Event titles, venues, organizations, dates, attendance predictions
- **Limitation**: No direct event URLs or contact info

### Layer 2: Venue/Organization Enrichment (Primary Contact Source)

- **Use Google Places API** to get venue contact information:
  - Phone numbers
  - Website URLs
  - Email addresses (if available)
  - Business hours
- **Use venue name + address** from PredictHQ to look up in Google Places
- **Cache results** to avoid repeated API calls

### Layer 3: Event-Specific APIs (For Events with URLs)

- **Eventbrite API**: Provides event URLs and organizer contact info
- **Ticketmaster API**: Provides event URLs and venue contact info
- **Meetup API**: Provides event URLs and organizer contact info
- **Note**: These require API keys and may have rate limits

### Layer 4: Web Scraping (Fallback)

- **Use Apify or similar service** to scrape event pages when URLs are found
- **Extract**: Contact forms, email addresses, phone numbers
- **Use responsibly**: Respect robots.txt, rate limits, ToS

### Layer 5: Google Search + AI Extraction (Last Resort)

- **Use Google Custom Search API** to find event pages
- **Use AI/LLM** to extract contact information from pages
- **Store results** for future use

## Implementation Priority

### Phase 1: Venue-Based Contact (Easiest, Most Reliable)

1. Extract venue name and address from PredictHQ events
2. Use Google Places API to get venue contact info
3. Display venue contact as primary contact method
4. Cache venue data to reduce API calls

### Phase 2: Entity URL Enrichment

1. Extract organization/venue URLs from PredictHQ entities
2. Use these URLs to find contact pages
3. Scrape or use structured data to extract contact info

### Phase 3: Multi-API Integration

1. Integrate Eventbrite API for events that match
2. Integrate Ticketmaster API for concerts/sports
3. Use these APIs' contact data when available

### Phase 4: Smart Search & Extraction

1. Use Google Search API to find event pages
2. Use AI to extract contact information
3. Store in database for future reference

## Recommended Approach for MVP

**Start with Venue-Based Contact**:

- Most events happen at venues
- Venues have reliable contact information
- Google Places API is already integrated
- High success rate for contact info

**Implementation Steps**:

1. When processing PredictHQ events, extract venue information
2. Use venue name + address to search Google Places API
3. Get venue phone, website, email (if available)
4. Display as "Venue Contact" or "Event Contact"
5. Add note: "Contact the venue for event-specific inquiries"

## Database Schema Suggestion

```typescript
interface VenueContact {
  venueName: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  googlePlaceId?: string;
  lastUpdated: Date;
}

interface EventContact {
  eventId: string;
  venueContact?: VenueContact;
  organizerContact?: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  source:
    | "google_places"
    | "eventbrite"
    | "ticketmaster"
    | "scraped"
    | "manual";
  lastUpdated: Date;
}
```

## Cost Considerations

- **Google Places API**: ~$0.017 per request (very affordable)
- **Eventbrite API**: Free tier available, then paid
- **Ticketmaster API**: Requires partnership
- **Web Scraping**: Apify has free tier, then usage-based
- **Google Custom Search**: Free tier: 100 queries/day

## Recommendation

**For MVP, use Venue-Based Contact via Google Places API**:

- ✅ Already have Google Places API integrated
- ✅ High success rate (most events have venues)
- ✅ Reliable and scalable
- ✅ Low cost
- ✅ Fast implementation

Then gradually add other layers as needed.
