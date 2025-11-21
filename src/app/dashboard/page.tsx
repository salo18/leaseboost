"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { LoadScript } from "@react-google-maps/api";
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
  const [mapsApiKey, setMapsApiKey] = useState<string>("");
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Fetch Maps API key and load script once
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
          setMapsApiKey(data.apiKey);
        } else if (data.error) {
          console.error("Map config error:", data.error);
        }
      })
      .catch((error) => {
        console.error("Error fetching map config:", error);
      });
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {mapsApiKey && (
        <LoadScript
          googleMapsApiKey={mapsApiKey}
          onLoad={() => setMapsLoaded(true)}
        >
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Property Dashboard
                </h1>
                <p className="text-slate-600">
                  Manage your properties and discover local events
                </p>
              </div>
              <Link
                href="/onboarding"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium flex items-center gap-2"
              >
                <span>+</span>
                <span>Add New Property</span>
              </Link>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-16 text-center border border-slate-200">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-10 h-10 text-blue-600"
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
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">
                    No properties yet
                  </h2>
                  <p className="text-slate-600 mb-8">
                    Get started by adding your first property to begin
                    discovering local events and nearby businesses.
                  </p>
                  <Link
                    href="/onboarding"
                    className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                  >
                    Add Your First Property
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {properties.map((property: Property) => (
                  <div
                    key={property.id}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-200"
                  >
                    <div className="p-8">
                      {/* Property Header */}
                      <div className="mb-6 pb-6 border-b border-slate-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">
                              {property.name}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-600">
                              <svg
                                className="w-5 h-5"
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
                              <p className="text-lg">{property.address}</p>
                            </div>
                          </div>
                          {property.websiteUrl && (
                            <a
                              href={property.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <span>Visit Site</span>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {property.propertyTier && (
                            <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                              {property.propertyTier}
                            </span>
                          )}
                          {property.residentPersona && (
                            <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                              {property.residentPersona}
                            </span>
                          )}
                        </div>

                        {property.profileSummary && (
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {property.profileSummary}
                          </p>
                        )}
                      </div>

                      {/* Amenities */}
                      {property.amenities.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Amenities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {property.amenities
                              .slice(0, 6)
                              .map((amenity: string) => (
                                <span
                                  key={amenity}
                                  className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200"
                                >
                                  {amenity}
                                </span>
                              ))}
                            {property.amenities.length > 6 && (
                              <span className="px-3 py-1.5 text-slate-500 text-xs font-medium">
                                +{property.amenities.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Generate Events Button */}
                      {property.latitude && property.longitude && (
                        <div className="mb-6">
                          <button
                            onClick={() => handleGenerateEvents(property)}
                            disabled={loadingEvents[property.id]}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center gap-2"
                          >
                            {loadingEvents[property.id] ? (
                              <>
                                <svg
                                  className="animate-spin h-5 w-5"
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
                                <span>Loading Events...</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-5 h-5"
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
                                <span>Generate Events</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Events Display */}
                      {eventsByProperty[property.id] &&
                        eventsByProperty[property.id].length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
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
                                  {eventsByProperty[property.id].length}
                                </span>
                              </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                              {eventsByProperty[property.id].map((event) => (
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
                                        {event.end &&
                                          ` - ${formatDate(event.end)}`}
                                      </span>
                                    </div>
                                  )}

                                  {event.venue && (
                                    <div className="flex items-start gap-2 mb-2 text-xs text-slate-600">
                                      <svg
                                        className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0"
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

                                  {property.latitude &&
                                    property.longitude &&
                                    event.venue && (
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
                                            property.latitude,
                                            property.longitude,
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
                                      className="text-xs text-purple-700 hover:text-purple-800 font-medium mt-3 inline-flex items-center gap-1 group"
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
                        )}

                      {/* Map */}
                      {property.latitude && property.longitude && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
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
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                              />
                            </svg>
                            Location Map
                          </h3>
                          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <PropertyMap
                              propertyName={property.name}
                              propertyAddress={property.address}
                              latitude={property.latitude}
                              longitude={property.longitude}
                              nearbyBusinesses={property.nearbyBusinesses || []}
                              hoveredBusinessId={hoveredBusinessId}
                              apiKey={mapsApiKey}
                            />
                          </div>
                        </div>
                      )}

                      {property.nearbyBusinesses &&
                        property.nearbyBusinesses.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
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
                                {property.nearbyBusinesses.length}
                              </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                              {property.nearbyBusinesses.map(
                                (business, idx) => {
                                  const businessId =
                                    business.placeId || `business-${idx}`;
                                  return (
                                    <div
                                      key={idx}
                                      className={`bg-white rounded-xl p-5 border-2 transition-all duration-200 cursor-pointer ${
                                        hoveredBusinessId === businessId
                                          ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
                                          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                      }`}
                                      onMouseEnter={() =>
                                        setHoveredBusinessId(businessId)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredBusinessId(null)
                                      }
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

                                      {property.latitude &&
                                        property.longitude &&
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
                                                property.latitude,
                                                property.longitude,
                                                business.geometry.location.lat,
                                                business.geometry.location.lng
                                              ).toFixed(2)}{" "}
                                              miles away
                                            </span>
                                          </div>
                                        )}

                                      {business.types &&
                                        business.types.length > 0 && (
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
                                              .map(
                                                (
                                                  type: string,
                                                  typeIdx: number
                                                ) => (
                                                  <span
                                                    key={typeIdx}
                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 capitalize"
                                                  >
                                                    {type.replace(/_/g, " ")}
                                                  </span>
                                                )
                                              )}
                                          </div>
                                        )}

                                      <div className="flex items-center gap-3 flex-wrap">
                                        {business.priceLevel !== null &&
                                          business.priceLevel !== undefined && (
                                            <div className="flex items-center gap-1 text-xs text-slate-600">
                                              <span className="font-medium">
                                                Price:
                                              </span>
                                              <span className="text-green-600 font-bold">
                                                {"$".repeat(
                                                  business.priceLevel + 1
                                                )}
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
                                              business.businessStatus ===
                                              "OPERATIONAL"
                                                ? "bg-green-50 text-green-700 border border-green-200"
                                                : business.businessStatus ===
                                                  "CLOSED_TEMPORARILY"
                                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                                : "bg-red-50 text-red-700 border border-red-200"
                                            }`}
                                          >
                                            {business.businessStatus ===
                                            "OPERATIONAL"
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
                                }
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </LoadScript>
      )}
      {!mapsApiKey && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
            <p className="text-slate-500">Loading maps...</p>
          </div>
        </div>
      )}
    </div>
  );
}
