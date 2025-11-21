"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadScript } from "@react-google-maps/api";
import PropertyMap from "@/components/PropertyMap";
import EventsMap from "@/components/EventsMap";

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

interface BusinessContact {
  phone: string | null;
  website: string | null;
  address: string | null;
  openingHours: string[] | null;
  googlePlaceId: string | null;
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
  enrichedContact?: BusinessContact | null;
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
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState<"location" | "events">("location");
  const [mapsApiKey, setMapsApiKey] = useState<string>("");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [businessFilter, setBusinessFilter] = useState<
    "All" | "Open" | "Closed"
  >("All");
  const [eventFilter, setEventFilter] = useState<"All" | "Upcoming" | "Past">(
    "All"
  );

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
        const fetchedBusinesses = businessesData.results || [];

        // Step 2.5: Enrich businesses with contact information
        if (fetchedBusinesses.length > 0) {
          try {
            const enrichResponse = await fetch("/api/businesses/enrich", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ businesses: fetchedBusinesses }),
            });

            if (enrichResponse.ok) {
              const enrichedData = await enrichResponse.json();
              setNearbyBusinesses(enrichedData.businesses || fetchedBusinesses);
              console.log(
                `✅ Enriched ${enrichedData.enriched}/${enrichedData.total} businesses with contact info`
              );
            } else {
              // If enrichment fails, still use the businesses without contact info
              setNearbyBusinesses(fetchedBusinesses);
            }
          } catch (error) {
            console.error("Error enriching businesses:", error);
            // If enrichment fails, still use the businesses without contact info
            setNearbyBusinesses(fetchedBusinesses);
          }
        } else {
          setNearbyBusinesses([]);
        }
      }

      // Step 3: Auto-fetch events
      const eventsResponse = await fetch(
        `/api/events?lat=${geocodeData.latitude}&lng=${geocodeData.longitude}&radius=10`
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const fetchedEvents = eventsData.events || [];

        // Step 4: Enrich events with venue contact information
        if (fetchedEvents.length > 0) {
          try {
            const enrichResponse = await fetch("/api/events/enrich", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ events: fetchedEvents }),
            });

            if (enrichResponse.ok) {
              const enrichedData = await enrichResponse.json();
              setEvents(enrichedData.events || fetchedEvents);
              console.log(
                `✅ Enriched ${enrichedData.enriched}/${enrichedData.total} events with venue contact info`
              );
            } else {
              // If enrichment fails, still use the events without contact info
              setEvents(fetchedEvents);
            }
          } catch (error) {
            console.error("Error enriching events:", error);
            // If enrichment fails, still use the events without contact info
            setEvents(fetchedEvents);
          }
        } else {
          setEvents([]);
        }
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
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      const displayMinute = minute.toString().padStart(2, "0");
      return `${month} ${day}, ${displayHour}:${displayMinute} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {mapsApiKey && (
        <LoadScript
          googleMapsApiKey={mapsApiKey}
          onLoad={() => setMapsLoaded(true)}
        >
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">
                    LeaseBoost
                  </h1>
                  <p className="text-slate-600">
                    Discover local events and nearby businesses for your
                    property
                  </p>
                </div>
              </div>
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
                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
                  <div className="border-b border-slate-200">
                    <div className="flex">
                      <button
                        onClick={() => setActiveTab("location")}
                        className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors duration-200 ${
                          activeTab === "location"
                            ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
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
                          Location & Businesses
                          {nearbyBusinesses.length > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              {nearbyBusinesses.length}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab("events")}
                        className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors duration-200 ${
                          activeTab === "events"
                            ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
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
                          Events
                          {events.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              {events.length}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Location Tab Content */}
                  {activeTab === "location" && (
                    <div className="p-6">
                      {/* Header Section */}
                      <div className="mb-8">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-7 h-7 text-white"
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
                            <div>
                              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                Nearby Businesses
                              </h1>
                              <p className="text-slate-600">
                                Local businesses and establishments near your
                                property location
                              </p>
                            </div>
                          </div>

                          {/* Filter Buttons */}
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => setBusinessFilter("All")}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                businessFilter === "All"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              All
                            </button>
                            <button
                              onClick={() => setBusinessFilter("Open")}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                businessFilter === "Open"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              Open
                            </button>
                            <button
                              onClick={() => setBusinessFilter("Closed")}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                businessFilter === "Closed"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              Closed
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Map */}
                      {latitude && longitude && (
                        <div className="mb-8">
                          <PropertyMap
                            propertyName={propertyName || address}
                            propertyAddress={address}
                            latitude={latitude}
                            longitude={longitude}
                            nearbyBusinesses={nearbyBusinesses}
                            hoveredBusinessId={hoveredBusinessId}
                            onBusinessHover={setHoveredBusinessId}
                            apiKey={mapsApiKey}
                          />
                        </div>
                      )}

                      {/* Businesses Table */}
                      {nearbyBusinesses.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full table-fixed">
                            <colgroup>
                              <col className="w-[20%]" />
                              <col className="w-[8%]" />
                              <col className="w-[12%]" />
                              <col className="w-[10%]" />
                              <col className="w-[10%]" />
                              <col className="w-[25%]" />
                              <col className="w-[15%]" />
                            </colgroup>
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Name
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Distance
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Type
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Rating
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Contact
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                              {nearbyBusinesses
                                .filter((business) => {
                                  if (businessFilter === "All") return true;
                                  if (businessFilter === "Open")
                                    return (
                                      business.businessStatus === "OPERATIONAL"
                                    );
                                  if (businessFilter === "Closed")
                                    return (
                                      business.businessStatus !== "OPERATIONAL"
                                    );
                                  return true;
                                })
                                .map((business, idx) => {
                                  const businessId =
                                    business.placeId || `business-${idx}`;
                                  const distance =
                                    latitude &&
                                    longitude &&
                                    business.geometry?.location
                                      ? calculateDistance(
                                          latitude,
                                          longitude,
                                          business.geometry.location.lat,
                                          business.geometry.location.lng
                                        ).toFixed(2) + " mi"
                                      : "N/A";
                                  const businessType =
                                    business.types
                                      ?.filter(
                                        (type: string) =>
                                          ![
                                            "establishment",
                                            "point_of_interest",
                                            "geocode",
                                          ].includes(type)
                                      )[0]
                                      ?.replace(/_/g, " ")
                                      .split(" ")
                                      .map(
                                        (word: string) =>
                                          word.charAt(0).toUpperCase() +
                                          word.slice(1)
                                      )
                                      .join(" ") || "Business";

                                  return (
                                    <tr
                                      key={idx}
                                      className={`transition-colors ${
                                        hoveredBusinessId === businessId
                                          ? "bg-blue-50 border-l-4 border-blue-500"
                                          : "hover:bg-slate-50"
                                      }`}
                                      onMouseEnter={() =>
                                        setHoveredBusinessId(businessId)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredBusinessId(null)
                                      }
                                    >
                                      <td className="px-3 py-2.5">
                                        <a
                                          href="#"
                                          className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate block"
                                          title={business.name}
                                        >
                                          {business.name}
                                        </a>
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 text-sm">
                                        {distance}
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-700 text-sm">
                                        <span
                                          className="truncate block"
                                          title={businessType}
                                        >
                                          {businessType}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">
                                        {business.rating ? (
                                          <div className="flex items-center gap-1">
                                            <svg
                                              className="w-4 h-4 text-yellow-500"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="text-xs font-medium text-slate-900">
                                              {business.rating.toFixed(1)}
                                            </span>
                                            {business.userRatingsTotal && (
                                              <span className="text-xs text-slate-500">
                                                (
                                                {business.userRatingsTotal > 999
                                                  ? Math.floor(
                                                      business.userRatingsTotal /
                                                        1000
                                                    ) + "k"
                                                  : business.userRatingsTotal.toLocaleString()}
                                                )
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-xs">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">
                                        {business.businessStatus ? (
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
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
                                        ) : (
                                          <span className="text-slate-400 text-sm">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {business.enrichedContact ? (
                                          <div className="flex flex-col gap-1 pl-0.5 border-l-2 border-green-200">
                                            {business.enrichedContact.phone && (
                                              <div className="flex items-center gap-1">
                                                <svg
                                                  className="w-3 h-3 text-green-600 shrink-0"
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
                                                <a
                                                  href={`tel:${business.enrichedContact.phone.replace(
                                                    /\s/g,
                                                    ""
                                                  )}`}
                                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium truncate"
                                                  title={
                                                    business.enrichedContact
                                                      .phone
                                                  }
                                                >
                                                  {
                                                    business.enrichedContact
                                                      .phone
                                                  }
                                                </a>
                                              </div>
                                            )}
                                            {business.enrichedContact
                                              .website && (
                                              <div className="flex items-center gap-1">
                                                <svg
                                                  className="w-3 h-3 text-green-600 shrink-0"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                                  />
                                                </svg>
                                                <a
                                                  href={
                                                    business.enrichedContact
                                                      .website
                                                  }
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium truncate"
                                                  title={business.enrichedContact.website.replace(
                                                    /^https?:\/\//,
                                                    ""
                                                  )}
                                                >
                                                  {
                                                    business.enrichedContact.website
                                                      .replace(
                                                        /^https?:\/\//,
                                                        ""
                                                      )
                                                      .split("/")[0]
                                                  }
                                                </a>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 text-xs">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 whitespace-nowrap">
                                        <div className="flex items-center gap-0.5">
                                          <button
                                            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                            title="View Details"
                                          >
                                            <svg
                                              className="w-3.5 h-3.5 text-slate-900"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                              strokeWidth={2}
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                              />
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                              />
                                            </svg>
                                          </button>
                                          <button
                                            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                            title="Directions"
                                          >
                                            <svg
                                              className="w-3.5 h-3.5 text-slate-900"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                              strokeWidth={2}
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                              />
                                            </svg>
                                          </button>
                                          <button
                                            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                            title="Save"
                                          >
                                            <svg
                                              className="w-3.5 h-3.5 text-slate-900"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                              strokeWidth={2}
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                              />
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Load More Button */}
                      {nearbyBusinesses.length > 0 && (
                        <div className="mt-8 flex justify-center">
                          <button className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                            Load More
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Events Tab Content */}
                  {activeTab === "events" && (
                    <div className="p-6">
                      {loadingEvents ? (
                        <div className="p-12 text-center">
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
                            <span className="text-slate-600">
                              Loading events...
                            </span>
                          </div>
                        </div>
                      ) : events.length > 0 ? (
                        <>
                          {/* Header Section */}
                          <div className="mb-8">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-7 h-7 text-white"
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
                                </div>
                                <div>
                                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                    Local Events
                                  </h1>
                                  <p className="text-slate-600">
                                    Upcoming events and activities near your
                                    property location
                                  </p>
                                </div>
                              </div>

                              {/* Filter Buttons */}
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => setEventFilter("All")}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    eventFilter === "All"
                                      ? "bg-purple-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  All
                                </button>
                                <button
                                  onClick={() => setEventFilter("Upcoming")}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    eventFilter === "Upcoming"
                                      ? "bg-purple-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Upcoming
                                </button>
                                <button
                                  onClick={() => setEventFilter("Past")}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    eventFilter === "Past"
                                      ? "bg-purple-600 text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  Past
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Events Map */}
                          {latitude && longitude && (
                            <div className="mb-8">
                              <EventsMap
                                propertyLatitude={latitude}
                                propertyLongitude={longitude}
                                events={events}
                                hoveredEventId={hoveredEventId}
                                onEventHover={setHoveredEventId}
                                apiKey={mapsApiKey}
                              />
                            </div>
                          )}

                          {/* Events Table */}
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full table-fixed">
                              <colgroup>
                                <col className="w-[22%]" />
                                <col className="w-[12%]" />
                                <col className="w-[18%]" />
                                <col className="w-[8%]" />
                                <col className="w-[30%]" />
                                <col className="w-[10%]" />
                              </colgroup>
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Event Name
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Date & Time
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Venue
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Distance
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Contact
                                  </th>
                                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-200">
                                {events
                                  .filter((event) => {
                                    if (eventFilter === "All") return true;
                                    if (!event.start)
                                      return eventFilter === "Upcoming";
                                    const eventDate = new Date(event.start);
                                    const now = new Date();
                                    if (eventFilter === "Upcoming")
                                      return eventDate >= now;
                                    if (eventFilter === "Past")
                                      return eventDate < now;
                                    return true;
                                  })
                                  .map((event) => {
                                    const distance =
                                      latitude && longitude && event.venue
                                        ? calculateDistance(
                                            latitude,
                                            longitude,
                                            event.venue.latitude,
                                            event.venue.longitude
                                          ).toFixed(2) + " mi"
                                        : "N/A";

                                    return (
                                      <tr
                                        key={event.id}
                                        className={`transition-colors ${
                                          hoveredEventId === event.id
                                            ? "bg-purple-50 border-l-4 border-purple-500"
                                            : "hover:bg-slate-50"
                                        }`}
                                        onMouseEnter={() =>
                                          setHoveredEventId(event.id)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredEventId(null)
                                        }
                                      >
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2">
                                            {event.logo && (
                                              <img
                                                src={event.logo}
                                                alt={event.name}
                                                className="w-8 h-8 rounded-lg object-cover shrink-0"
                                              />
                                            )}
                                            <a
                                              href={event.url || "#"}
                                              target={
                                                event.url ? "_blank" : undefined
                                              }
                                              rel={
                                                event.url
                                                  ? "noopener noreferrer"
                                                  : undefined
                                              }
                                              className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate"
                                              title={event.name}
                                            >
                                              {event.name}
                                            </a>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 text-xs">
                                          {formatDate(event.start)}
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-700">
                                          {event.venue ? (
                                            <div>
                                              <div
                                                className="font-medium text-sm truncate"
                                                title={event.venue.name}
                                              >
                                                {event.venue.name}
                                              </div>
                                              {event.venue.address && (
                                                <div
                                                  className="text-xs text-slate-500 truncate"
                                                  title={event.venue.address}
                                                >
                                                  {event.venue.address}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 text-xs">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 text-xs">
                                          {distance}
                                        </td>
                                        <td className="px-5 py-4">
                                          {event.venueContact ? (
                                            <div className="flex flex-col gap-3 pl-3 border-l-[3px] border-purple-300">
                                              {event.venueContact.phone && (
                                                <div className="flex items-center gap-3">
                                                  <svg
                                                    className="w-5 h-5 text-purple-600 shrink-0"
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
                                                  <a
                                                    href={`tel:${event.venueContact.phone.replace(
                                                      /\s/g,
                                                      ""
                                                    )}`}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium truncate leading-relaxed"
                                                    title={
                                                      event.venueContact.phone
                                                    }
                                                  >
                                                    {event.venueContact.phone}
                                                  </a>
                                                </div>
                                              )}
                                              {event.venueContact.website && (
                                                <div className="flex items-center gap-3">
                                                  <svg
                                                    className="w-5 h-5 text-purple-600 shrink-0"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                                                    />
                                                  </svg>
                                                  <a
                                                    href={
                                                      event.venueContact.website
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium truncate leading-relaxed"
                                                    title={event.venueContact.website.replace(
                                                      /^https?:\/\//,
                                                      ""
                                                    )}
                                                  >
                                                    {
                                                      event.venueContact.website
                                                        .replace(
                                                          /^https?:\/\//,
                                                          ""
                                                        )
                                                        .split("/")[0]
                                                    }
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 text-sm">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          <div className="flex items-center gap-0.5">
                                            <button
                                              className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                              title="View Details"
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-slate-900"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                />
                                              </svg>
                                            </button>
                                            {event.url && (
                                              <button
                                                onClick={() =>
                                                  window.open(
                                                    event.url || "#",
                                                    "_blank"
                                                  )
                                                }
                                                className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                                title="Open Event"
                                              >
                                                <svg
                                                  className="w-3.5 h-3.5 text-slate-900"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                  strokeWidth={2}
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                              </button>
                                            )}
                                            <button
                                              className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                                              title="Save"
                                            >
                                              <svg
                                                className="w-3.5 h-3.5 text-slate-900"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                strokeWidth={2}
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                                />
                                              </svg>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>

                          {/* Load More Button */}
                          <div className="mt-8 flex justify-center">
                            <button className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                              Load More
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-12 text-center text-slate-500">
                          <p>No events found for this location.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
