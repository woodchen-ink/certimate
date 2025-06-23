// fallback policy: .env > git tag > "v0.0.0-dev"
export const version = import.meta.env.VITE_APP_VERSION || __APP_VERSION__ || "v0.0.0-dev";
