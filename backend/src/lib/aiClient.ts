import { env } from '../config/env';

export type AiSource = 'NVIDIA_AI' | 'RULE_BASED_FALLBACK';

export interface EligibilityRequest {
  applicant: {
    fullName: string;
    monthlyIncome?: number | null;
    employmentStatus?: string | null;
    employerName?: string | null;
    occupants: number;
    hasPets: boolean;
    smoker: boolean;
    notes?: string | null;
  };
  room: {
    name: string;
    monthlyRent: number;
    capacity: number;
    roommatesLimit: number;
    foodEnabled: boolean;
  };
  requiredDocuments: string[];
  providedDocuments: string[];
}

export interface EligibilityResponse {
  source: AiSource;
  score: number;
  scoreLabel: string;
  recommendation: 'STRONG' | 'MODERATE' | 'WEAK' | 'REVIEW';
  reasons: string[];
  warnings: string[];
  missingRequirements: string[];
  model?: string;
  raw?: unknown;
}

export interface DocVerificationRequest {
  applicant: { fullName: string; currentAddress?: string | null; monthlyIncome?: number | null };
  documents: Array<{
    type: string;
    originalName: string;
    // best-effort text the backend may pass (OCR is out of scope here; may be empty)
    extractedText?: string;
  }>;
  requiredDocuments: string[];
}

export interface DocVerificationResponse {
  source: AiSource;
  overallStatus: 'PENDING' | 'VERIFIED' | 'INCONSISTENT' | 'UNREADABLE' | 'FAILED';
  consistencyScore: number;
  extractedFields: Record<string, unknown>;
  inconsistencies: string[];
  missingDocuments: string[];
  notes?: string;
  model?: string;
  raw?: unknown;
}

export interface SummaryResponse {
  source: AiSource;
  summary: string;
  highlights: string[];
  concerns: string[];
  model?: string;
}

export interface MaintenanceClassifyRequest {
  title: string;
  description: string;
}

export interface MaintenanceClassifyResponse {
  source: AiSource;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reasoning: string;
  suggestedActions: string[];
  model?: string;
}

export interface LeaseSummaryResponse {
  source: AiSource;
  summary: string;
  keyPoints: string[];
  obligations: string[];
  model?: string;
}

export interface AssistantRequest {
  question: string;
  context: Record<string, unknown>;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AssistantResponse {
  source: AiSource;
  answer: string;
  model?: string;
}

export interface InsightsRequest {
  metrics: Record<string, unknown>;
}

export interface InsightsResponse {
  source: AiSource;
  insights: string[];
  risks: string[];
  opportunities: string[];
  model?: string;
}

class AiClient {
  private baseUrl = env.ai.serviceUrl.replace(/\/$/, '');

  private async post<T>(pathname: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.ai.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${pathname}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`AI service ${pathname} responded ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async health(): Promise<{ status: string; nvidiaConfigured: boolean } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      if (!res.ok) return null;
      return (await res.json()) as { status: string; nvidiaConfigured: boolean };
    } catch {
      return null;
    }
  }

  eligibility(payload: EligibilityRequest): Promise<EligibilityResponse> {
    return this.post<EligibilityResponse>('/ai/eligibility', payload).catch(() =>
      localEligibilityFallback(payload),
    );
  }

  verifyDocuments(payload: DocVerificationRequest): Promise<DocVerificationResponse> {
    return this.post<DocVerificationResponse>('/ai/verify-documents', payload).catch(() =>
      localDocFallback(payload),
    );
  }

  summarizeApplication(payload: unknown): Promise<SummaryResponse> {
    return this.post<SummaryResponse>('/ai/summarize-application', payload).catch(() => ({
      source: 'RULE_BASED_FALLBACK' as const,
      summary: 'Automated summary unavailable. Please review the application details directly.',
      highlights: [],
      concerns: ['AI summary service unavailable'],
    }));
  }

  classifyMaintenance(payload: MaintenanceClassifyRequest): Promise<MaintenanceClassifyResponse> {
    return this.post<MaintenanceClassifyResponse>('/ai/classify-maintenance', payload).catch(() =>
      localMaintenanceFallback(payload),
    );
  }

  summarizeLease(payload: unknown): Promise<LeaseSummaryResponse> {
    return this.post<LeaseSummaryResponse>('/ai/summarize-lease', payload).catch(() => ({
      source: 'RULE_BASED_FALLBACK' as const,
      summary: 'Lease summary unavailable. Refer to the full lease document.',
      keyPoints: [],
      obligations: [],
    }));
  }

  assistant(payload: AssistantRequest): Promise<AssistantResponse> {
    return this.post<AssistantResponse>('/ai/assistant', payload).catch(() => ({
      source: 'RULE_BASED_FALLBACK' as const,
      answer:
        'The AI assistant is currently unavailable. The data you asked about is shown in the relevant dashboard section.',
    }));
  }

  insights(payload: InsightsRequest): Promise<InsightsResponse> {
    return this.post<InsightsResponse>('/ai/insights', payload).catch(() => ({
      source: 'RULE_BASED_FALLBACK' as const,
      insights: ['AI insight generation unavailable — showing raw metrics only.'],
      risks: [],
      opportunities: [],
    }));
  }
}

// ---------------------------------------------------------------------------
// Last-resort local fallbacks (used only if the AI service itself is down).
// The AI service has its own richer rule-based fallback for NVIDIA outages.
// ---------------------------------------------------------------------------

function localEligibilityFallback(payload: EligibilityRequest): EligibilityResponse {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];
  let score = 50;

  const income = payload.applicant.monthlyIncome ?? 0;
  const rent = payload.room.monthlyRent || 1;
  const ratio = income / rent;
  if (ratio >= 3) {
    score += 25;
    reasons.push(`Income is ${ratio.toFixed(1)}x the rent (healthy).`);
  } else if (ratio >= 2) {
    score += 10;
    reasons.push(`Income is ${ratio.toFixed(1)}x the rent (acceptable).`);
  } else if (income > 0) {
    score -= 15;
    warnings.push(`Income is only ${ratio.toFixed(1)}x the rent (below 2x guideline).`);
  } else {
    warnings.push('No income information provided.');
  }

  const provided = new Set(payload.providedDocuments.map((d) => d.toUpperCase()));
  for (const req of payload.requiredDocuments) {
    if (!provided.has(req.toUpperCase())) missing.push(req);
  }
  if (missing.length === 0) {
    score += 15;
    reasons.push('All required documents provided.');
  } else {
    score -= Math.min(20, missing.length * 7);
  }

  if (payload.applicant.employmentStatus?.toLowerCase().includes('employ')) {
    score += 8;
    reasons.push('Applicant reports being employed.');
  }
  if (payload.applicant.occupants > payload.room.capacity) {
    score -= 15;
    warnings.push(
      `Requested occupants (${payload.applicant.occupants}) exceed room capacity (${payload.room.capacity}).`,
    );
  }
  if (payload.applicant.smoker) warnings.push('Applicant is a smoker.');

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    source: 'RULE_BASED_FALLBACK',
    score,
    scoreLabel: 'Criteria Match',
    recommendation: score >= 75 ? 'STRONG' : score >= 55 ? 'MODERATE' : score >= 40 ? 'REVIEW' : 'WEAK',
    reasons,
    warnings,
    missingRequirements: missing,
  };
}

function localDocFallback(payload: DocVerificationRequest): DocVerificationResponse {
  const providedTypes = new Set(payload.documents.map((d) => d.type.toUpperCase()));
  const missing = payload.requiredDocuments.filter((r) => !providedTypes.has(r.toUpperCase()));
  return {
    source: 'RULE_BASED_FALLBACK',
    overallStatus: missing.length === 0 ? 'PENDING' : 'INCONSISTENT',
    consistencyScore: missing.length === 0 ? 70 : Math.max(20, 70 - missing.length * 15),
    extractedFields: {},
    inconsistencies: [],
    missingDocuments: missing,
    notes: 'Automated document check unavailable; manual verification recommended.',
  };
}

function localMaintenanceFallback(
  payload: MaintenanceClassifyRequest,
): MaintenanceClassifyResponse {
  const text = `${payload.title} ${payload.description}`.toLowerCase();
  const rules: Array<{ kw: string[]; category: string; priority: MaintenanceClassifyResponse['priority'] }> = [
    { kw: ['gas', 'fire', 'smoke', 'flood', 'electric shock', 'sparks', 'burning'], category: 'Safety', priority: 'URGENT' },
    { kw: ['leak', 'water', 'burst', 'pipe', 'overflow', 'no water'], category: 'Plumbing', priority: 'HIGH' },
    { kw: ['no power', 'outage', 'breaker', 'wiring', 'short circuit', 'socket'], category: 'Electrical', priority: 'HIGH' },
    { kw: ['ac', 'air condition', 'heater', 'heating', 'hvac', 'no cooling'], category: 'HVAC', priority: 'MEDIUM' },
    { kw: ['lock', 'door', 'window', 'broken glass', 'security'], category: 'Security', priority: 'HIGH' },
    { kw: ['fridge', 'stove', 'oven', 'washing machine', 'appliance', 'geyser'], category: 'Appliance', priority: 'MEDIUM' },
    { kw: ['paint', 'wall', 'ceiling', 'crack', 'tile', 'floor'], category: 'Structural', priority: 'LOW' },
    { kw: ['pest', 'cockroach', 'rat', 'termite', 'insect', 'bugs'], category: 'Pest Control', priority: 'MEDIUM' },
  ];
  for (const r of rules) {
    if (r.kw.some((k) => text.includes(k))) {
      return {
        source: 'RULE_BASED_FALLBACK',
        category: r.category,
        priority: r.priority,
        reasoning: `Matched keywords for ${r.category}.`,
        suggestedActions: ['Assign appropriate staff', 'Inspect on site', 'Document with photos'],
      };
    }
  }
  return {
    source: 'RULE_BASED_FALLBACK',
    category: 'General',
    priority: 'MEDIUM',
    reasoning: 'No specific category keywords matched.',
    suggestedActions: ['Assign general maintenance staff', 'Contact tenant for details'],
  };
}

export const aiClient = new AiClient();
