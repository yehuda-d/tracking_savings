import { useQuery } from '@tanstack/react-query';

import type { MonthlyYield } from '@/lib/fundYield';

/**
 * Official Gemel-Net data (Capital Market Authority) on data.gov.il.
 * Public CKAN API, no key, CORS open. The "2024 until today" resource is looked up
 * at runtime so a new resource id doesn't break the app.
 */
const API = 'https://data.gov.il/api/3/action';
const PACKAGE = 'gemelnet';
const FALLBACK_RESOURCE = 'a30dcbea-a1d2-482c-ae29-8f781f5025fb';

export interface FundSearchResult {
  fundId: number;
  name: string;
  manager: string;
  classification: string;
}

async function ckan<T>(action: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${API}/${action}?${qs}`);
  if (!res.ok) throw new Error(`Network request failed (${res.status})`);
  const json = (await res.json()) as { success: boolean; result: T };
  if (!json.success) throw new Error('Network request failed');
  return json.result;
}

let resourcePromise: Promise<string> | null = null;
/** Id of the newest Gemel-Net resource (the one covering "until today"). */
function currentResource(): Promise<string> {
  resourcePromise ??= ckan<{ resources: { id: string; name: string }[] }>('package_show', { id: PACKAGE })
    .then((p) => p.resources.find((r) => r.name.includes('היום'))?.id ?? FALLBACK_RESOURCE)
    .catch(() => {
      resourcePromise = null;
      return FALLBACK_RESOURCE;
    });
  return resourcePromise;
}

/** Latest month (YYYYMM) that has been published. */
export async function latestPublishedPeriod(): Promise<number> {
  const resource = await currentResource();
  const r = await ckan<{ records: { REPORT_PERIOD: number }[] }>('datastore_search', {
    resource_id: resource,
    limit: 1,
    sort: 'REPORT_PERIOD desc',
    fields: 'REPORT_PERIOD',
  });
  const period = r.records[0]?.REPORT_PERIOD;
  if (!period) throw new Error('Network request failed');
  return period;
}

/** Search funds that reported in the latest month, by name or fund number. */
export async function searchFunds(query: string): Promise<{ period: number; results: FundSearchResult[] }> {
  const period = await latestPublishedPeriod();
  const resource = await currentResource();
  const q = query.trim();
  const filters: Record<string, number> = { REPORT_PERIOD: period };
  const params: Record<string, string | number> = {
    resource_id: resource,
    limit: 30,
    distinct: 'true',
    fields: 'FUND_ID,FUND_NAME,MANAGING_CORPORATION,FUND_CLASSIFICATION',
    sort: 'FUND_NAME',
  };
  if (/^\d+$/.test(q)) filters.FUND_ID = Number(q);
  else params.q = q;
  params.filters = JSON.stringify(filters);

  const r = await ckan<{
    records: { FUND_ID: number; FUND_NAME: string; MANAGING_CORPORATION: string; FUND_CLASSIFICATION: string }[];
  }>('datastore_search', params);
  return {
    period,
    results: r.records.map((x) => ({
      fundId: x.FUND_ID,
      name: x.FUND_NAME.trim(),
      manager: x.MANAGING_CORPORATION.trim(),
      classification: x.FUND_CLASSIFICATION.trim(),
    })),
  };
}

/** The last two years of monthly returns for one fund. */
export async function fundMonthlyYields(fundId: number): Promise<MonthlyYield[]> {
  const resource = await currentResource();
  const r = await ckan<{ records: { REPORT_PERIOD: number; MONTHLY_YIELD: number | null }[] }>('datastore_search', {
    resource_id: resource,
    limit: 24,
    sort: 'REPORT_PERIOD desc',
    fields: 'REPORT_PERIOD,MONTHLY_YIELD',
    filters: JSON.stringify({ FUND_ID: fundId }),
  });
  return r.records.map((x) => ({ period: x.REPORT_PERIOD, yieldPct: x.MONTHLY_YIELD }));
}

export function useFundYields(fundId: number | null) {
  return useQuery({
    queryKey: ['fund-yields', fundId],
    queryFn: () => fundMonthlyYields(fundId!),
    enabled: fundId !== null,
    staleTime: 6 * 60 * 60 * 1000, // published monthly; refresh a few times a day at most
    retry: 1,
  });
}
