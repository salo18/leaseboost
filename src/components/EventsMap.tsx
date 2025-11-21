"use client";

import { useMemo, useState, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface VenueContact {
  name: string;
  phone: string | null;
  website: string | null;
  address: string;
  openingHours: string[] | null;
  googlePlaceId: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string;
  start: string | null;
  end: string | null;
  url: string | null;
  venue: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  venueContact?: VenueContact | null;
  online_event: boolean;
  is_free: boolean | null;
  has_available_tickets: boolean | null;
  logo: string | null;
  rating?: number | null;
}

interface EventsMapProps {
  propertyLatitude: number | null;
  propertyLongitude: number | null;
  events: Event[];
}

export default function EventsMap({
  propertyLatitude,
  propertyLongitude,
  events,
}: EventsMapProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch Maps API key from server
  useEffect(() => {
    fetch("/api/maps/config")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch map config: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        } else if (data.error) {
          console.error("Map config error:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error fetching map config:", error);
      });
  }, []);

  // Filter events with valid venue locations
  const eventsWithLocations = useMemo(() => {
    return events.filter((event) => event.venue && !event.online_event);
  }, [events]);

  // Calculate map center and bounds
  const mapCenter = useMemo(() => {
    if (propertyLatitude && propertyLongitude) {
      return {
        lat: propertyLatitude,
        lng: propertyLongitude,
      };
    }
    // Fallback to first event location if no property
    if (eventsWithLocations.length > 0) {
      return {
        lat: eventsWithLocations[0].venue!.latitude,
        lng: eventsWithLocations[0].venue!.longitude,
      };
    }
    return { lat: 32.7157, lng: -117.1611 }; // Default to San Diego
  }, [propertyLatitude, propertyLongitude, eventsWithLocations]);

  const mapBounds = useMemo(() => {
    if (eventsWithLocations.length === 0) return null;

    const bounds = {
      north: eventsWithLocations[0].venue!.latitude,
      south: eventsWithLocations[0].venue!.latitude,
      east: eventsWithLocations[0].venue!.longitude,
      west: eventsWithLocations[0].venue!.longitude,
    };

    eventsWithLocations.forEach((event) => {
      if (event.venue) {
        bounds.north = Math.max(bounds.north, event.venue.latitude);
        bounds.south = Math.min(bounds.south, event.venue.latitude);
        bounds.east = Math.max(bounds.east, event.venue.longitude);
        bounds.west = Math.min(bounds.west, event.venue.longitude);
      }
    });

    // Include property location in bounds if available
    if (propertyLatitude && propertyLongitude) {
      bounds.north = Math.max(bounds.north, propertyLatitude);
      bounds.south = Math.min(bounds.south, propertyLatitude);
      bounds.east = Math.max(bounds.east, propertyLongitude);
      bounds.west = Math.min(bounds.west, propertyLongitude);
    }

    return bounds;
  }, [eventsWithLocations, propertyLatitude, propertyLongitude]);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-slate-200">
      {apiKey ? (
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{
              width: "100%",
              height: "100%",
            }}
            center={mapCenter}
            zoom={mapBounds ? undefined : 13}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
            onLoad={(map) => {
              setMapLoaded(true);
              if (
                mapBounds &&
                eventsWithLocations.length > 0 &&
                window.google
              ) {
                const googleBounds = new window.google.maps.LatLngBounds();

                // Add property location if available
                if (propertyLatitude && propertyLongitude) {
                  googleBounds.extend(
                    new window.google.maps.LatLng(
                      propertyLatitude,
                      propertyLongitude
                    )
                  );
                }

                // Add all event locations
                eventsWithLocations.forEach((event) => {
                  if (event.venue) {
                    googleBounds.extend(
                      new window.google.maps.LatLng(
                        event.venue.latitude,
                        event.venue.longitude
                      )
                    );
                  }
                });

                map.fitBounds(googleBounds);
                map.setOptions({ minZoom: 11 });
              }
            }}
          >
            {/* Property marker (if available) */}
            {propertyLatitude && propertyLongitude && (
              <Marker
                position={{
                  lat: propertyLatitude,
                  lng: propertyLongitude,
                }}
                title="Property Location"
                label={{
                  text: "⭐",
                  fontSize: "16px",
                }}
                onClick={() => setSelectedMarker("property")}
              >
                {selectedMarker === "property" && (
                  <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                    <div className="p-4 min-w-[200px]">
                      <h3 className="font-bold text-base text-slate-900 mb-1">
                        Property Location
                      </h3>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            )}

            {/* Event markers */}
            {eventsWithLocations.map((event) => {
              const eventMarkerId = `event-${event.id}`;
              return (
                <Marker
                  key={eventMarkerId}
                  position={{
                    lat: event.venue!.latitude,
                    lng: event.venue!.longitude,
                  }}
                  title={event.name}
                  label={{
                    text: "🎉",
                    fontSize: "16px",
                  }}
                  onClick={() => setSelectedMarker(eventMarkerId)}
                >
                  {selectedMarker === eventMarkerId && (
                    <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                      <div className="p-4 min-w-[280px] max-w-[320px]">
                        <h4 className="font-bold text-lg text-slate-900 mb-2 leading-tight">
                          {event.name}
                        </h4>

                        {event.start && (
                          <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
                            <svg
                              className="w-4 h-4 text-purple-600 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {new Date(event.start).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        )}

                        {event.venue && (
                          <div className="flex items-start gap-2 mb-2 text-sm text-slate-600">
                            <svg
                              className="w-4 h-4 text-purple-600 mt-0.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>
                              <span className="font-medium">
                                {event.venue.name}
                              </span>
                              {event.venue.address &&
                                ` - ${event.venue.address}`}
                            </span>
                          </div>
                        )}

                        {propertyLatitude &&
                          propertyLongitude &&
                          event.venue && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
                              <svg
                                className="w-4 h-4 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                />
                              </svg>
                              <span className="font-semibold text-slate-900">
                                {calculateDistance(
                                  propertyLatitude,
                                  propertyLongitude,
                                  event.venue.latitude,
                                  event.venue.longitude
                                ).toFixed(2)}{" "}
                                miles away
                              </span>
                            </div>
                          )}

                        {event.description && (
                          <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        )}

                        {/* Venue Contact Information */}
                        {event.venueContact && (
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <svg
                                className="w-3.5 h-3.5 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              <span className="text-xs font-semibold text-blue-900">
                                Contact
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-slate-700">
                              {event.venueContact.phone && (
                                <a
                                  href={`tel:${event.venueContact.phone.replace(
                                    /\s/g,
                                    ""
                                  )}`}
                                  className="block text-blue-700 hover:text-blue-800 hover:underline"
                                >
                                  📞 {event.venueContact.phone}
                                </a>
                              )}
                              {event.venueContact.website && (
                                <a
                                  href={event.venueContact.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-blue-700 hover:text-blue-800 hover:underline truncate"
                                >
                                  🌐{" "}
                                  {event.venueContact.website.replace(
                                    /^https?:\/\//,
                                    ""
                                  )}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}
          </GoogleMap>
        </LoadScript>
      ) : (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading map...</p>
        </div>
      )}
    </div>
  );
}
