import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      // Return mock data if API key is not configured
      return NextResponse.json({
        results: [
          {
            name: "Sample Restaurant",
            types: ["restaurant", "food"],
            rating: 4.5,
            vicinity: "123 Main St",
          },
          {
            name: "Sample Coffee Shop",
            types: ["cafe", "food"],
            rating: 4.2,
            vicinity: "456 Oak Ave",
          },
          {
            name: "Sample Gym",
            types: ["gym", "health"],
            rating: 4.7,
            vicinity: "789 Pine Rd",
          },
        ],
        message: "Mock data - Add GOOGLE_PLACES_API_KEY to .env for real data",
      });
    }

    // Make multiple searches for diverse business types (same logic as /api/properties)
    const businessTypes = [
      "restaurant",
      "cafe",
      "gym",
      "shopping_mall",
      "store",
      "bank",
      "pharmacy",
      "gas_station",
      "park",
      "school",
      "hospital",
      "beauty_salon",
      "hair_care",
      "spa",
      "movie_theater",
      "bar",
      "night_club",
      "lodging",
      "real_estate_agency",
      "lawyer",
      "dentist",
      "doctor",
      "veterinary_care",
      "car_repair",
      "car_wash",
    ];

    // Search for diverse businesses - get top results from multiple categories
    // Search 15 categories, get top 2 from each = up to 30 diverse businesses
    const searchPromises = businessTypes.slice(0, 15).map(async (type) => {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${type}&key=${apiKey}`;
      try {
        const response = await fetch(placesUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "OK" && data.results) {
            // Return top 2 results from each category for diversity
            return data.results.slice(0, 2);
          }
        }
      } catch (error) {
        console.error(`Error fetching ${type}:`, error);
      }
      return [];
    });

    const allResults = await Promise.all(searchPromises);
    const flattenedResults = allResults.flat();

    // Remove duplicates by place_id
    const uniqueResults = Array.from(
      new Map(
        flattenedResults.map((place: any) => [place.place_id, place])
      ).values()
    );

    // Format the results (same format as before)
    const results = uniqueResults.map((place: any) => ({
      name: place.name,
      types: place.types || [],
      rating: place.rating || null,
      userRatingsTotal: place.user_ratings_total || null,
      vicinity: place.vicinity || place.formatted_address || "",
      placeId: place.place_id || null,
      priceLevel: place.price_level || null,
      businessStatus: place.business_status || null,
      geometry: place.geometry || null,
    }));

    return NextResponse.json({
      results,
      status: uniqueResults.length > 0 ? "OK" : "ZERO_RESULTS",
    });
  } catch (error) {
    console.error("Places API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby businesses" },
      { status: 500 }
    );
  }
}
