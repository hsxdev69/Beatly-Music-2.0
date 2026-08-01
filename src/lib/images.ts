/**
 * HD Artwork resolution helpers and fallback chains
 */

export function getHighResArtworkUrl(url?: string | null): string {
  if (!url) {
    return "/icons/icon-512.png";
  }

  // Rewrite googleusercontent or ggpht URLs to 1200x1200 HQ
  if (url.includes("googleusercontent.com") || url.includes("ggpht.com")) {
    if (url.includes("=w") && url.includes("-h")) {
      return url.replace(/=w\d+-h\d+[^?]*/, "=w1200-h1200-l90-rj");
    }
    if (url.includes("=")) {
      return url.replace(/=[^?]+/, "=w1200-h1200-l90-rj");
    }
    return `${url}=w1200-h1200-l90-rj`;
  }

  // For youtube thumbnails (i.ytimg.com / ytimg.com)
  if (url.includes("ytimg.com") || url.includes("youtube.com")) {
    const videoIdMatch = url.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
    if (videoIdMatch && videoIdMatch[1]) {
      return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
    }
  }

  return url;
}

export function getYouTubeThumbnailChain(videoId: string): string[] {
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ];
}

export function getThumbnailFromAny(url?: string | null, videoId?: string): string[] {
  const list: string[] = [];
  if (url) {
    list.push(getHighResArtworkUrl(url));
    list.push(url);
  }
  if (videoId && videoId.length === 11) {
    list.push(...getYouTubeThumbnailChain(videoId));
  }
  return Array.from(new Set(list));
}

// Deterministic vibrant pastel/neon accent colors for songs
const VIBRANT_PALETTES = [
  "#ff4f8a", // Beatly signature pink
  "#9333ea", // Purple
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export function getTrackAccentColor(seedText: string): string {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VIBRANT_PALETTES.length;
  return VIBRANT_PALETTES[index];
}
