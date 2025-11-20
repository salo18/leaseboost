import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius") || "10"; // Default 10 miles

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Convert radius from miles to meters (most APIs use meters)
    const radiusMeters = Math.round(parseFloat(radius) * 1609);

    // Try Apify scrapers (if API token provided)
    // NOTE: The "local-event-scraper" generates fictional events - use real scrapers instead:
    // - filip_cicvarek/meetup-scraper (scrapes real Meetup events) - BEST for community events
    // - aitorsm/eventbrite (scrapes real Eventbrite events)
    // - pratikdani/facebook-event-scraper (scrapes real Facebook events)
    const apifyApiToken = process.env.APIFY_API_TOKEN;

    if (apifyApiToken) {
      try {
        console.log(`🔍 [Events API] Trying Apify Meetup Scraper...`);

        // Reverse geocode to get city name from coordinates
        const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (googleApiKey) {
          const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`;
          const geoResponse = await fetch(reverseGeocodeUrl);
          const geoData = await geoResponse.json();

          if (geoData.results && geoData.results.length > 0) {
            // Extract city name from geocoding result
            const addressComponents = geoData.results[0].address_components;
            const cityComponent = addressComponents.find((comp: any) =>
              comp.types.includes("locality")
            );
            const stateComponent = addressComponents.find((comp: any) =>
              comp.types.includes("administrative_area_level_1")
            );

            const cityName = cityComponent?.long_name || "";
            const stateCode = stateComponent?.short_name || "";
            const locationQuery = stateCode
              ? `${cityName}, ${stateCode}`
              : cityName;

            if (cityName) {
              console.log(
                `📍 [Events API] Reverse geocoded to: ${locationQuery}`
              );

              // Run Apify Meetup Scraper
              // Actor: filip_cicvarek/meetup-scraper
              const runActorUrl = `https://api.apify.com/v2/acts/filip_cicvarek~meetup-scraper/runs`;

              const runResponse = await fetch(runActorUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apifyApiToken}`,
                },
                body: JSON.stringify({
                  startUrls: [
                    {
                      url: `https://www.meetup.com/find/events/?allMeetups=false&radius=${
                        radiusMeters / 1000
                      }&userFreeform=${encodeURIComponent(
                        locationQuery
                      )}&eventType=upcoming`,
                    },
                  ],
                  maxEvents: 50,
                }),
              });

              if (runResponse.ok) {
                const runData = await runResponse.json();
                const runId = runData.data.id;

                console.log(
                  `⏳ [Events API] Apify run started: ${runId}, waiting for completion...`
                );

                // Wait for run to complete (with timeout)
                let completed = false;
                let attempts = 0;
                const maxAttempts = 30; // 30 seconds max wait

                while (!completed && attempts < maxAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

                  const statusResponse = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${apifyApiToken}`,
                      },
                    }
                  );

                  const statusData = await statusResponse.json();

                  if (statusData.data.status === "SUCCEEDED") {
                    completed = true;

                    // Get dataset items
                    const datasetResponse = await fetch(
                      `https://api.apify.com/v2/datasets/${statusData.data.defaultDatasetId}/items`,
                      {
                        headers: {
                          Authorization: `Bearer ${apifyApiToken}`,
                        },
                      }
                    );

                    const eventsData = await datasetResponse.json();

                    if (Array.isArray(eventsData) && eventsData.length > 0) {
                      console.log(
                        `✅ [Events API] Apify returned ${eventsData.length} events`
                      );

                      // Filter and format events
                      const formattedEvents = eventsData
                        .filter((event: any) => {
                          // Filter for community events
                          const name = (event.name || "").toLowerCase();
                          const desc = (event.description || "").toLowerCase();
                          return (
                            name.includes("market") ||
                            name.includes("farmers") ||
                            name.includes("community") ||
                            name.includes("festival") ||
                            name.includes("fair") ||
                            name.includes("local") ||
                            desc.includes("market") ||
                            desc.includes("community")
                          );
                        })
                        .map((event: any) => ({
                          id: event.id || event.url || `apify-${Math.random()}`,
                          name: event.name || event.title || "",
                          description: event.description || "",
                          start: event.dateTime || event.startTime || null,
                          end: event.endTime || null,
                          url: event.url || event.eventUrl || null,
                          venue: event.venue
                            ? {
                                name: event.venue.name || "",
                                address:
                                  event.venue.address || event.location || "",
                                latitude:
                                  event.venue.lat || event.latitude || lat,
                                longitude:
                                  event.venue.lon || event.longitude || lng,
                              }
                            : null,
                          online_event: event.isOnline || false,
                          is_free: null,
                          has_available_tickets: null,
                          logo: event.image || null,
                          rating: null,
                          types: [],
                          attendees: event.going || 0,
                        }))
                        .slice(0, 20);

                      if (formattedEvents.length > 0) {
                        return NextResponse.json({
                          events: formattedEvents,
                          source: "apify_meetup",
                        });
                      }
                    }
                  } else if (statusData.data.status === "FAILED") {
                    console.log(`❌ [Events API] Apify run failed`);
                    break;
                  }

                  attempts++;
                }

                if (!completed) {
                  console.log(`⏱️ [Events API] Apify run timed out`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ [Events API] Apify API error:`, error);
      }
    }

    // Try Meetup API (requires Meetup Pro subscription)
    // Meetup API is great for community events, meetups, and local gatherings
    const meetupApiKey = process.env.MEETUP_API_KEY;

    if (meetupApiKey) {
      try {
        console.log(`🔍 [Events API] Trying Meetup API...`);

        // Meetup GraphQL API endpoint
        // Note: Requires Meetup Pro subscription to get API key
        const meetupUrl = `https://api.meetup.com/gql`;

        // GraphQL query to search for events near location
        const graphqlQuery = {
          query: `
            query FindEvents($lat: Float!, $lon: Float!, $radius: Float!) {
              keywordSearch(
                input: {
                  keyword: "community OR farmers market OR local event OR festival"
                  lat: $lat
                  lon: $lon
                  radius: $radius
                  source: EVENTS
                }
              ) {
                ... on KeywordSearchEventsConnection {
                  count
                  edges {
                    node {
                      id
                      title
                      description
                      dateTime
                      endTime
                      eventUrl
                      venue {
                        name
                        address
                        city
                        lat
                        lon
                      }
                      group {
                        name
                      }
                      going
                      isOnline
                    }
                  }
                }
              }
            }
          `,
          variables: {
            lat: parseFloat(lat),
            lon: parseFloat(lng),
            radius: radiusMeters / 1000, // Convert to km
          },
        };

        const meetupResponse = await fetch(meetupUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${meetupApiKey}`,
          },
          body: JSON.stringify(graphqlQuery),
        });

        const meetupData = await meetupResponse.json();

        if (meetupResponse.ok && meetupData.data?.keywordSearch?.edges) {
          const events = meetupData.data.keywordSearch.edges
            .map((edge: any) => {
              const event = edge.node;
              return {
                id: event.id,
                name: event.title,
                description: event.description || "",
                start: event.dateTime || null,
                end: event.endTime || null,
                url: event.eventUrl || null,
                venue: event.venue
                  ? {
                      name: event.venue.name || "",
                      address: event.venue.address
                        ? `${event.venue.address}, ${
                            event.venue.city || ""
                          }`.trim()
                        : event.venue.city || "",
                      latitude: event.venue.lat || lat,
                      longitude: event.venue.lon || lng,
                    }
                  : null,
                online_event: event.isOnline || false,
                is_free: null, // Meetup doesn't provide this directly
                has_available_tickets: null,
                logo: null,
                rating: null,
                types: [],
                group: event.group?.name || null,
                attendees: event.going || 0,
              };
            })
            .filter((event: any) => {
              // Filter for community-focused events
              const name = (event.name || "").toLowerCase();
              const desc = (event.description || "").toLowerCase();
              return (
                name.includes("market") ||
                name.includes("farmers") ||
                name.includes("community") ||
                name.includes("festival") ||
                name.includes("fair") ||
                name.includes("local") ||
                desc.includes("market") ||
                desc.includes("community") ||
                desc.includes("local")
              );
            });

          if (events.length > 0) {
            console.log(
              `✅ [Events API] Meetup returned ${events.length} events`
            );
            return NextResponse.json({
              events: events.slice(0, 20),
              source: "meetup",
            });
          }
        } else {
          console.log(
            `⚠️ [Events API] Meetup API error:`,
            meetupData.errors || meetupData.message || "Unknown error"
          );
        }
      } catch (error) {
        console.error(`❌ [Events API] Meetup API error:`, error);
      }
    }

    // Try Facebook Events API
    // NOTE: Facebook requires app review/approval for event search API access
    // Most apps will get error code 3: "Application does not have the capability"
    // This is expected - we'll fall back to Google Places API
    const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    if (facebookAccessToken) {
      try {
        console.log(`🔍 [Events API] Trying Facebook Events API...`);

        // Facebook Graph API search for events requires a 'q' parameter
        // Search for multiple community event types
        const eventQueries = [
          "farmers market",
          "community event",
          "local festival",
          "street fair",
          "neighborhood event",
        ];

        const allFacebookEvents: any[] = [];
        const seenEventIds = new Set<string>();

        for (const query of eventQueries) {
          try {
            const facebookUrl = `https://graph.facebook.com/v18.0/search?type=event&q=${encodeURIComponent(
              query
            )}&center=${lat},${lng}&distance=${radiusMeters}&fields=id,name,description,start_time,end_time,place,cover,attending_count,interested_count,is_free&access_token=${facebookAccessToken}`;

            const fbResponse = await fetch(facebookUrl);
            const fbData = await fbResponse.json();

            if (fbResponse.ok && fbData.data && fbData.data.length > 0) {
              console.log(
                `✅ [Events API] Facebook query "${query}" returned ${fbData.data.length} events`
              );

              fbData.data.forEach((event: any) => {
                // Skip duplicates
                if (seenEventIds.has(event.id)) {
                  return;
                }
                seenEventIds.add(event.id);

                allFacebookEvents.push({
                  id: event.id,
                  name: event.name,
                  description: event.description || "",
                  start: event.start_time || null,
                  end: event.end_time || null,
                  url: `https://www.facebook.com/events/${event.id}`,
                  venue: event.place
                    ? {
                        name: event.place.name || "",
                        address: event.place.location
                          ? `${event.place.location.street || ""}, ${
                              event.place.location.city || ""
                            }, ${event.place.location.state || ""} ${
                              event.place.location.zip || ""
                            }`.trim()
                          : "",
                        latitude: event.place.location?.latitude || lat,
                        longitude: event.place.location?.longitude || lng,
                      }
                    : null,
                  online_event: !event.place,
                  is_free: event.is_free !== undefined ? event.is_free : null,
                  has_available_tickets: null,
                  logo: event.cover?.source || null,
                  rating: null,
                  types: [],
                });
              });
            } else if (fbData.error) {
              // Facebook API requires app review for event search - this is expected
              if (fbData.error.code === 3) {
                console.log(
                  `ℹ️ [Events API] Facebook requires app review for event search (code 3). Using Google Places fallback.`
                );
                break; // Stop trying other queries since they'll all fail
              } else {
                console.log(
                  `⚠️ [Events API] Facebook query "${query}" error:`,
                  fbData.error
                );
              }
            }
          } catch (error) {
            console.error(
              `❌ [Events API] Error fetching "${query}" from Facebook:`,
              error
            );
          }
        }

        if (allFacebookEvents.length > 0) {
          console.log(
            `🎉 [Events API] Facebook returned ${allFacebookEvents.length} total events`
          );
          return NextResponse.json({
            events: allFacebookEvents.slice(0, 20),
            source: "facebook",
          });
        } else {
          console.log(
            `ℹ️ [Events API] Facebook returned no events, falling back to Google Places`
          );
        }
      } catch (error) {
        console.error(`❌ [Events API] Facebook API error:`, error);
      }
    } else {
      console.log(
        `ℹ️ [Events API] No Facebook access token, falling back to Google Places`
      );
    }

    // Fallback to Google Places API
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!googleApiKey) {
      return NextResponse.json(
        {
          error:
            "No event API configured. Please add FACEBOOK_ACCESS_TOKEN or GOOGLE_PLACES_API_KEY to .env",
          events: [],
        },
        { status: 200 }
      );
    }

    // Use Google Places API Text Search for events
    // radiusMeters already calculated above

    // Focus on community events, farmers markets, and local gatherings
    // Using more specific queries that Google Places can find
    const searchQueries = [
      "farmers market",
      "farmers markets",
      "community center",
      "community centers",
      "outdoor market",
      "street market",
      "flea market",
      "artisan market",
      "local festival",
      "community park",
      "event venue",
      "event space",
      "community hall",
      "recreation center",
      "civic center",
    ];

    const allEvents: any[] = [];
    const seenPlaceIds = new Set<string>();

    console.log(
      `🔍 [Events API] Searching for events near ${lat}, ${lng} within ${radius} miles`
    );

    for (const query of searchQueries) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&location=${lat},${lng}&radius=${radiusMeters}&key=${googleApiKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        console.log(
          `📊 [Events API] Query "${query}": ${data.status}, ${
            data.results?.length || 0
          } results`
        );

        if (data.status === "OK" && data.results) {
          // Filter out duplicates and format as events
          data.results.forEach((place: any) => {
            // Skip if we've already seen this place
            if (seenPlaceIds.has(place.place_id)) {
              return;
            }

            // Filter for community/event-related types and names
            const types = place.types || [];
            const nameLower = place.name.toLowerCase();
            const queryLower = query.toLowerCase();

            const isCommunityEventRelated =
              // Check place types
              types.some((type: string) =>
                [
                  "park",
                  "community_center",
                  "establishment",
                  "point_of_interest",
                  "store",
                  "food",
                  "market",
                  "shopping_mall",
                  "civic_building",
                  "local_government_office",
                ].includes(type)
              ) ||
              // Check if query matches the place type
              queryLower.includes("market") ||
              queryLower.includes("community") ||
              queryLower.includes("festival") ||
              queryLower.includes("venue") ||
              queryLower.includes("center") ||
              queryLower.includes("hall") ||
              queryLower.includes("park") ||
              // Check if place name matches event-related keywords
              nameLower.includes("market") ||
              nameLower.includes("festival") ||
              nameLower.includes("fair") ||
              nameLower.includes("community") ||
              nameLower.includes("center") ||
              nameLower.includes("hall") ||
              nameLower.includes("venue") ||
              nameLower.includes("park") ||
              nameLower.includes("recreation") ||
              nameLower.includes("civic");

            if (isCommunityEventRelated) {
              seenPlaceIds.add(place.place_id);

              const eventData = {
                id: place.place_id,
                name: place.name,
                description: place.formatted_address || place.vicinity || "",
                start: null,
                end: null,
                url: place.url || null,
                venue: {
                  name: place.name,
                  address: place.vicinity || place.formatted_address || "",
                  latitude: place.geometry?.location?.lat?.toString() || lat,
                  longitude: place.geometry?.location?.lng?.toString() || lng,
                },
                online_event: false,
                is_free: null,
                has_available_tickets: null,
                logo: place.photos?.[0]
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${googleApiKey}`
                  : null,
                rating: place.rating || null,
                types: place.types || [],
              };

              console.log(
                `✅ [Events API] Added event: ${place.name} (${
                  place.types?.join(", ") || "no types"
                })`
              );
              allEvents.push(eventData);
            }
          });
        } else if (data.status !== "ZERO_RESULTS") {
          console.warn(
            `⚠️ [Events API] Query "${query}" returned status: ${data.status}`
          );
        }
      } catch (error) {
        console.error(
          `❌ [Events API] Error fetching ${query} from Google Places:`,
          error
        );
      }
    }

    // Remove duplicates and limit to 20 events
    const uniqueEvents = Array.from(
      new Map(allEvents.map((event) => [event.id, event])).values()
    ).slice(0, 20);

    console.log(
      `🎉 [Events API] Returning ${uniqueEvents.length} unique events`
    );
    console.log(
      `📋 [Events API] Event names:`,
      uniqueEvents.map((e) => e.name)
    );

    return NextResponse.json({
      events: uniqueEvents,
      source: "google_places",
    });
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", events: [] },
      { status: 500 }
    );
  }
}
