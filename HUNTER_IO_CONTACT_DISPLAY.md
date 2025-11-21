# Hunter.io Contact Enrichment Display

## Summary

**Hunter.io is implemented for INSTITUTIONS** (not events). Events use Google Places API.

## What Hunter.io Returns

Hunter.io enriches institutions with the following contact information:

```typescript
interface EnrichedContact {
  email: string | null; // Person's email address
  phone: string | null; // Company phone number
  linkedin: string | null; // Company LinkedIn profile
  twitter: string | null; // Company Twitter profile
  confidence: number | null; // Email confidence score (0-100)
  sources: number | null; // Number of sources found
}
```

## How Contact Info Was Displayed

The enriched contact information was displayed in the Contact column with:

1. **Contact Name** (e.g., "Commander James Riley")

   - Displayed as a blue link
   - Shows a "✓ Enriched" badge if contact info exists

2. **Enriched Contact Details** (shown below the name with a green left border):
   - **Email**: Clickable mailto link with confidence score
     - Format: `email@domain.com (85% confidence • 3 sources)`
   - **Phone**: Clickable tel link
   - **LinkedIn**: External link with LinkedIn icon
   - **Twitter**: External link with Twitter icon

### Visual Example:

```
Contact Column:
┌─────────────────────────────────────┐
│ Commander James Riley  [✓ Enriched]│
│ │                                    │
│ │ 📧 james.riley@navy.mil           │
│ │    85% confidence • 3 sources     │
│ │                                    │
│ │ 📞 (619) 555-1234                 │
│ │                                    │
│ │ 🔗 LinkedIn  🔗 Twitter            │
└─────────────────────────────────────┘
```

## Using Hunter.io with Addresses

**Hunter.io doesn't work directly with addresses.** Here's how to enrich from an address:

### Step-by-Step Process:

1. **Use Google Places API** to get business info from address:

   ```typescript
   // Search for business by address
   const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${address}&key=${apiKey}`;
   ```

2. **Extract domain/website** from Google Places result:

   ```typescript
   const website = placeDetails.result.website; // e.g., "https://qualcomm.com"
   const domain = extractDomain(website); // e.g., "qualcomm.com"
   ```

3. **Use Hunter.io** to enrich contact info:

   ```typescript
   // Find person's email at the company
   const emailUrl = `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${apiKey}`;

   // Get company info
   const domainUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;
   ```

### Example Implementation:

```typescript
async function enrichFromAddress(address: string, contactName: string) {
  // Step 1: Get business info from Google Places
  const place = await getPlaceFromAddress(address);
  const domain = extractDomainFromWebsite(place.website);

  // Step 2: Use Hunter.io with the domain
  const enrichedContact = await enrichWithHunterIO(domain, contactName);

  return enrichedContact;
}
```

## Current Implementation

- **Institutions**: `/api/institutions/enrich` - Uses Hunter.io
- **Events**: `/api/events/enrich` - Uses Google Places API

## Adding Address-to-Contact Enrichment

To add address-based enrichment, you would:

1. Create a new API endpoint: `/api/places/enrich-from-address`
2. Combine Google Places + Hunter.io:
   - Google Places: Get business info from address
   - Extract domain from business website
   - Hunter.io: Enrich contact info using domain

Would you like me to implement this address-based enrichment feature?
