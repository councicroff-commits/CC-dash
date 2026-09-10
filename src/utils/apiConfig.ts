export const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    console.warn("VITE_API_BASE_URL is not set. Defaulting to local endpoint.");
    return 'http://localhost:8000/api/v1';
  }
  return url;
};
