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

    // Call Google Places API Nearby Search
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=establishment&key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Google Places API request failed");
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    // Format the results
    const results = (data.results || []).map((place: any) => ({
      name: place.name,
      types: place.types || [],
      rating: place.rating || null,
      vicinity: place.vicinity || place.formatted_address || "",
      placeId: place.place_id,
      geometry: place.geometry,
    }));

    return NextResponse.json({
      results,
      status: data.status,
    });
  } catch (error) {
    console.error("Places API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby businesses" },
      { status: 500 }
    );
  }
}
