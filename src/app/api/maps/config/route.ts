import { NextResponse } from "next/server";

/**
 * Returns Google Maps API configuration for client-side map rendering
 *
 * NOTE: This endpoint exposes a Maps API key, but it should be:
 * 1. A separate, restricted key (Maps JavaScript API only)
 * 2. Restricted to your domain in Google Cloud Console
 * 3. NOT used for Places API or other sensitive operations
 */
export async function GET() {
  // Use a separate Maps API key (for rendering only)
  // This should be different from GOOGLE_PLACES_API_KEY
  // and restricted to Maps JavaScript API only
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

  if (!mapsApiKey) {
    return NextResponse.json(
      { error: "Maps API key not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    apiKey: mapsApiKey,
    // You can add other map configuration here if needed
  });
}
