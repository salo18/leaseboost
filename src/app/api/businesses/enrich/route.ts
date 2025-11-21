import { NextRequest, NextResponse } from "next/server";

interface BusinessContact {
  phone: string | null;
  website: string | null;
  address: string | null;
  openingHours: string[] | null;
  googlePlaceId: string | null;
}

interface Business {
  placeId: string | null;
  enrichedContact?: BusinessContact | null;
}

/**
 * Enriches businesses with contact information using Google Places API
 * Gets phone, website, address, and opening hours for each business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businesses } = body;

    if (!businesses || !Array.isArray(businesses)) {
      return NextResponse.json(
        { error: "Businesses array is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    // Enrich each business with contact information
    const enrichedBusinesses = await Promise.all(
      businesses.map(async (business: Business) => {
        // Skip if no placeId
        if (!business.placeId) {
          return {
            ...business,
            enrichedContact: null,
          };
        }

        try {
          // Get detailed place information including contact details
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${business.placeId}&fields=name,formatted_phone_number,website,international_phone_number,opening_hours,formatted_address,address_components&key=${apiKey}`;

          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();

          if (detailsData.status === "OK" && detailsData.result) {
            const enrichedContact: BusinessContact = {
              phone:
                detailsData.result.formatted_phone_number ||
                detailsData.result.international_phone_number ||
                null,
              website: detailsData.result.website || null,
              address: detailsData.result.formatted_address || null,
              openingHours:
                detailsData.result.opening_hours?.weekday_text || null,
              googlePlaceId: business.placeId,
            };

            return {
              ...business,
              enrichedContact,
            };
          }

          // If place not found, return business without contact info
          return {
            ...business,
            enrichedContact: null,
          };
        } catch (error) {
          console.error(
            `Error enriching business ${business.placeId} with contact:`,
            error
          );
          return {
            ...business,
            enrichedContact: null,
          };
        }
      })
    );

    return NextResponse.json({
      businesses: enrichedBusinesses,
      enriched: enrichedBusinesses.filter((b) => b.enrichedContact !== null)
        .length,
      total: enrichedBusinesses.length,
    });
  } catch (error) {
    console.error("Error enriching businesses:", error);
    return NextResponse.json(
      { error: "Failed to enrich businesses" },
      { status: 500 }
    );
  }
}
