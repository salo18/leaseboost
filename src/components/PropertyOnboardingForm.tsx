"use client";

import { useState } from "react";

interface FormData {
  propertyName: string;
  propertyAddress: string;
  websiteUrl: string;
  unitMixFile: File | null;
  amenities: string[];
  newAmenity: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export default function PropertyOnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    propertyName: "",
    propertyAddress: "",
    websiteUrl: "",
    unitMixFile: null,
    amenities: [],
    newAmenity: "",
  });
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(
    null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { number: 1, title: "Property Information" },
    { number: 2, title: "Location" },
    { number: 3, title: "Unit Mix & Amenities" },
    { number: 4, title: "Review & Submit" },
  ];

  const handleGeocode = async () => {
    if (!formData.propertyAddress.trim()) {
      setError("Please enter a property address");
      return;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: formData.propertyAddress }),
      });

      if (!response.ok) {
        throw new Error("Geocoding failed");
      }

      const data = await response.json();
      setGeocodeResult({ latitude: data.latitude, longitude: data.longitude });
    } catch (err) {
      setError(
        "Failed to geocode address. Please check the address and try again."
      );
      setGeocodeResult(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddAmenity = () => {
    if (
      formData.newAmenity.trim() &&
      !formData.amenities.includes(formData.newAmenity.trim())
    ) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, formData.newAmenity.trim()],
        newAmenity: "",
      });
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((a) => a !== amenity),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, unitMixFile: e.target.files[0] });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    console.log("📤 [Form] Starting property submission...");
    console.log("📤 [Form] Form data:", {
      propertyName: formData.propertyName,
      propertyAddress: formData.propertyAddress,
      websiteUrl: formData.websiteUrl,
      amenities: formData.amenities,
      hasGeocode: !!geocodeResult,
      geocodeResult,
      hasFile: !!formData.unitMixFile,
    });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("propertyName", formData.propertyName);
      formDataToSend.append("propertyAddress", formData.propertyAddress);
      formDataToSend.append("websiteUrl", formData.websiteUrl);
      formDataToSend.append("amenities", JSON.stringify(formData.amenities));

      if (geocodeResult) {
        formDataToSend.append("latitude", geocodeResult.latitude.toString());
        formDataToSend.append("longitude", geocodeResult.longitude.toString());
        console.log("📍 [Form] Adding coordinates:", {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
        });
      } else {
        console.warn(
          "⚠️ [Form] No geocode result - nearby businesses won't be fetched"
        );
      }

      if (formData.unitMixFile) {
        formDataToSend.append("unitMixFile", formData.unitMixFile);
        console.log("📎 [Form] Adding file:", formData.unitMixFile.name);
      }

      console.log("🌐 [Form] Sending request to /api/properties...");
      const response = await fetch("/api/properties", {
        method: "POST",
        body: formDataToSend,
      });

      console.log("📥 [Form] Response status:", response.status);
      console.log("📥 [Form] Response OK:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ [Form] API Error:", errorData);
        throw new Error(errorData.error || "Failed to create property");
      }

      const result = await response.json();
      console.log("✅ [Form] Success! Response:", {
        success: result.success,
        propertyId: result.property?.id,
        nearbyBusinessesCount: result.property?.nearbyBusinesses?.length || 0,
        nearbyBusinesses: result.property?.nearbyBusinesses,
      });

      // Save to localStorage for MVP testing
      const savedProperties = JSON.parse(
        localStorage.getItem("properties") || "[]"
      );
      const newProperty = {
        id: result.property.id,
        name: formData.propertyName,
        address: formData.propertyAddress,
        latitude: geocodeResult?.latitude || null,
        longitude: geocodeResult?.longitude || null,
        websiteUrl: formData.websiteUrl || null,
        unitMixFileUrl: result.property.unitMixFileUrl || null,
        amenities: formData.amenities,
        propertyTier: result.property.propertyTier,
        residentPersona: result.property.residentPersona,
        profileSummary: result.property.profileSummary,
        nearbyBusinesses: result.property.nearbyBusinesses || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savedProperties.unshift(newProperty); // Add to beginning
      localStorage.setItem("properties", JSON.stringify(savedProperties));

      // Redirect to dashboard or success page
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit property"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 2 && !geocodeResult) {
      setError("Please geocode the address before proceeding");
      return;
    }
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Progress Steps */}
          <div className="border-b border-zinc-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step.number
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {currentStep > step.number ? "✓" : step.number}
                    </div>
                    <span className="mt-2 text-xs font-medium text-zinc-600 hidden sm:block">
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        currentStep > step.number
                          ? "bg-blue-600"
                          : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Step 1: Property Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Property Information
                </h2>
                <div>
                  <label
                    htmlFor="propertyName"
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    Property Name *
                  </label>
                  <input
                    type="text"
                    id="propertyName"
                    value={formData.propertyName}
                    onChange={(e) =>
                      setFormData({ ...formData, propertyName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="e.g., Sunset Apartments"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="websiteUrl"
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    Website URL
                  </label>
                  <input
                    type="url"
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, websiteUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Property Location
                </h2>
                <div>
                  <label
                    htmlFor="propertyAddress"
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    Property Address *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          propertyAddress: e.target.value,
                        })
                      }
                      className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="123 Main St, City, State ZIP"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={isGeocoding || !formData.propertyAddress.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                    >
                      {isGeocoding ? "Geocoding..." : "Geocode"}
                    </button>
                  </div>
                  {geocodeResult && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      ✓ Address geocoded successfully
                      <br />
                      Coordinates: {geocodeResult.latitude.toFixed(6)},{" "}
                      {geocodeResult.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Unit Mix & Amenities */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Unit Mix & Amenities
                </h2>
                <div>
                  <label
                    htmlFor="unitMixFile"
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    Unit Mix File (Excel/CSV) - Optional
                  </label>
                  <input
                    type="file"
                    id="unitMixFile"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                  {formData.unitMixFile && (
                    <p className="mt-2 text-sm text-zinc-600">
                      Selected: {formData.unitMixFile.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="amenities"
                    className="block text-sm font-medium text-zinc-700 mb-2"
                  >
                    Amenities
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      id="amenities"
                      value={formData.newAmenity}
                      onChange={(e) =>
                        setFormData({ ...formData, newAmenity: e.target.value })
                      }
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleAddAmenity())
                      }
                      className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      placeholder="e.g., Swimming Pool, Gym, Parking"
                    />
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  {formData.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {amenity}
                          <button
                            type="button"
                            onClick={() => handleRemoveAmenity(amenity)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-zinc-900">
                  Review & Submit
                </h2>
                <div className="bg-zinc-50 rounded-lg p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-zinc-700">
                      Property Name
                    </h3>
                    <p className="text-zinc-900">{formData.propertyName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-700">Address</h3>
                    <p className="text-zinc-900">{formData.propertyAddress}</p>
                    {geocodeResult && (
                      <p className="text-sm text-zinc-600 mt-1">
                        Coordinates: {geocodeResult.latitude.toFixed(6)},{" "}
                        {geocodeResult.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                  {formData.websiteUrl && (
                    <div>
                      <h3 className="font-semibold text-zinc-700">
                        Website URL
                      </h3>
                      <p className="text-zinc-900">{formData.websiteUrl}</p>
                    </div>
                  )}
                  {formData.unitMixFile && (
                    <div>
                      <h3 className="font-semibold text-zinc-700">
                        Unit Mix File
                      </h3>
                      <p className="text-zinc-900">
                        {formData.unitMixFile.name}
                      </p>
                    </div>
                  )}
                  {formData.amenities.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-zinc-700">Amenities</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>AI Processing:</strong> After submission, our AI
                    will analyze your property to classify it
                    (Luxury/Mid/Affordable), identify the ideal resident
                    persona, and create a property profile for your dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !formData.propertyName ||
                    !formData.propertyAddress
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Property"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
