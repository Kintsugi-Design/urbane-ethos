import { get } from "./storage.js";

const SESSION_EVENTS_KEY = "urbane-ethos:session-events";

export const seedData = {
  totalVisits30d: 1842,
  topPages: [
    { path: "/", views: 1130 },
    { path: "/services", views: 412 },
    { path: "/staff", views: 188 },
    { path: "/blog", views: 92 },
    { path: "/contact", views: 80 }
  ],
  chatbot: { opens: 297, completions: 144, intents: [
    { label: "Pricing", value: 102 },
    { label: "Service", value: 88 },
    { label: "Booking", value: 71 },
    { label: "Human", value: 36 }
  ] },
  microSurvey: { shown: 1842, started: 612, completed: 388, concerns: [
    { label: "Speech", value: 142 },
    { label: "Motor", value: 71 },
    { label: "Behaviour", value: 61 },
    { label: "Learning", value: 58 },
    { label: "Not sure", value: 56 }
  ] },
  localeSplit: [
    { label: "EN", value: 1391 },
    { label: "BM", value: 451 }
  ],
  funnel: [
    { label: "Visit", value: 1842 },
    { label: "Survey", value: 388 },
    { label: "Chatbot", value: 144 },
    { label: "Contact submit", value: 41 }
  ]
};

// Read-only, and now consent-gated on the `analytics` category (plan §1.4):
// with analytics consent absent the dashboard falls back to seedData alone.
export function liveSessionEvents() {
  const events = get(SESSION_EVENTS_KEY, {
    category: "analytics",
    scope: "session",
    fallback: []
  });
  return Array.isArray(events) ? events : [];
}
