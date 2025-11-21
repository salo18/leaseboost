"use client";

import { useState } from "react";

interface Institution {
  id: string;
  name: string;
  distance: string;
  relevance: string;
  contact: string;
  status: "New" | "Contacted" | "In Discussions";
}

const mockInstitutions: Institution[] = [
  {
    id: "1",
    name: "Naval Base San Diego",
    distance: "4.2 mi",
    relevance: "Stable employment base",
    contact: "Commander James Riley",
    status: "In Discussions",
  },
  {
    id: "2",
    name: "Qualcomm",
    distance: "5.8 mi",
    relevance: "Large tech workforce nearby",
    contact: "Michael Chen",
    status: "Contacted",
  },
  {
    id: "3",
    name: "UC San Diego Health",
    distance: "2.1 mi",
    relevance: "Major healthcare employer",
    contact: "Sarah Johnson",
    status: "New",
  },
];

type FilterType = "All" | "Archive" | "Deleted";

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterType>("All");
  const [institutions, setInstitutions] =
    useState<Institution[]>(mockInstitutions);
  const [statuses, setStatuses] = useState<
    Record<string, Institution["status"]>
  >(
    mockInstitutions.reduce((acc, inst) => {
      acc[inst.id] = inst.status;
      return acc;
    }, {} as Record<string, Institution["status"]>)
  );

  const handleStatusChange = (id: string, newStatus: Institution["status"]) => {
    setStatuses((prev) => ({ ...prev, [id]: newStatus }));
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
                  Target Institutions
                </h1>
                <p className="text-slate-600">
                  Nearby employers and universities for potential partnerships
                  and housing programs.
                </p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("All")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "All"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("Archive")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "Archive"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Archive (0)
              </button>
              <button
                onClick={() => setFilter("Deleted")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "Deleted"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Deleted (0)
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Relevance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      Status
                      <svg
                        className="w-3 h-3 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {institutions.map((institution) => (
                  <tr
                    key={institution.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href="#"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {institution.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {institution.distance}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {institution.relevance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href="#"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {institution.contact}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={statuses[institution.id] || institution.status}
                        onChange={(e) =>
                          handleStatusChange(
                            institution.id,
                            e.target.value as Institution["status"]
                          )
                        }
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Discussions">In Discussions</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {/* Email/Message Button */}
                        <button
                          className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title="Email/Message"
                        >
                          <svg
                            className="w-4 h-4 text-slate-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </button>

                        {/* Refresh Button */}
                        <button
                          className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title="Refresh"
                        >
                          <svg
                            className="w-4 h-4 text-slate-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>

                        {/* Document Button */}
                        <button
                          className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title="Document"
                        >
                          <svg
                            className="w-4 h-4 text-slate-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </button>

                        {/* Archive Button */}
                        <button
                          className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title="Archive"
                        >
                          <svg
                            className="w-4 h-4 text-slate-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                            />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4 text-slate-900"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Load More Button */}
        <div className="mt-8 flex justify-center">
          <button className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
