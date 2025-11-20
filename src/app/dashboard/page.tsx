"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import PropertyMap from "@/components/PropertyMap";
// import { prisma } from "@/lib/prisma"; // Commented out for MVP testing without database

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

interface Property {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  unitMixFileUrl: string | null;
  amenities: string[];
  propertyTier: string | null;
  residentPersona: string | null;
  profileSummary: string | null;
  nearbyBusinesses?: Array<{
    name: string;
    types: string[];
    rating: number | null;
    userRatingsTotal: number | null;
    vicinity: string;
    placeId: string | null;
    priceLevel: number | null;
    businessStatus: string | null;
    geometry: any | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  start: string | null;
  end: string | null;
  timezone?: string;
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
  types?: string[];
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(
    null
  );
  const [eventsByProperty, setEventsByProperty] = useState<
    Record<string, Event[]>
  >({});
  const [loadingEvents, setLoadingEvents] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    // Load properties from localStorage
    const savedProperties = JSON.parse(
      localStorage.getItem("properties") || "[]"
    );
    setProperties(savedProperties);
  }, []);

  const handleGenerateEvents = async (property: Property) => {
    if (!property.latitude || !property.longitude) {
      alert("Property location is required to generate events");
      return;
    }

    setLoadingEvents((prev) => ({ ...prev, [property.id]: true }));

    try {
      console.log(
        `🔍 [Dashboard] Fetching events for property: ${property.name}`
      );
      console.log(
        `📍 [Dashboard] Location: ${property.latitude}, ${property.longitude}`
      );

      const response = await fetch(
        `/api/events?lat=${property.latitude}&lng=${property.longitude}&radius=10`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      console.log(`📥 [Dashboard] Received events data:`, data);
      console.log(
        `📊 [Dashboard] Number of events: ${data.events?.length || 0}`
      );
      console.log(`📋 [Dashboard] Events:`, data.events);

      setEventsByProperty((prev) => ({
        ...prev,
        [property.id]: data.events || [],
      }));
    } catch (error) {
      console.error("❌ [Dashboard] Error fetching events:", error);
      alert("Failed to fetch events. Please try again.");
    } finally {
      setLoadingEvents((prev) => ({ ...prev, [property.id]: false }));
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

  // TODO: Uncomment below when database is set up
  /*
  async function getProperties() {
    try {
      const properties = await prisma.property.findMany({
        orderBy: { createdAt: "desc" },
      });
      return properties;
    } catch (error) {
      console.error("Error fetching properties:", error);
      return [];
    }
  }
  */

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900">
            Property Dashboard
          </h1>
          <Link
            href="/onboarding"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add New Property
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-zinc-600 mb-4">
              No properties yet. Get started by adding your first property!
            </p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Property
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {properties.map((property: Property) => (
              <div
                key={property.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-8">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-zinc-900 mb-2">
                      {property.name}
                    </h2>
                    <p className="text-lg text-zinc-600">{property.address}</p>
                  </div>

                  {property.propertyTier && (
                    <div className="mb-2">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {property.propertyTier}
                      </span>
                    </div>
                  )}

                  {property.residentPersona && (
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {property.residentPersona}
                      </span>
                    </div>
                  )}

                  {property.profileSummary && (
                    <p className="text-sm text-zinc-700 mb-4 line-clamp-3">
                      {property.profileSummary}
                    </p>
                  )}

                  {property.amenities.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-zinc-600 mb-2">
                        Amenities:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {property.amenities
                          .slice(0, 3)
                          .map((amenity: string) => (
                            <span
                              key={amenity}
                              className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs"
                            >
                              {amenity}
                            </span>
                          ))}
                        {property.amenities.length > 3 && (
                          <span className="px-2 py-1 text-zinc-500 text-xs">
                            +{property.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {property.websiteUrl && (
                    <a
                      href={property.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Visit Website →
                    </a>
                  )}

                  {/* Generate Events Button */}
                  {property.latitude && property.longitude && (
                    <div className="mt-4 mb-4">
                      <button
                        onClick={() => handleGenerateEvents(property)}
                        disabled={loadingEvents[property.id]}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingEvents[property.id]
                          ? "Loading Events..."
                          : "Generate Events"}
                      </button>
                    </div>
                  )}

                  {/* Events Display */}
                  {eventsByProperty[property.id] &&
                    eventsByProperty[property.id].length > 0 && (
                      <div className="mt-6 pt-6 border-t border-zinc-200">
                        <p className="text-sm font-semibold text-zinc-700 mb-4">
                          Local Events ({eventsByProperty[property.id].length}):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                          {eventsByProperty[property.id].map((event) => (
                            <div
                              key={event.id}
                              className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-all"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="text-sm font-semibold text-zinc-900 flex-1">
                                  {event.name}
                                </h4>
                                {event.logo && (
                                  <img
                                    src={event.logo}
                                    alt={event.name}
                                    className="w-12 h-12 rounded object-cover ml-2"
                                  />
                                )}
                              </div>

                              {event.start && (
                                <p className="text-xs text-zinc-700 mb-1 font-medium">
                                  📅 {formatDate(event.start)}
                                  {event.end && ` - ${formatDate(event.end)}`}
                                </p>
                              )}

                              {event.venue && (
                                <p className="text-xs text-zinc-600 mb-1">
                                  📍 {event.venue.name}
                                  {event.venue.address &&
                                    ` - ${event.venue.address}`}
                                </p>
                              )}

                              {property.latitude &&
                                property.longitude &&
                                event.venue && (
                                  <p className="text-xs text-zinc-600 mb-2 font-medium">
                                    📏{" "}
                                    {calculateDistance(
                                      property.latitude,
                                      property.longitude,
                                      event.venue.latitude,
                                      event.venue.longitude
                                    ).toFixed(2)}{" "}
                                    miles away
                                  </p>
                                )}

                              {event.description && (
                                <p className="text-xs text-zinc-600 mb-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
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

                                {event.has_available_tickets !== null && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      event.has_available_tickets
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {event.has_available_tickets
                                      ? "✅ Tickets Available"
                                      : "❌ Sold Out"}
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
                                  className="text-xs text-purple-600 hover:underline mt-2 inline-block"
                                >
                                  Learn More →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Map */}
                  {property.latitude && property.longitude && (
                    <div className="mt-6 pt-6 border-t border-zinc-200">
                      <p className="text-sm font-semibold text-zinc-700 mb-4">
                        Location Map:
                      </p>
                      <PropertyMap
                        propertyName={property.name}
                        propertyAddress={property.address}
                        latitude={property.latitude}
                        longitude={property.longitude}
                        nearbyBusinesses={property.nearbyBusinesses || []}
                        hoveredBusinessId={hoveredBusinessId}
                      />
                    </div>
                  )}

                  {property.nearbyBusinesses &&
                    property.nearbyBusinesses.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-zinc-200">
                        <p className="text-sm font-semibold text-zinc-700 mb-4">
                          Nearby Businesses ({property.nearbyBusinesses.length}
                          ):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                          {property.nearbyBusinesses.map((business, idx) => {
                            const businessId =
                              business.placeId || `business-${idx}`;
                            return (
                              <div
                                key={idx}
                                className={`bg-zinc-50 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                                  hoveredBusinessId === businessId
                                    ? "border-blue-500 bg-blue-100 shadow-lg scale-105"
                                    : "border-zinc-200"
                                }`}
                                onMouseEnter={() =>
                                  setHoveredBusinessId(businessId)
                                }
                                onMouseLeave={() => setHoveredBusinessId(null)}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="text-sm font-semibold text-zinc-900">
                                    {business.name}
                                  </h4>
                                  {business.rating && (
                                    <div className="flex items-center gap-1 ml-2">
                                      <span className="text-yellow-500">
                                        ⭐
                                      </span>
                                      <span className="text-xs font-medium text-zinc-700">
                                        {business.rating.toFixed(1)}
                                      </span>
                                      {business.userRatingsTotal && (
                                        <span className="text-xs text-zinc-500">
                                          (
                                          {business.userRatingsTotal.toLocaleString()}
                                          )
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {business.vicinity && (
                                  <p className="text-xs text-zinc-600 mb-1">
                                    📍 {business.vicinity}
                                  </p>
                                )}

                                {property.latitude &&
                                  property.longitude &&
                                  business.geometry?.location && (
                                    <p className="text-xs text-zinc-600 mb-2 font-medium">
                                      📏{" "}
                                      {calculateDistance(
                                        property.latitude,
                                        property.longitude,
                                        business.geometry.location.lat,
                                        business.geometry.location.lng
                                      ).toFixed(2)}{" "}
                                      miles away
                                    </p>
                                  )}

                                {business.types &&
                                  business.types.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
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
                                        .map(
                                          (type: string, typeIdx: number) => (
                                            <span
                                              key={typeIdx}
                                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs capitalize"
                                            >
                                              {type.replace(/_/g, " ")}
                                            </span>
                                          )
                                        )}
                                    </div>
                                  )}

                                {business.priceLevel !== null &&
                                  business.priceLevel !== undefined && (
                                    <p className="text-xs text-zinc-600">
                                      💰 Price:{" "}
                                      {"$".repeat(business.priceLevel + 1)}
                                      {business.priceLevel === 0 && " (Free)"}
                                    </p>
                                  )}

                                {business.businessStatus && (
                                  <p className="text-xs mt-1">
                                    <span
                                      className={`font-medium ${
                                        business.businessStatus ===
                                        "OPERATIONAL"
                                          ? "text-green-600"
                                          : business.businessStatus ===
                                            "CLOSED_TEMPORARILY"
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {business.businessStatus === "OPERATIONAL"
                                        ? "✓ Open"
                                        : business.businessStatus ===
                                          "CLOSED_TEMPORARILY"
                                        ? "⚠ Temporarily Closed"
                                        : "✗ Closed"}
                                    </span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
