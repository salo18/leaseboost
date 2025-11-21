import { NextRequest, NextResponse } from "next/server";

/**
 * Enriches events with venue contact information using Google Places API
 * This solves the problem of PredictHQ not providing event URLs or contact info
 *
 * Strategy: Use venue name + address to look up contact info via Google Places
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events array is required" },
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

    // Enrich each event with venue contact information
    const enrichedEvents = await Promise.all(
      events.map(async (event: any) => {
        // Skip if no venue information
        if (!event.venue || !event.venue.name || !event.venue.address) {
          return {
            ...event,
            venueContact: null,
          };
        }

        try {
          // Search for venue using Google Places Text Search
          const searchQuery = `${event.venue.name} ${event.venue.address}`;
          const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            searchQuery
          )}&key=${apiKey}`;

          const searchResponse = await fetch(searchUrl);
          const searchData = await searchResponse.json();

          if (
            searchData.status === "OK" &&
            searchData.results &&
            searchData.results.length > 0
          ) {
            const place = searchData.results[0];
            const placeId = place.place_id;

            // Get detailed place information including contact details
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,international_phone_number,opening_hours,formatted_address&key=${apiKey}`;

            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            if (detailsData.status === "OK" && detailsData.result) {
              const venueContact = {
                name: detailsData.result.name || event.venue.name,
                phone:
                  detailsData.result.formatted_phone_number ||
                  detailsData.result.international_phone_number ||
                  null,
                website: detailsData.result.website || null,
                address:
                  detailsData.result.formatted_address || event.venue.address,
                openingHours:
                  detailsData.result.opening_hours?.weekday_text || null,
                googlePlaceId: placeId,
              };

              return {
                ...event,
                venueContact,
              };
            }
          }

          // If venue not found, return event without contact info
          return {
            ...event,
            venueContact: null,
          };
        } catch (error) {
          console.error(
            `Error enriching event ${event.id} with venue contact:`,
            error
          );
          return {
            ...event,
            venueContact: null,
          };
        }
      })
    );

    return NextResponse.json({
      events: enrichedEvents,
      enriched: enrichedEvents.filter((e) => e.venueContact !== null).length,
      total: enrichedEvents.length,
    });
  } catch (error) {
    console.error("Error enriching events:", error);
    return NextResponse.json(
      { error: "Failed to enrich events" },
      { status: 500 }
    );
  }
}
