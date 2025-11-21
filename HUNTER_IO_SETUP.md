# Hunter.io API Setup Guide

## Overview

Hunter.io is used to enrich Target Institutions with contact information including:

- Email addresses for contacts at companies
- Phone numbers
- Company information and domains
- Email verification
- Social media profiles (LinkedIn, Twitter)

## Setup Instructions

### 1. Sign Up for Hunter.io

1. Go to https://hunter.io/
2. Sign up for a free account
3. Navigate to your dashboard: https://hunter.io/dashboard

### 2. Get Your API Key

1. Go to Settings → API
2. Copy your API key (starts with something like `abc123def456...`)

### 3. Add to Environment Variables

Add the following to your `.env` file:

```bash
HUNTER_IO_API_KEY=your_api_key_here
```

### 4. Restart Your Development Server

After adding the environment variable, restart your Next.js development server:

```bash
npm run dev
```

## Pricing

Hunter.io offers several pricing tiers:

- **Free**: 25 searches/month
- **Starter**: $49/month - 1,000 searches/month
- **Growth**: $149/month - 5,000 searches/month
- **Pro**: $499/month - 50,000 searches/month

For development and testing, the free tier should be sufficient.

## How It Works

### Enrichment Process

1. **Email Finder**: Searches for email addresses based on:

   - Company domain
   - Contact's first name
   - Contact's last name

2. **Domain Search**: Gets company information including:

   - Company website
   - Phone numbers
   - Social media profiles
   - Common email patterns

3. **Email Verification**: Verifies found email addresses to ensure they're deliverable

### API Endpoints Used

- `GET /v2/email-finder` - Find email for a person at a company
- `GET /v2/domain-search` - Get company information
- `GET /v2/email-verifier` - Verify email deliverability

## Usage

### In the Dashboard

1. Navigate to the Target Institutions page (`/dashboard`)
2. Click the **"Enrich All"** button in the top right
3. The system will:
   - Extract domains from institution names
   - Search for contact email addresses
   - Get company information
   - Verify email addresses
   - Display enriched data in the Contact column

### Enriched Data Display

After enrichment, you'll see:

- **Email addresses** (clickable mailto links)
- **Confidence scores** (percentage indicating likelihood of correctness)
- **Phone numbers** (clickable tel links)
- **Social media profiles** (if available)

## Domain Mapping

The system includes a domain mapping for common institutions. To add more:

Edit `/src/app/api/institutions/enrich/route.ts` and add to the `domainMap` object:

```typescript
const domainMap: Record<string, string> = {
  "Naval Base San Diego": "navy.mil",
  Qualcomm: "qualcomm.com",
  "UC San Diego Health": "health.ucsd.edu",
  // Add your institutions here
  "Your Institution Name": "yourdomain.com",
};
```

## Alternative: Google Places API Integration

You can also enhance the domain extraction by using Google Places API to find company websites. This would require:

1. Using Google Places Text Search with institution name
2. Extracting the website from the place details
3. Using that domain for Hunter.io searches

## Rate Limits

Hunter.io has rate limits based on your plan:

- Free: 25 requests/month
- Paid plans: Higher limits

The enrichment API batches requests and handles rate limiting gracefully.

## Error Handling

If enrichment fails, you'll see:

- Error messages in the UI
- Console logs for debugging
- Graceful fallback (institutions remain unchanged)

## Testing

To test the enrichment:

1. Make sure `HUNTER_IO_API_KEY` is set
2. Click "Enrich All" in the dashboard
3. Check the browser console for any errors
4. Verify enriched data appears in the Contact column

## Troubleshooting

### "API key not configured" error

- Make sure `HUNTER_IO_API_KEY` is in your `.env` file
- Restart your development server
- Check that the key doesn't have extra spaces or quotes

### "No contact information found"

- Verify the institution has a domain mapping
- Check that the contact name is in "First Last" format
- Some institutions may not have publicly available contact info

### Rate limit errors

- Check your Hunter.io dashboard for remaining credits
- Upgrade your plan if needed
- Wait for the monthly reset (free tier)

## API Documentation

For more details, see:

- Hunter.io API Docs: https://hunter.io/api-documentation
- Email Finder: https://hunter.io/api-documentation#email-finder
- Domain Search: https://hunter.io/api-documentation#domain-search
- Email Verifier: https://hunter.io/api-documentation#email-verifier
