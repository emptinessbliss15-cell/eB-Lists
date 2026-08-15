import { handleApi } from './api.js';

function createSupabase(env, request) {
  const authorization = request.headers.get('Authorization');
  return {
    from(table) {
      return new SupabaseQuery(env, table, authorization);
    },
  };
}

class SupabaseQuery {
  constructor(env, table, authorization) {
    this.env = env;
    this.table = table;
    this.authorization = authorization;
    this.filters = [];
    this.ordering = [];
  }

  select(columns = '*') {
    this.columns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push([column, `eq.${encodeURIComponent(value)}`]);
    return this;
  }

  order(column, options = {}) {
    this.ordering.push(`${column}.${options.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_PUBLISHABLE_KEY) {
      return { data: null, error: new Error('Supabase configuration is missing') };
    }

    const url = new URL(`${this.env.SUPABASE_URL}/rest/v1/${this.table}`);
    url.searchParams.set('select', this.columns || '*');
    for (const [column, value] of this.filters) url.searchParams.set(column, value);
    if (this.ordering.length) url.searchParams.set('order', this.ordering.join(','));

    const headers = {
      apikey: this.env.SUPABASE_PUBLISHABLE_KEY,
      Accept: 'application/json',
    };
    if (this.authorization) headers.Authorization = this.authorization;

    const response = await fetch(url, { headers });
    const data = await response.json().catch(() => null);
    return response.ok
      ? { data, error: null }
      : { data: null, error: new Error(data?.message || `Supabase request failed (${response.status})`) };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/__build') {
      const metadata = env.CF_VERSION_METADATA;
      return Response.json({
        service: 'eB-Lists',
        status: 'deployed',
        version: metadata?.id || null,
        tag: metadata?.tag || null,
        timestamp: metadata?.timestamp || null,
      }, {
        headers: { 'cache-control': 'no-store' },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, createSupabase(env, request));
    }

    return new Response(JSON.stringify({ service: 'eB-Lists', status: 'ok' }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  },
};
