import { z } from "zod";

import {
  SearchResultSchema,
  type SearchResult,
} from "@/lib/sales/mission-schema";

export const SearchProviderRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  countryOrLocale: z.string().trim().min(1).max(500),
  freshnessWindowDays: z.number().int().positive().max(3650),
  resultLimit: z.number().int().positive().max(100),
  missionRunId: z.string().min(1),
});

export type SearchProviderRequest = z.infer<typeof SearchProviderRequestSchema>;

export interface SearchProvider {
  search(request: SearchProviderRequest): Promise<readonly SearchResult[]>;
}

export function parseSearchResults(results: readonly SearchResult[]): SearchResult[] {
  return results.flatMap((result) => {
    const parsed = SearchResultSchema.safeParse(result);
    return parsed.success ? [parsed.data] : [];
  });
}
