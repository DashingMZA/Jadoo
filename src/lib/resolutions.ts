/**
 * Aspect-ratio "buckets" jo sample-video fallback ke liye use hote hain
 * (dekho src-tauri/src/commands/ffmpeg.rs ka `resolve_sample_video_path`).
 * Har naya resolution isi mein se ek se belong karta hai — matlab naye
 * resolutions add karne ke liye alag se sample video ki zaroorat nahi,
 * jo bhi is aspect ka video pehle se configured hai wahi reuse ho jata hai.
 */
export type AspectBucket = "16:9" | "9:16" | "1:1" | "4:5" | "2:3";

export interface ResolutionOption {
  label: string;
  width: number;
  height: number;
  group: string;
  aspect: AspectBucket;
}

// Common short-video / social platform resolutions, sproutsocial.com ke
// "Always up-to-date guide to social media video specs" (2026) ke hisaab se.
// "Custom" niche users khud apna width/height bhi type kar sakte hain.
export const COMMON_RESOLUTIONS: ResolutionOption[] = [
  // ---- General / Common (original defaults) ----
  { label: "9:16 Vertical (1080x1920) — Reels/Shorts/TikTok", width: 1080, height: 1920, group: "General", aspect: "9:16" },
  { label: "16:9 Horizontal (1920x1080) — YouTube", width: 1920, height: 1080, group: "General", aspect: "16:9" },
  { label: "1:1 Square (1080x1080) — Feed post", width: 1080, height: 1080, group: "General", aspect: "1:1" },
  { label: "4:5 Portrait (1080x1350) — Instagram feed", width: 1080, height: 1350, group: "General", aspect: "4:5" },
  { label: "9:16 Vertical (720x1280)", width: 720, height: 1280, group: "General", aspect: "9:16" },
  { label: "16:9 Horizontal (1280x720)", width: 1280, height: 720, group: "General", aspect: "16:9" },

  // ---- Instagram ----
  { label: "Instagram Reels (1440x2560 min)", width: 1440, height: 2560, group: "Instagram", aspect: "9:16" },
  { label: "Instagram Stories (1440x1800 min)", width: 1440, height: 1800, group: "Instagram", aspect: "4:5" },
  { label: "Instagram Feed/Carousel (1080x1350)", width: 1080, height: 1350, group: "Instagram", aspect: "4:5" },
  { label: "Instagram Feed/Carousel Square (1080x1080)", width: 1080, height: 1080, group: "Instagram", aspect: "1:1" },

  // ---- Facebook ----
  { label: "Facebook Reels (1080x1920)", width: 1080, height: 1920, group: "Facebook", aspect: "9:16" },
  { label: "Facebook Stories (1440x2560)", width: 1440, height: 2560, group: "Facebook", aspect: "9:16" },
  { label: "Facebook Feed/Carousel (1080x1080)", width: 1080, height: 1080, group: "Facebook", aspect: "1:1" },

  // ---- X (Twitter) ----
  { label: "X Landscape (1280x720)", width: 1280, height: 720, group: "X (Twitter)", aspect: "16:9" },
  { label: "X Portrait (720x1280)", width: 720, height: 1280, group: "X (Twitter)", aspect: "9:16" },
  { label: "X Square (720x720)", width: 720, height: 720, group: "X (Twitter)", aspect: "1:1" },

  // ---- YouTube (landscape, non-verified & verified accounts) ----
  { label: "YouTube 8K (7680x4320)", width: 7680, height: 4320, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 4K (3840x2160)", width: 3840, height: 2160, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 2K (2560x1440)", width: 2560, height: 1440, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 1080p HD (1920x1080)", width: 1920, height: 1080, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 720p HD (1280x720)", width: 1280, height: 720, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 480p SD (854x480)", width: 854, height: 480, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 360p SD (640x360)", width: 640, height: 360, group: "YouTube", aspect: "16:9" },
  { label: "YouTube 240p SD (426x240)", width: 426, height: 240, group: "YouTube", aspect: "16:9" },

  // ---- YouTube Shorts (portrait) ----
  { label: "YouTube Shorts 8K (4320x7680)", width: 4320, height: 7680, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 4K (2160x3840)", width: 2160, height: 3840, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 2K (1440x2560)", width: 1440, height: 2560, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 1080p HD (1080x1920)", width: 1080, height: 1920, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 720p HD (720x1280)", width: 720, height: 1280, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 480p SD (480x854)", width: 480, height: 854, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 360p SD (360x640)", width: 360, height: 640, group: "YouTube Shorts", aspect: "9:16" },
  { label: "YouTube Shorts 240p SD (240x426)", width: 240, height: 426, group: "YouTube Shorts", aspect: "9:16" },

  // ---- LinkedIn (video ad spec max dimensions) ----
  { label: "LinkedIn Vertical 4:5 (1536x1920 max)", width: 1536, height: 1920, group: "LinkedIn", aspect: "4:5" },
  { label: "LinkedIn Vertical 9:16 (1080x1920 max)", width: 1080, height: 1920, group: "LinkedIn", aspect: "9:16" },
  { label: "LinkedIn Landscape 16:9 (1920x1080 max)", width: 1920, height: 1080, group: "LinkedIn", aspect: "16:9" },
  { label: "LinkedIn Square 1:1 (1920x1920 max)", width: 1920, height: 1920, group: "LinkedIn", aspect: "1:1" },

  // ---- Pinterest ----
  { label: "Pinterest Square (1000x1000)", width: 1000, height: 1000, group: "Pinterest", aspect: "1:1" },
  { label: "Pinterest Standard 2:3 (1000x1500)", width: 1000, height: 1500, group: "Pinterest", aspect: "2:3" },
  { label: "Pinterest 4:5 (1080x1350)", width: 1080, height: 1350, group: "Pinterest", aspect: "4:5" },
  { label: "Pinterest Full Vertical 9:16 (1080x1920)", width: 1080, height: 1920, group: "Pinterest", aspect: "9:16" },

  // ---- Snapchat ----
  { label: "Snapchat (1080x1920)", width: 1080, height: 1920, group: "Snapchat", aspect: "9:16" },
];

export const RESOLUTION_GROUPS: string[] = Array.from(
  new Set(COMMON_RESOLUTIONS.map((r) => r.group)),
);

const ASPECT_RATIO_VALUES: Record<AspectBucket, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
  "2:3": 2 / 3,
};

/**
 * Kisi bhi resolution (preset ya custom-typed) ke liye sabse qareeb aspect
 * bucket dhoondta hai — pehle exact label match try karta hai, warna
 * width/height ke ratio se nazdeek tareen bucket (5% tolerance ke andar).
 * Sample-video fallback isi bucket se hota hai.
 */
export function getAspectForResolution(
  label: string,
  width: number,
  height: number,
): AspectBucket | null {
  const preset = COMMON_RESOLUTIONS.find((r) => r.label === label);
  if (preset) return preset.aspect;

  if (!width || !height) return null;
  const ratio = width / height;
  let best: AspectBucket | null = null;
  let bestDiff = Infinity;
  for (const [bucket, value] of Object.entries(ASPECT_RATIO_VALUES) as [AspectBucket, number][]) {
    const diff = Math.abs(ratio - value) / value;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = bucket;
    }
  }
  return bestDiff < 0.05 ? best : null;
}
