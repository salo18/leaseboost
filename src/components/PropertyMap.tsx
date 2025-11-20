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

interface Business {
  name: string;
  types: string[];
  rating: number | null;
  userRatingsTotal: number | null;
  vicinity: string;
  placeId: string | null;
  priceLevel: number | null;
  businessStatus: string | null;
  geometry: any | null;
}

interface PropertyMapProps {
  propertyName: string;
  propertyAddress: string;
  latitude: number | null;
  longitude: number | null;
  nearbyBusinesses: Business[];
  hoveredBusinessId?: string | null;
}

export default function PropertyMap({
  propertyName,
  propertyAddress,
  latitude,
  longitude,
  nearbyBusinesses,
  hoveredBusinessId = null,
}: PropertyMapProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<any>(null);

  // Fetch Maps API key from server (proxy through API route)
  // This keeps the API key server-side and only exposes it when needed
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
          console.error("Maps API key error:", data.error);
        }
      })
      .catch((error) => {
        console.error("Failed to load Maps API key:", error);
      });
  }, []);

  // Property location (center of map)
  const propertyCenter = useMemo(() => {
    if (latitude && longitude) {
      return { lat: latitude, lng: longitude };
    }
    return null;
  }, [latitude, longitude]);

  // Create star icon for property (big red star) - will be created after map loads
  const [starIcon, setStarIcon] = useState<any>(undefined);

  // Map options
  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      clickableIcons: true,
      scrollwheel: true,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
    }),
    []
  );

  if (!propertyCenter) {
    return (
      <div className="w-full h-64 bg-zinc-100 rounded-lg flex items-center justify-center">
        <p className="text-zinc-500 text-sm">No location data available</p>
      </div>
    );
  }

  // Calculate bounds to fit all markers
  const bounds = useMemo(() => {
    const allPoints = [
      propertyCenter,
      ...nearbyBusinesses
        .filter((b) => b.geometry?.location)
        .map((b) => ({
          lat: b.geometry.location.lat,
          lng: b.geometry.location.lng,
        })),
    ];

    if (allPoints.length === 1) return undefined;

    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [propertyCenter, nearbyBusinesses]);

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-zinc-200">
      {apiKey ? (
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={propertyCenter}
            zoom={bounds ? undefined : 15}
            options={mapOptions}
            onLoad={(map) => {
              setMapLoaded(true);

              // Create star icon after Google Maps is loaded
              if (window.google) {
                const starSvg = encodeURIComponent(`
                  <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                          fill="#EF4444"
                          stroke="#FFFFFF"
                          stroke-width="1.5"/>
                  </svg>
                `);
                setStarIcon({
                  url: `data:image/svg+xml;charset=UTF-8,${starSvg}`,
                  scaledSize: new window.google.maps.Size(48, 48),
                  anchor: new window.google.maps.Point(24, 24),
                });

                // Create hovered business icon (big blue circle)
                const hoveredSvg = encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="11" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
                    <circle cx="12" cy="12" r="7" fill="#FFFFFF" opacity="0.9"/>
                    <circle cx="12" cy="12" r="4" fill="#3B82F6"/>
                  </svg>
                `);
                setHoveredIcon({
                  url: `data:image/svg+xml;charset=UTF-8,${hoveredSvg}`,
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 20),
                });
              }

              if (bounds && window.google) {
                const googleBounds = new window.google.maps.LatLngBounds();
                googleBounds.extend(propertyCenter);
                nearbyBusinesses
                  .filter((b) => b.geometry?.location)
                  .forEach((b) => {
                    googleBounds.extend({
                      lat: b.geometry.location.lat,
                      lng: b.geometry.location.lng,
                    });
                  });
                map.fitBounds(googleBounds);
                // Add padding
                map.setOptions({ minZoom: 13 });
              }
            }}
          >
            {/* Property marker (big star) */}
            <Marker
              position={propertyCenter}
              title={propertyName}
              icon={starIcon}
              onClick={() => setSelectedMarker("property")}
            >
              {selectedMarker === "property" && (
                <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm">{propertyName}</h3>
                    <p className="text-xs text-zinc-600">{propertyAddress}</p>
                  </div>
                </InfoWindow>
              )}
            </Marker>

            {/* Nearby businesses markers (blue) */}
            {nearbyBusinesses
              .filter((b) => b.geometry?.location)
              .map((business, idx) => {
                const markerId = business.placeId || `business-${idx}`;
                const isHovered = hoveredBusinessId === markerId;
                return (
                  <Marker
                    key={markerId}
                    position={{
                      lat: business.geometry.location.lat,
                      lng: business.geometry.location.lng,
                    }}
                    title={business.name}
                    icon={isHovered && hoveredIcon ? hoveredIcon : undefined}
                    label={
                      !isHovered
                        ? {
                            text: "🔵",
                            fontSize: "12px",
                          }
                        : undefined
                    }
                    onClick={() => setSelectedMarker(markerId)}
                  >
                    {selectedMarker === markerId && (
                      <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                        <div className="p-2 max-w-xs">
                          <h4 className="font-semibold text-sm mb-1">
                            {business.name}
                          </h4>
                          {business.vicinity && (
                            <p className="text-xs text-zinc-600 mb-1">
                              {business.vicinity}
                            </p>
                          )}
                          {latitude &&
                            longitude &&
                            business.geometry?.location && (
                              <p className="text-xs text-zinc-600 mb-1 font-medium">
                                📏{" "}
                                {calculateDistance(
                                  latitude,
                                  longitude,
                                  business.geometry.location.lat,
                                  business.geometry.location.lng
                                ).toFixed(2)}{" "}
                                miles away
                              </p>
                            )}
                          {business.rating && (
                            <p className="text-xs text-zinc-700">
                              ⭐ {business.rating.toFixed(1)}
                              {business.userRatingsTotal &&
                                ` (${business.userRatingsTotal.toLocaleString()} reviews)`}
                            </p>
                          )}
                          {business.types && business.types.length > 0 && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {business.types
                                .filter(
                                  (type: string) =>
                                    ![
                                      "establishment",
                                      "point_of_interest",
                                      "geocode",
                                    ].includes(type)
                                )
                                .slice(0, 2)
                                .map((type: string) => type.replace(/_/g, " "))
                                .join(", ")}
                            </p>
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
        <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Loading map...</p>
        </div>
      )}
    </div>
  );
}
