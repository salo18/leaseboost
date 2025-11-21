"use client";

import { useMemo, useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";

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
  online_event: boolean;
  is_free: boolean | null;
  has_available_tickets: boolean | null;
  logo: string | null;
  rating?: number | null;
}

interface PropertyMapProps {
  propertyName: string;
  propertyAddress: string;
  latitude: number | null;
  longitude: number | null;
  nearbyBusinesses: Business[];
  hoveredBusinessId?: string | null;
  apiKey: string;
}

export default function PropertyMap({
  propertyName,
  propertyAddress,
  latitude,
  longitude,
  nearbyBusinesses,
  hoveredBusinessId = null,
  apiKey,
}: PropertyMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<any>(null);

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
      {apiKey && typeof window !== "undefined" && window.google ? (
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
                <div className="p-4 min-w-[200px]">
                  <h3 className="font-bold text-base text-slate-900 mb-1">
                    {propertyName}
                  </h3>
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <svg
                      className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
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
                    <p>{propertyAddress}</p>
                  </div>
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
                      <div className="p-4 min-w-[250px] max-w-[300px]">
                        <h4 className="font-bold text-base text-slate-900 mb-2 leading-tight">
                          {business.name}
                        </h4>

                        {business.vicinity && (
                          <div className="flex items-start gap-2 mb-2 text-xs text-slate-600">
                            <svg
                              className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
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
                            <span>{business.vicinity}</span>
                          </div>
                        )}

                        {latitude &&
                          longitude &&
                          business.geometry?.location && (
                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                              <svg
                                className="w-4 h-4 text-blue-600"
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
                                  latitude,
                                  longitude,
                                  business.geometry.location.lat,
                                  business.geometry.location.lng
                                ).toFixed(2)}{" "}
                                miles away
                              </span>
                            </div>
                          )}

                        {business.rating && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                              <svg
                                className="w-3.5 h-3.5 text-yellow-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-bold text-slate-900">
                                {business.rating.toFixed(1)}
                              </span>
                              {business.userRatingsTotal && (
                                <span className="text-xs text-slate-500">
                                  ({business.userRatingsTotal.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {business.types && business.types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200">
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
                              .map((type: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-200 capitalize"
                                >
                                  {type.replace(/_/g, " ")}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}
        </GoogleMap>
      ) : (
        <div className="w-full h-full bg-zinc-100 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Loading map...</p>
        </div>
      )}
    </div>
  );
}
