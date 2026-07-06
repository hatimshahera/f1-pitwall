import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
};

/** JSON response with permissive CORS so external sites can consume the API. */
export function jsonWithCors(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/** 404 body used when a requested resource has not been generated yet. */
export function notFound(message: string): NextResponse {
  return jsonWithCors({ error: message }, 404);
}

/** Preflight handler shared by the data routes. */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
