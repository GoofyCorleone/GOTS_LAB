import { ExperimentDetailView } from "@/components/experiments/ExperimentDetailView";

// This project builds with `output: "export"` (static hosting). Next.js
// *requires* output:"export" dynamic routes to return at least one path from
// generateStaticParams (an empty array is rejected at build time — see
// next/dist/build/index.js, error code E87), even though experiment ids are
// created at runtime and can't really be known in advance. This placeholder
// id exists purely to satisfy that build-time check.
//
// ARCHITECTURAL CAVEAT (pre-existing, not introduced by this page): on a pure
// static host with no server (e.g. GitHub Pages, which this basePath config
// targets), only "/experiments/placeholder/" gets an actual prerendered HTML
// file + RSC payload. Visiting a REAL experiment id's URL directly — or even
// client-side navigating to it from elsewhere in the app, since the router
// fetches a per-path RSC payload that only exists for prerendered paths —
// will 404, because there is no server to render it on demand. This affects
// every dynamic experiment link Phase 3 already produces
// (`router.push(`/experiments/${experiment.id}`)`), independent of this file.
// The real fix is either (a) drop `output: "export"` and deploy this app to a
// Node-capable host (Vercel, etc.) — it already needs a live JS runtime for
// Supabase auth, so static export buys little here — or (b) move this route
// to a query-string page (`/experiments/detail?id=...`) which isn't a dynamic
// segment and needs no generateStaticParams at all.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function ExperimentDetailPage() {
  return <ExperimentDetailView />;
}
