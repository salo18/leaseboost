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
    const radiusKm = parseFloat(radius);

    let allEvents: any[] = [];

    // USDA Farmers Market Directory API - COMMENTED OUT (certificate expired)
    /*
    // Try USDA Farmers Market Directory API first (free, no API key needed)
    // USDA provides farmers market data via data.gov
    // NOTE: The USDA API endpoint has certificate issues - commented out for now
    let usdaMarkets: any[] = [];
    try {
      console.log(`🔍 [Events API] Trying USDA Farmers Market Directory...`);

      // USDA Farmers Market Directory API endpoint
      // The API endpoint format: https://search.ams.usda.gov/farmersmarkets/v1/data.svc/locSearch?lat={lat}&lng={lng}
      const usdaUrl = `https://search.ams.usda.gov/farmersmarkets/v1/data.svc/locSearch?lat=${lat}&lng=${lng}`;

      const usdaResponse = await fetch(usdaUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (usdaResponse.ok) {
        const usdaData = await usdaResponse.json();

        // USDA returns data in format: { results: [{ id, marketname, ... }] }
        if (usdaData.results && Array.isArray(usdaData.results)) {
          console.log(
            `✅ [Events API] USDA returned ${usdaData.results.length} farmers markets`
          );

          // Filter by distance and format events
          const farmersMarkets = usdaData.results
            .map((market: any) => {
              // Calculate distance if coordinates available
              let distance = null;
              if (market.latitude && market.longitude) {
                const R = 3959; // Earth's radius in miles
                const dLat =
                  ((parseFloat(market.latitude) - parseFloat(lat)) * Math.PI) /
                  180;
                const dLon =
                  ((parseFloat(market.longitude) - parseFloat(lng)) * Math.PI) /
                  180;
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos((parseFloat(lat) * Math.PI) / 180) *
                    Math.cos((parseFloat(market.latitude) * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distance = R * c;
              }

              return {
                id: market.id || `usda-${market.marketname}`,
                name: market.marketname || "Farmers Market",
                description: market.Address || market.address || "",
                start: null, // USDA doesn't provide specific event dates
                end: null,
                url: market.website || market.Website || null,
                venue: {
                  name: market.marketname || "Farmers Market",
                  address: market.Address || market.address || "",
                  latitude: parseFloat(market.latitude) || parseFloat(lat),
                  longitude: parseFloat(market.longitude) || parseFloat(lng),
                },
                online_event: false,
                is_free: true, // Farmers markets are typically free to attend
                has_available_tickets: null,
                logo: null,
                rating: null,
                types: ["farmers_market", "market", "community"],
                distance: distance,
              };
            })
            .filter((market: any) => {
              // Filter by radius
              if (market.distance !== null) {
                return market.distance <= radiusKm;
              }
              return true; // Include if distance unknown
            })
            .sort((a: any, b: any) => {
              // Sort by distance
              if (a.distance === null) return 1;
              if (b.distance === null) return -1;
              return a.distance - b.distance;
            });

          if (farmersMarkets.length > 0) {
            console.log(
              `📋 [Events API] Filtered to ${farmersMarkets.length} farmers markets within ${radiusKm} miles`
            );

            // Format for response (remove distance from final output)
            const formattedMarkets = farmersMarkets.map((market: any) => {
              const { distance, ...rest } = market;
              return rest;
            });

            // Also try PredictHQ for additional events
            const allEvents = [...formattedMarkets];

            // Try PredictHQ API (if token provided)
            const predicthqToken = process.env.PREDICTHQ_ACCESS_TOKEN;

            if (predicthqToken) {
              try {
                console.log(`🔍 [Events API] Trying PredictHQ API...`);

                // PredictHQ Events API
                // Format: within="10mi@lat,lng" for radius search
                const predicthqUrl = `https://api.predicthq.com/v1/events/?within=${radiusKm}mi@${lat},${lng}&start.gte=${
                  new Date().toISOString().split("T")[0]
                }&limit=20`;

                const phqResponse = await fetch(predicthqUrl, {
                  headers: {
                    Authorization: `Bearer ${predicthqToken}`,
                    Accept: "application/json",
                  },
                });

                if (phqResponse.ok) {
                  const phqData = await phqResponse.json();

                  if (phqData.results && Array.isArray(phqData.results)) {
                    console.log(
                      `✅ [Events API] PredictHQ returned ${phqData.results.length} events`
                    );

                    // Don't filter PredictHQ events too strictly - show all events
                    const phqEvents = phqData.results.map((event: any) => ({
                      id: `phq-${event.id}`,
                      name: event.title || "Event",
                      description: event.description || "",
                      start: event.start || null,
                      end: event.end || null,
                      url: event.phq_attendance?.url || null,
                      venue:
                        event.location && event.location.length > 0
                          ? {
                              name: event.location[0].display_name || "",
                              address: event.location[0].address || "",
                              latitude:
                                event.location[0].lat || parseFloat(lat),
                              longitude:
                                event.location[0].lon || parseFloat(lng),
                            }
                          : null,
                      online_event: event.online_event || false,
                      is_free: null,
                      has_available_tickets: null,
                      logo: event.phq_attendance?.image_url || null,
                      rating: event.phq_attendance?.predicted_attendance
                        ? Math.min(
                            5,
                            event.phq_attendance.predicted_attendance / 1000
                          )
                        : null,
                      types: [event.category || "event"],
                    }));

                    allEvents.push(...phqEvents);
                  }
                } else {
                  const errorData = await phqResponse.json();
                  console.log(`⚠️ [Events API] PredictHQ error:`, errorData);
                }
              } catch (error) {
                console.error(`❌ [Events API] PredictHQ error:`, error);
              }
            }

            if (allEvents.length > 0) {
              return NextResponse.json({
                events: allEvents.slice(0, 20),
                source: "usda_predictHQ",
              });
            }
          }
        }
      } else {
        console.log(
          `⚠️ [Events API] USDA API returned status: ${usdaResponse.status}`
        );
      }
    } catch (error) {
      console.error(`❌ [Events API] USDA API error:`, error);
    }
    */

    // Try PredictHQ API standalone (if token provided and USDA didn't work)
    const predicthqToken = process.env.PREDICTHQ_ACCESS_TOKEN;

    if (predicthqToken) {
      try {
        // console.log(`🔍 [Events API] Trying PredictHQ API...`);

        // PredictHQ Events API
        // Filter for events happening in the next 30 days (this month)
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        const startDate = today.toISOString().split("T")[0];
        const endDate = nextMonth.toISOString().split("T")[0];

        const predicthqUrl = `https://api.predicthq.com/v1/events/?within=${radiusKm}mi@${lat},${lng}&start.gte=${startDate}&start.lte=${endDate}&limit=100`;

        // console.log(`🔍 [Events API] PredictHQ URL: ${predicthqUrl}`);
        // console.log(`📅 [Events API] Date range: ${startDate} to ${endDate}`);

        const phqResponse = await fetch(predicthqUrl, {
          headers: {
            Authorization: `Bearer ${predicthqToken}`,
            Accept: "application/json",
          },
        });

        if (phqResponse.ok) {
          const phqData = await phqResponse.json();

          // Log full PredictHQ response for inspection
          // console.log(
          //   `📊 [Events API] PredictHQ full response:`,
          //   JSON.stringify(phqData, null, 2)
          // );
          // console.log(
          //   `📊 [Events API] PredictHQ results count:`,
          //   phqData.results?.length || 0
          // );

          if (phqData.results && Array.isArray(phqData.results)) {
            // console.log(
            //   `✅ [Events API] PredictHQ returned ${phqData.results.length} events`
            // );

            // Log first event structure to see what data is available
            // if (phqData.results.length > 0) {
            //   console.log(
            //     `📋 [Events API] Sample PredictHQ event:`,
            //     JSON.stringify(phqData.results[0], null, 2)
            //   );
            // }

            // Map events and include all available data
            const events = phqData.results.map((event: any) => {
              // Log URL fields to see what's available
              // const urlFields = {
              //   event_url: event.url,
              //   phq_attendance_url: event.phq_attendance?.url,
              //   entity_url: event.entity?.url,
              //   entities: event.entities?.map((e: any) => ({
              //     type: e.type,
              //     url: e.url,
              //     name: e.name,
              //   })),
              //   all_fields: Object.keys(event), // Log all available fields
              // };
              // console.log(
              //   `🔗 [Events API] Event "${event.title}" URL fields:`,
              //   JSON.stringify(urlFields, null, 2)
              // );

              // PredictHQ API does NOT return direct event URLs
              // We need to find external URLs from entities or construct a search URL

              // First, try to find external URLs from entities (venues, organizations, etc.)
              // These might point to Ticketmaster, Eventbrite, venue websites, etc.
              let eventUrl: string | null = null;

              if (event.entities && Array.isArray(event.entities)) {
                // Look for URLs in entities that are NOT PredictHQ internal URLs
                const externalEntity = event.entities.find((e: any) => {
                  if (!e.url) return false;
                  // Accept URLs that are NOT PredictHQ internal domains
                  return (
                    !e.url.includes("predicthq.com") &&
                    !e.url.includes("cf-origin") &&
                    (e.url.startsWith("http://") ||
                      e.url.startsWith("https://"))
                  );
                });

                if (externalEntity?.url) {
                  eventUrl = externalEntity.url;
                  // console.log(
                  //   `✅ [Events API] Found external URL from entity "${externalEntity.type}": ${eventUrl}`
                  // );
                }
              }

              // Also check phq_attendance.url but filter out PredictHQ internal URLs
              if (!eventUrl && event.phq_attendance?.url) {
                const phqUrl = event.phq_attendance.url;
                if (
                  !phqUrl.includes("predicthq.com") &&
                  !phqUrl.includes("cf-origin")
                ) {
                  eventUrl = phqUrl;
                  // console.log(
                  //   `✅ [Events API] Found URL from phq_attendance: ${eventUrl}`
                  // );
                }
              }

              // If no external URL found, create a Google search URL for the event
              // This helps users quickly find the actual event page
              if (!eventUrl && event.title) {
                const venueName =
                  event.entities?.find((e: any) => e.type === "venue")?.name ||
                  event.geo?.address?.locality ||
                  "";
                const dateStr = event.start_local
                  ? new Date(event.start_local).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                const searchQuery = encodeURIComponent(
                  `${event.title} ${venueName} ${dateStr}`.trim()
                );
                eventUrl = `https://www.google.com/search?q=${searchQuery}`;
                // console.log(
                //   `🔍 [Events API] No external URL found - created Google search URL: ${eventUrl}`
                // );
              }

              return {
                id: `phq-${event.id}`,
                name: event.title || "Event",
                description: event.description || "",
                start: event.start || null,
                end: event.end || null,
                url: eventUrl,
                venue:
                  event.location && event.location.length === 2
                    ? {
                        // PredictHQ location is [lng, lat] array
                        name:
                          event.entities?.find((e: any) => e.type === "venue")
                            ?.name ||
                          event.geo?.address?.formatted_address?.split(
                            ","
                          )[0] ||
                          "Event Venue",
                        address: event.geo?.address?.formatted_address || "",
                        latitude: event.location[1], // lat is second element
                        longitude: event.location[0], // lng is first element
                      }
                    : null,
                online_event: event.online_event || false,
                is_free: null,
                has_available_tickets: null,
                logo:
                  event.phq_attendance?.image_url ||
                  event.entity?.image_url ||
                  null,
                rating: event.phq_attendance?.predicted_attendance
                  ? Math.min(
                      5,
                      event.phq_attendance.predicted_attendance / 1000
                    )
                  : null,
                types: [event.category || "event"],
              };
            });

            if (events.length > 0) {
              // console.log(
              //   `✅ [Events API] Adding ${events.length} PredictHQ events to allEvents`
              // );
              allEvents.push(...events);
              // console.log(
              //   `📊 [Events API] Total events in allEvents: ${allEvents.length}`
              // );
            }
          }
        } else {
          const errorData = await phqResponse.json();
          // console.log(`⚠️ [Events API] PredictHQ error:`, errorData);
        }
      } catch (error) {
        console.error(`❌ [Events API] PredictHQ error:`, error);
      }
    }

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

    // Facebook Events API - COMMENTED OUT (not working, requires app review)
    /*
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
    */

    // Google Places API fallback - COMMENTED OUT to see USDA/PredictHQ results clearly
    /*
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
    */

    // Check if we have any events and return them
    if (allEvents.length > 0) {
      // Remove duplicates (no limit - show all events)
      const uniqueEvents = Array.from(
        new Map(allEvents.map((event) => [event.id, event])).values()
      );

      console.log(
        `🎉 [Events API] Returning ${uniqueEvents.length} unique events`
      );
      console.log(
        `📋 [Events API] Event names:`,
        uniqueEvents.map((e) => e.name)
      );

      return NextResponse.json({
        events: uniqueEvents,
        source: "predicthq",
      });
    }

    // Return empty if no APIs returned results
    console.log(
      `ℹ️ [Events API] No events found from USDA or PredictHQ. Google Places fallback is disabled.`
    );
    return NextResponse.json({
      events: [],
      source: "none",
      message: "No events found. USDA and PredictHQ APIs returned no results.",
    });
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events", events: [] },
      { status: 500 }
    );
  }
}
