import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma"; // Commented out for MVP testing without database
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// AI classification function (placeholder - integrate with OpenAI or similar)
async function classifyProperty(
  propertyName: string,
  address: string,
  websiteUrl: string,
  amenities: string[]
): Promise<{
  propertyTier: "LUXURY" | "MID" | "AFFORDABLE";
  residentPersona: "STUDENTS" | "FAMILIES" | "PROFESSIONALS" | "MIXED";
  profileSummary: string;
}> {
  // This is a placeholder implementation
  // In production, you would call OpenAI API or similar AI service

  const amenitiesText = amenities.join(", ").toLowerCase();
  const propertyText =
    `${propertyName} ${address} ${websiteUrl} ${amenitiesText}`.toLowerCase();

  // Simple rule-based classification (replace with AI in production)
  let propertyTier: "LUXURY" | "MID" | "AFFORDABLE" = "MID";
  let residentPersona: "STUDENTS" | "FAMILIES" | "PROFESSIONALS" | "MIXED" =
    "MIXED";

  // Tier classification based on keywords
  const luxuryKeywords = [
    "luxury",
    "premium",
    "elite",
    "resort",
    "spa",
    "concierge",
    "penthouse",
  ];
  const affordableKeywords = [
    "affordable",
    "budget",
    "economy",
    "student",
    "low-income",
  ];

  if (luxuryKeywords.some((keyword) => propertyText.includes(keyword))) {
    propertyTier = "LUXURY";
  } else if (
    affordableKeywords.some((keyword) => propertyText.includes(keyword))
  ) {
    propertyTier = "AFFORDABLE";
  }

  // Persona classification
  const studentKeywords = [
    "student",
    "university",
    "college",
    "campus",
    "dorm",
  ];
  const familyKeywords = ["family", "children", "playground", "school", "park"];
  const professionalKeywords = [
    "business",
    "downtown",
    "corporate",
    "executive",
    "professional",
  ];

  if (studentKeywords.some((keyword) => propertyText.includes(keyword))) {
    residentPersona = "STUDENTS";
  } else if (familyKeywords.some((keyword) => propertyText.includes(keyword))) {
    residentPersona = "FAMILIES";
  } else if (
    professionalKeywords.some((keyword) => propertyText.includes(keyword))
  ) {
    residentPersona = "PROFESSIONALS";
  }

  // Generate profile summary
  const profileSummary =
    `${propertyName} is a ${propertyTier.toLowerCase()} property located at ${address}. ` +
    `Ideal for ${residentPersona.toLowerCase()} residents. ` +
    (amenities.length > 0 ? `Features include: ${amenities.join(", ")}.` : "");

  // TODO: Replace with actual AI call
  // Example with OpenAI:
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4",
  //   messages: [{
  //     role: "system",
  //     content: "You are a property classification expert..."
  //   }, {
  //     role: "user",
  //     content: `Classify this property: ${propertyName} at ${address}...`
  //   }]
  // });

  return { propertyTier, residentPersona, profileSummary };
}

export async function POST(request: NextRequest) {
  console.log("🚀 [Properties API] POST request received");
  try {
    const formData = await request.formData();

    const propertyName = formData.get("propertyName") as string;
    const propertyAddress = formData.get("propertyAddress") as string;
    const websiteUrl = formData.get("websiteUrl") as string;
    const latitude = formData.get("latitude")
      ? parseFloat(formData.get("latitude") as string)
      : null;
    const longitude = formData.get("longitude")
      ? parseFloat(formData.get("longitude") as string)
      : null;
    const amenitiesJson = formData.get("amenities") as string;
    const amenities = amenitiesJson ? JSON.parse(amenitiesJson) : [];
    const unitMixFile = formData.get("unitMixFile") as File | null;

    console.log("📝 [Properties API] Form data received:", {
      propertyName,
      propertyAddress,
      websiteUrl,
      latitude,
      longitude,
      amenitiesCount: amenities.length,
      hasFile: !!unitMixFile,
    });

    if (!propertyName || !propertyAddress) {
      console.error("❌ [Properties API] Missing required fields");
      return NextResponse.json(
        { error: "Property name and address are required" },
        { status: 400 }
      );
    }

    // Handle file upload
    let unitMixFileUrl: string | null = null;
    if (unitMixFile) {
      const bytes = await unitMixFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${unitMixFile.name}`;
      const filepath = join(uploadsDir, filename);

      await writeFile(filepath, buffer);
      unitMixFileUrl = `/uploads/${filename}`;
    }

    // AI Classification
    console.log("🤖 [Properties API] Starting AI classification...");
    const aiResults = await classifyProperty(
      propertyName,
      propertyAddress,
      websiteUrl || "",
      amenities
    );
    console.log("🤖 [Properties API] AI classification results:", {
      propertyTier: aiResults.propertyTier,
      residentPersona: aiResults.residentPersona,
      profileSummaryLength: aiResults.profileSummary.length,
    });

    // MVP Testing Mode: Skip database save, just return success
    // TODO: Uncomment below when database is set up
    /*
    const property = await prisma.property.create({
      data: {
        name: propertyName,
        address: propertyAddress,
        latitude,
        longitude,
        websiteUrl: websiteUrl || null,
        unitMixFileUrl,
        amenities,
        propertyTier: aiResults.propertyTier,
        residentPersona: aiResults.residentPersona,
        profileSummary: aiResults.profileSummary,
      },
    });
    */

    // Get nearby businesses using Google Places API (if coordinates available)
    let nearbyBusinesses: any[] = [];
    console.log("🔍 [Places API] Starting nearby businesses fetch...");
    console.log("📍 [Places API] Coordinates:", { latitude, longitude });

    if (latitude && longitude) {
      try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        console.log("🔑 [Places API] API Key present:", !!apiKey);
        console.log("🔑 [Places API] API Key length:", apiKey?.length || 0);

        if (apiKey) {
          // Make multiple searches for diverse business types
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
          const searchPromises = businessTypes
            .slice(0, 15)
            .map(async (type) => {
              const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=${type}&key=${apiKey}`;
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

          console.log(
            "🌐 [Places API] Making multiple searches for diverse results..."
          );

          const allResults = await Promise.all(searchPromises);
          const flattenedResults = allResults.flat();

          // Remove duplicates by place_id
          const uniqueResults = Array.from(
            new Map(
              flattenedResults.map((place: any) => [place.place_id, place])
            ).values()
          );

          console.log(
            `🌐 [Places API] Found ${uniqueResults.length} unique businesses from ${businessTypes.length} categories`
          );

          // Use the unique results
          const placesData = { status: "OK", results: uniqueResults };
          console.log("📦 [Places API] Response status:", placesData.status);
          console.log(
            "📦 [Places API] Results count:",
            placesData.results?.length || 0
          );

          if (
            placesData.status === "OK" ||
            placesData.status === "ZERO_RESULTS"
          ) {
            nearbyBusinesses = (placesData.results || []).map((place: any) => ({
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
            console.log(
              "✅ [Places API] Successfully processed",
              nearbyBusinesses.length,
              "businesses"
            );
          } else {
            console.error(
              "❌ [Places API] API returned error status:",
              placesData.status
            );
            console.error(
              "❌ [Places API] Error message:",
              (placesData as any).error_message || "No error message"
            );

            // Provide helpful debugging info for REQUEST_DENIED
            if (placesData.status === "REQUEST_DENIED") {
              console.error("🔧 [Places API] Troubleshooting REQUEST_DENIED:");
              console.error(
                "   1. ✅ Check if Places API is enabled in Google Cloud Console"
              );
              console.error("   2. ✅ Verify API key restrictions:");
              console.error(
                "      - If using 'Websites' restriction, it WON'T work for server-side calls"
              );
              console.error(
                "      - Use 'API restrictions' → Select 'Places API' only"
              );
              console.error("      - OR use 'Don't restrict' for testing");
              console.error(
                "   3. ✅ Ensure billing is enabled on your Google Cloud project"
              );
              console.error(
                "   4. ✅ Double-check the API key in .env matches Google Cloud Console"
              );
              console.error(
                "   5. ✅ Wait a few minutes after enabling API - it can take time to propagate"
              );
            }
          }
        } else {
          console.log("⚠️ [Places API] No API key found, using mock data");
          // Return mock data if API key is not configured
          nearbyBusinesses = [
            {
              name: "Sample Restaurant",
              types: ["restaurant"],
              rating: 4.5,
              vicinity: "123 Main St",
            },
            {
              name: "Sample Coffee Shop",
              types: ["cafe"],
              rating: 4.2,
              vicinity: "456 Oak Ave",
            },
            {
              name: "Sample Gym",
              types: ["gym"],
              rating: 4.7,
              vicinity: "789 Pine Rd",
            },
          ];
        }
      } catch (error) {
        console.error("❌ [Places API] Exception caught:", error);
        console.error(
          "❌ [Places API] Error details:",
          error instanceof Error ? error.message : String(error)
        );
        // Continue without nearby businesses if API fails
      }
    } else {
      console.log(
        "⚠️ [Places API] No coordinates provided, skipping nearby businesses fetch"
      );
    }

    console.log(
      "📊 [Places API] Final nearby businesses count:",
      nearbyBusinesses.length
    );

    // Return success response without saving to database (for MVP testing)
    const responseData = {
      success: true,
      property: {
        id: `demo-${Date.now()}`, // Mock ID for testing
        name: propertyName,
        address: propertyAddress,
        latitude,
        longitude,
        websiteUrl: websiteUrl || null,
        unitMixFileUrl,
        propertyTier: aiResults.propertyTier,
        residentPersona: aiResults.residentPersona,
        profileSummary: aiResults.profileSummary,
        nearbyBusinesses: nearbyBusinesses, // Show all nearby businesses
      },
      message:
        "Property processed successfully (demo mode - not saved to database)",
    };

    console.log("✅ [Properties API] Success! Returning response:", {
      propertyId: responseData.property.id,
      nearbyBusinessesCount: responseData.property.nearbyBusinesses.length,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ [Properties API] Error:", error);
    console.error("❌ [Properties API] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
