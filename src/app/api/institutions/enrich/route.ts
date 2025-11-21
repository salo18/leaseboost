import { NextRequest, NextResponse } from "next/server";

interface EnrichedContact {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  twitter: string | null;
  confidence: number | null;
  sources: number | null;
}

interface Institution {
  id: string;
  name: string;
  contact: string;
  domain?: string;
  enrichedContact?: EnrichedContact | null;
}

/**
 * Enriches institutions with contact information using Hunter.io API
 *
 * Hunter.io can:
 * - Find email addresses for people at companies
 * - Get company information and domains
 * - Verify email addresses
 * - Get phone numbers and social profiles
 */
export async function POST(request: NextRequest) {
  console.log("[Enrich API] POST /api/institutions/enrich called");

  try {
    const body = await request.json();
    console.log("[Enrich API] Request body received:", {
      institutionsCount: body.institutions?.length || 0,
      limit: body.limit,
      institutionIds: body.institutionIds,
    });

    const { institutions, limit = 2, institutionIds } = body;

    if (!institutions || !Array.isArray(institutions)) {
      console.error(
        "[Enrich API] Invalid request: institutions array missing or not an array"
      );
      return NextResponse.json(
        { error: "Institutions array is required" },
        { status: 400 }
      );
    }

    const hunterApiKey = process.env.HUNTER_IO_API_KEY;

    if (!hunterApiKey) {
      return NextResponse.json(
        {
          error:
            "Hunter.io API key not configured. Add HUNTER_IO_API_KEY to your .env file.",
        },
        { status: 500 }
      );
    }

    // Filter institutions to enrich
    // If institutionIds provided, only enrich those specific ones
    // Otherwise, enrich up to 'limit' institutions that haven't been enriched yet
    let institutionsToEnrich = institutions;

    if (institutionIds && Array.isArray(institutionIds)) {
      // Enrich specific institutions by ID
      institutionsToEnrich = institutions.filter((inst: Institution) =>
        institutionIds.includes(inst.id)
      );
    } else {
      // Only enrich institutions that haven't been enriched yet
      institutionsToEnrich = institutions.filter(
        (inst: Institution) => !inst.enrichedContact?.email
      );
      // Limit to specified number (default 2)
      institutionsToEnrich = institutionsToEnrich.slice(0, limit);
    }

    if (institutionsToEnrich.length === 0) {
      return NextResponse.json({
        institutions,
        enriched: 0,
        total: institutions.length,
        message:
          "No institutions to enrich. All institutions already have contact information or no matching institutions found.",
      });
    }

    // Enrich each institution with contact information (limited batch)
    const enrichedInstitutions = await Promise.all(
      institutionsToEnrich.map(async (institution: Institution) => {
        try {
          // Extract domain from institution name or use provided domain
          const domain =
            institution.domain || extractDomainFromName(institution.name);

          if (!domain) {
            return {
              ...institution,
              enrichedContact: null,
              error: "Could not determine domain",
            };
          }

          // Try to find the person's email using Hunter.io
          // Format: firstname.lastname@domain.com or firstname@domain.com
          const contactName = institution.contact;
          const nameParts = contactName.split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          // Method 1: Search for person's email at the company
          let emailResult = null;
          if (firstName && domain) {
            try {
              const emailSearchUrl = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(
                domain
              )}&first_name=${encodeURIComponent(
                firstName
              )}&last_name=${encodeURIComponent(
                lastName
              )}&api_key=${hunterApiKey}`;

              const emailResponse = await fetch(emailSearchUrl);
              const emailData = await emailResponse.json();

              if (emailData.data && emailData.data.email) {
                emailResult = {
                  email: emailData.data.email,
                  confidence: emailData.data.confidence || null,
                  sources: emailData.data.sources || null,
                };
              }
            } catch (error) {
              console.error(`Error finding email for ${contactName}:`, error);
            }
          }

          // Method 2: Get company information and domain verification
          let companyInfo = null;
          try {
            const domainSearchUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
              domain
            )}&api_key=${hunterApiKey}`;

            const domainResponse = await fetch(domainSearchUrl);
            const domainData = await domainResponse.json();

            if (domainData.data) {
              companyInfo = {
                domain: domainData.data.domain || null,
                emails: domainData.data.emails?.slice(0, 5) || [], // Top 5 emails
                linkedin: domainData.data.linkedin || null,
                twitter: domainData.data.twitter || null,
                facebook: domainData.data.facebook || null,
                phone: domainData.data.phone || null,
                company: domainData.data.company || null,
              };
            }
          } catch (error) {
            console.error(`Error getting company info for ${domain}:`, error);
          }

          // Method 3: Verify email if we found one
          let verifiedEmail = null;
          if (emailResult?.email) {
            try {
              const verifyUrl = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
                emailResult.email
              )}&api_key=${hunterApiKey}`;

              const verifyResponse = await fetch(verifyUrl);
              const verifyData = await verifyResponse.json();

              if (verifyData.data) {
                verifiedEmail = {
                  email: verifyData.data.email,
                  result: verifyData.data.result, // 'deliverable', 'undeliverable', 'risky', 'unknown'
                  score: verifyData.data.score, // 0-100
                  sources: verifyData.data.sources || [],
                };
              }
            } catch (error) {
              console.error(
                `Error verifying email ${emailResult.email}:`,
                error
              );
            }
          }

          const enrichedContact: EnrichedContact = {
            email: emailResult?.email || verifiedEmail?.email || null,
            phone: companyInfo?.phone || null,
            linkedin: companyInfo?.linkedin || null,
            twitter: companyInfo?.twitter || null,
            confidence: emailResult?.confidence || null,
            sources: emailResult?.sources || null,
          };

          console.log(`[Enrich API] Institution: ${institution.name}`);
          console.log(`[Enrich API] Email result:`, emailResult);
          console.log(`[Enrich API] Company info:`, companyInfo);
          console.log(`[Enrich API] Verified email:`, verifiedEmail);
          console.log(`[Enrich API] Final enriched contact:`, enrichedContact);

          return {
            ...institution,
            enrichedContact,
            companyInfo: companyInfo
              ? {
                  domain: companyInfo.domain,
                  company: companyInfo.company,
                  phone: companyInfo.phone,
                  linkedin: companyInfo.linkedin,
                  twitter: companyInfo.twitter,
                  facebook: companyInfo.facebook,
                  emails: companyInfo.emails,
                }
              : null,
            emailVerification: verifiedEmail,
          };
        } catch (error) {
          console.error(
            `Error enriching institution ${institution.id}:`,
            error
          );
          return {
            ...institution,
            enrichedContact: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Merge enriched results back into full institutions array
    const enrichedMap = new Map(
      enrichedInstitutions.map((inst) => [inst.id, inst])
    );

    const allInstitutions = institutions.map((inst: Institution) => {
      const enriched = enrichedMap.get(inst.id);
      return enriched || inst;
    });

    const enrichedCount = enrichedInstitutions.filter(
      (inst) => inst.enrichedContact?.email !== null
    ).length;

    const remainingToEnrich = allInstitutions.filter(
      (inst: Institution) => !inst.enrichedContact?.email
    ).length;

    console.log(`[Enrich API] Summary:`);
    console.log(`[Enrich API] - Processed: ${enrichedInstitutions.length}`);
    console.log(`[Enrich API] - Enriched with email: ${enrichedCount}`);
    console.log(`[Enrich API] - Remaining to enrich: ${remainingToEnrich}`);
    console.log(
      `[Enrich API] - All institutions:`,
      JSON.stringify(allInstitutions, null, 2)
    );

    return NextResponse.json({
      institutions: allInstitutions,
      enriched: enrichedCount,
      processed: enrichedInstitutions.length,
      total: allInstitutions.length,
      remaining: remainingToEnrich,
      creditsUsed: enrichedInstitutions.length, // Each institution uses 1 credit
    });
  } catch (error) {
    console.error("Error enriching institutions:", error);
    return NextResponse.json(
      { error: "Failed to enrich institutions" },
      { status: 500 }
    );
  }
}

/**
 * Extract domain from institution name
 * This is a simple heuristic - you may want to enhance this
 */
function extractDomainFromName(name: string): string | null {
  // Common domain mappings for well-known institutions
  const domainMap: Record<string, string> = {
    "Naval Base San Diego": "navy.mil",
    Qualcomm: "qualcomm.com",
    "UC San Diego Health": "health.ucsd.edu",
    "UC San Diego": "ucsd.edu",
    "San Diego State University": "sdsu.edu",
    "University of California San Diego": "ucsd.edu",
  };

  // Check direct mapping first
  if (domainMap[name]) {
    return domainMap[name];
  }

  // Try to extract domain from common patterns
  // For example: "Company Name" -> "companyname.com"
  // This is a simple heuristic - you may want to use a more sophisticated approach

  // For now, return null if no mapping found
  // In production, you might want to:
  // 1. Use Google Places API to get website
  // 2. Use Clearbit or similar service
  // 3. Have a database of known institutions

  return null;
}
