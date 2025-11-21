"use client";

import { useEffect, useState } from "react";
import PropertyMap from "@/components/PropertyMap";

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

export default function Home() {
  const [address, setAddress] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setLoadingEvents(true);

    try {
      // Step 1: Geocode the address
      const geocodeResponse = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!geocodeResponse.ok) {
        throw new Error("Failed to geocode address");
      }

      const geocodeData = await geocodeResponse.json();
      setLatitude(geocodeData.latitude);
      setLongitude(geocodeData.longitude);

      // Step 2: Fetch nearby businesses
      const businessesResponse = await fetch(
        `/api/places/nearby?lat=${geocodeData.latitude}&lng=${geocodeData.longitude}`
      );

      if (businessesResponse.ok) {
        const businessesData = await businessesResponse.json();
        setNearbyBusinesses(businessesData.results || []);
      }

      // Step 3: Auto-fetch events
      const eventsResponse = await fetch(
        `/api/events?lat=${geocodeData.latitude}&lng=${geocodeData.longitude}&radius=10`
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData.events || []);
      }

      setLoading(false);
      setLoadingEvents(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process address. Please try again.");
      setLoading(false);
      setLoadingEvents(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBD";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">LeaseBoost</h1>
          <p className="text-slate-600">
            Discover local events and nearby businesses for your property
          </p>
        </div>

        {/* Address Input Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1">
              <label
                htmlFor="property-name"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Property Name (Optional)
              </label>
              <input
                id="property-name"
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g., Sunset Apartments"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Property Address *
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 Main St, San Diego, CA"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? "Loading..." : "Search"}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {latitude && longitude && (
          <div className="space-y-8">
            {/* Map with Nearby Businesses */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  {propertyName || "Property Location"}
                </h2>
                <p className="text-slate-600">{address}</p>
              </div>
              <div className="p-6">
                <PropertyMap
                  propertyName={propertyName || address}
                  propertyAddress={address}
                  latitude={latitude}
                  longitude={longitude}
                  nearbyBusinesses={nearbyBusinesses}
                  hoveredBusinessId={hoveredBusinessId}
                />
              </div>
            </div>

            {/* Nearby Businesses */}
            {nearbyBusinesses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Nearby Businesses
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {nearbyBusinesses.length}
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {nearbyBusinesses.map((business, idx) => {
                      const businessId = business.placeId || `business-${idx}`;
                      return (
                        <div
                          key={idx}
                          className={`bg-white rounded-xl p-5 border-2 transition-all duration-200 cursor-pointer ${
                            hoveredBusinessId === businessId
                              ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
                              : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                          }`}
                          onMouseEnter={() => setHoveredBusinessId(businessId)}
                          onMouseLeave={() => setHoveredBusinessId(null)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-base font-bold text-slate-900 leading-tight">
                              {business.name}
                            </h4>
                            {business.rating && (
                              <div className="flex items-center gap-1 ml-3 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                                <svg
                                  className="w-4 h-4 text-yellow-500"
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
                                    (
                                    {business.userRatingsTotal.toLocaleString()}
                                    )
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

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
                              <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
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
                                <span className="font-medium">
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

                          {business.types && business.types.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {business.types
                                .filter(
                                  (type: string) =>
                                    ![
                                      "establishment",
                                      "point_of_interest",
                                      "geocode",
                                    ].includes(type)
                                )
                                .slice(0, 3)
                                .map((type: string, typeIdx: number) => (
                                  <span
                                    key={typeIdx}
                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 capitalize"
                                  >
                                    {type.replace(/_/g, " ")}
                                  </span>
                                ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            {business.priceLevel !== null &&
                              business.priceLevel !== undefined && (
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <span className="font-medium">Price:</span>
                                  <span className="text-green-600 font-bold">
                                    {"$".repeat(business.priceLevel + 1)}
                                  </span>
                                  {business.priceLevel === 0 && (
                                    <span className="text-slate-500">
                                      (Free)
                                    </span>
                                  )}
                                </div>
                              )}

                            {business.businessStatus && (
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                  business.businessStatus === "OPERATIONAL"
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : business.businessStatus ===
                                      "CLOSED_TEMPORARILY"
                                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                                }`}
                              >
                                {business.businessStatus === "OPERATIONAL"
                                  ? "✓ Open"
                                  : business.businessStatus ===
                                    "CLOSED_TEMPORARILY"
                                  ? "⚠ Temporarily Closed"
                                  : "✗ Closed"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Events */}
            {loadingEvents ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
                <div className="flex items-center justify-center gap-3">
                  <svg
                    className="animate-spin h-6 w-6 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-slate-600">Loading events...</span>
                </div>
              </div>
            ) : events.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-purple-600"
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
                    Local Events
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      {events.length}
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl p-5 border border-purple-200/50 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-base font-bold text-slate-900 flex-1 leading-tight">
                            {event.name}
                          </h4>
                          {event.logo && (
                            <img
                              src={event.logo}
                              alt={event.name}
                              className="w-14 h-14 rounded-lg object-cover ml-3 border-2 border-white shadow-sm"
                            />
                          )}
                        </div>

                        {event.start && (
                          <div className="flex items-center gap-2 mb-2 text-xs text-slate-700">
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
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium">
                              {formatDate(event.start)}
                              {event.end && ` - ${formatDate(event.end)}`}
                            </span>
                          </div>
                        )}

                        {event.venue && (
                          <div className="flex items-start gap-2 mb-2 text-xs text-slate-600">
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

                        {latitude && longitude && event.venue && (
                          <div className="flex items-center gap-2 mb-3 text-xs text-slate-600">
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
                            <span className="font-medium">
                              {calculateDistance(
                                latitude,
                                longitude,
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

                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {event.is_free !== null && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                event.is_free
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {event.is_free ? "🆓 Free" : "💰 Paid"}
                            </span>
                          )}

                          {event.online_event && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              🌐 Online
                            </span>
                          )}

                          {event.rating && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              ⭐ {event.rating.toFixed(1)}
                            </span>
                          )}
                        </div>

                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-700 hover:text-purple-800 font-medium inline-flex items-center gap-1 group"
                          >
                            <span>Learn More</span>
                            <svg
                              className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
