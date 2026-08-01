import { Song, HomeData, HeroSlide, ArtistRadio, LyricLine } from "./music-types";
import { getHighResArtworkUrl, getTrackAccentColor } from "./images";

export function isValidVideoId(id?: string | null): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

// Deterministic Mulberry32 PRNG
export function createMulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
  const prng = createMulberry32(seed);
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const FALLBACK_SONGS: Song[] = [
  {
    videoId: "BddP6PYo2gs",
    title: "Kesariya",
    artist: "Arijit Singh, Pritam, Amitabh Bhattacharya",
    album: "Brahmāstra",
    duration: 268,
    durationText: "4:28",
    image: "https://i.ytimg.com/vi/BddP6PYo2gs/maxresdefault.jpg",
    color: "#ff4f8a",
    views: "520M views",
  },
  {
    videoId: "ElZfdU54Cp8",
    title: "Apna Bana Le",
    artist: "Arijit Singh, Sachin-Jigar",
    album: "Bhediya",
    duration: 261,
    durationText: "4:21",
    image: "https://i.ytimg.com/vi/ElZfdU54Cp8/maxresdefault.jpg",
    color: "#3b82f6",
    views: "410M views",
  },
  {
    videoId: "VAdGW7QDJUI",
    title: "Chaleya",
    artist: "Arijit Singh, Shilpa Rao, Anirudh",
    album: "Jawan",
    duration: 200,
    durationText: "3:20",
    image: "https://i.ytimg.com/vi/VAdGW7QDJUI/maxresdefault.jpg",
    color: "#9333ea",
    views: "380M views",
  },
  {
    videoId: "c9RzZpV4WnE",
    title: "Pehle Bhi Main",
    artist: "Vishal Mishra, Raj Shekhar",
    album: "Animal",
    duration: 250,
    durationText: "4:10",
    image: "https://i.ytimg.com/vi/c9RzZpV4WnE/maxresdefault.jpg",
    color: "#ef4444",
    views: "290M views",
  },
  {
    videoId: "RLzC55ai0eo",
    title: "Heeriye",
    artist: "Jasleen Royal, Arijit Singh, Dulquer Salmaan",
    album: "Heeriye Single",
    duration: 195,
    durationText: "3:15",
    image: "https://i.ytimg.com/vi/RLzC55ai0eo/maxresdefault.jpg",
    color: "#ec4899",
    views: "340M views",
  },
  {
    videoId: "k3g_WjLCsXM",
    title: "Sajni",
    artist: "Arijit Singh, Ram Sampath, Prashant Pandey",
    album: "Laapataa Ladies",
    duration: 172,
    durationText: "2:52",
    image: "https://i.ytimg.com/vi/k3g_WjLCsXM/maxresdefault.jpg",
    color: "#f59e0b",
    views: "180M views",
  },
  {
    videoId: "HrnrqYxYrbk",
    title: "Satranga",
    artist: "Arijit Singh, Shreyas Puranik, Siddharth-Garima",
    album: "Animal",
    duration: 271,
    durationText: "4:31",
    image: "https://i.ytimg.com/vi/HrnrqYxYrbk/maxresdefault.jpg",
    color: "#10b981",
    views: "260M views",
  },
  {
    videoId: "zcwq5s-dZ3w",
    title: "Tauba Tauba",
    artist: "Karan Aujla",
    album: "Bad Newz",
    duration: 207,
    durationText: "3:27",
    image: "https://i.ytimg.com/vi/zcwq5s-dZ3w/maxresdefault.jpg",
    color: "#06b6d4",
    views: "220M views",
  },
  {
    videoId: "gvyUuxdRdR4",
    title: "Raataan Lambiyan",
    artist: "Jubin Nautiyal, Asees Kaur, Tanishk Bagchi",
    album: "Shershaah",
    duration: 230,
    durationText: "3:50",
    image: "https://i.ytimg.com/vi/gvyUuxdRdR4/maxresdefault.jpg",
    color: "#8b5cf6",
    views: "890M views",
  },
  {
    videoId: "sK7riqg2mr4",
    title: "Agar Tum Saath Ho",
    artist: "Alka Yagnik, Arijit Singh, A.R. Rahman",
    album: "Tamasha",
    duration: 341,
    durationText: "5:41",
    image: "https://i.ytimg.com/vi/sK7riqg2mr4/maxresdefault.jpg",
    color: "#f97316",
    views: "450M views",
  },
  {
    videoId: "5Eqb_-j3FDA",
    title: "Pasoori",
    artist: "Ali Sethi, Shae Gill",
    album: "Coke Studio Season 14",
    duration: 224,
    durationText: "3:44",
    image: "https://i.ytimg.com/vi/5Eqb_-j3FDA/maxresdefault.jpg",
    color: "#14b8a6",
    views: "670M views",
  },
  {
    videoId: "T94PHkuydcw",
    title: "Kun Faya Kun",
    artist: "A.R. Rahman, Javed Ali, Mohit Chauhan",
    album: "Rockstar",
    duration: 473,
    durationText: "7:53",
    image: "https://i.ytimg.com/vi/T94PHkuydcw/maxresdefault.jpg",
    color: "#6366f1",
    views: "390M views",
  },
  {
    videoId: "eXkHvT--DBU",
    title: "Zaalima",
    artist: "Arijit Singh, Harshdeep Kaur, JAM8",
    album: "Raees",
    duration: 300,
    durationText: "5:00",
    image: "https://i.ytimg.com/vi/eXkHvT--DBU/maxresdefault.jpg",
    color: "#ff4f8a",
    views: "360M views",
  },
  {
    videoId: "Z_PODraXg4E",
    title: "O Maahi",
    artist: "Arijit Singh, Pritam, Irshad Kamil",
    album: "Dunki",
    duration: 233,
    durationText: "3:53",
    image: "https://i.ytimg.com/vi/Z_PODraXg4E/maxresdefault.jpg",
    color: "#3b82f6",
    views: "210M views",
  },
  {
    videoId: "jHNNMj5bNQw",
    title: "Kabira",
    artist: "Tochi Raina, Rekha Bhardwaj, Pritam",
    album: "Yeh Jawaani Hai Deewani",
    duration: 251,
    durationText: "4:11",
    image: "https://i.ytimg.com/vi/jHNNMj5bNQw/maxresdefault.jpg",
    color: "#ec4899",
    views: "420M views",
  },
  {
    videoId: "YxWlaYCA8MU",
    title: "Jhoome Jo Pathaan",
    artist: "Vishal-Shekhar, Arijit Singh, Sukriti Kakar",
    album: "Pathaan",
    duration: 202,
    durationText: "3:22",
    image: "https://i.ytimg.com/vi/YxWlaYCA8MU/maxresdefault.jpg",
    color: "#f59e0b",
    views: "810M views",
  },
  {
    videoId: "qFkNATtc3mc",
    title: "Ghungroo",
    artist: "Arijit Singh, Shilpa Rao, Vishal-Shekhar",
    album: "War",
    duration: 302,
    durationText: "5:02",
    image: "https://i.ytimg.com/vi/qFkNATtc3mc/maxresdefault.jpg",
    color: "#10b981",
    views: "530M views",
  },
  {
    videoId: "b_sWzQe7s14",
    title: "Lutt Putt Gaya",
    artist: "Arijit Singh, Pritam, Swanand Kirkire",
    album: "Dunki",
    duration: 224,
    durationText: "3:44",
    image: "https://i.ytimg.com/vi/b_sWzQe7s14/maxresdefault.jpg",
    color: "#06b6d4",
    views: "240M views",
  },
  {
    videoId: "fdubeMFwuGs",
    title: "Ilahi",
    artist: "Arijit Singh, Pritam, Swanand Kirkire",
    album: "Yeh Jawaani Hai Deewani",
    duration: 228,
    durationText: "3:48",
    image: "https://i.ytimg.com/vi/fdubeMFwuGs/maxresdefault.jpg",
    color: "#9333ea",
    views: "310M views",
  },
  {
    videoId: "IJq0ydz4438",
    title: "Tum Hi Ho",
    artist: "Arijit Singh, Mithoon",
    album: "Aashiqui 2",
    duration: 262,
    durationText: "4:22",
    image: "https://i.ytimg.com/vi/IJq0ydz4438/maxresdefault.jpg",
    color: "#ef4444",
    views: "840M views",
  },
  {
    videoId: "6FURuLYrR_Q",
    title: "Ae Dil Hai Mushkil Title Track",
    artist: "Arijit Singh, Pritam, Amitabh Bhattacharya",
    album: "Ae Dil Hai Mushkil",
    duration: 269,
    durationText: "4:29",
    image: "https://i.ytimg.com/vi/6FURuLYrR_Q/maxresdefault.jpg",
    color: "#8b5cf6",
    views: "480M views",
  },
  {
    videoId: "284VoJ-4G_8",
    title: "Channa Mereya",
    artist: "Arijit Singh, Pritam, Amitabh Bhattacharya",
    album: "Ae Dil Hai Mushkil",
    duration: 289,
    durationText: "4:49",
    image: "https://i.ytimg.com/vi/284VoJ-4G_8/maxresdefault.jpg",
    color: "#f97316",
    views: "610M views",
  },
  {
    videoId: "k4yXQkG2s1E",
    title: "Naina",
    artist: "Diljit Dosanjh, Badshah, Raj Ranjodh",
    album: "Crew",
    duration: 180,
    durationText: "3:00",
    image: "https://i.ytimg.com/vi/k4yXQkG2s1E/maxresdefault.jpg",
    color: "#14b8a6",
    views: "170M views",
  },
  {
    videoId: "0pWsCi5stKE",
    title: "Hass Hass",
    artist: "Diljit Dosanjh, Sia, Greg Kurstin",
    album: "Hass Hass Single",
    duration: 154,
    durationText: "2:34",
    image: "https://i.ytimg.com/vi/0pWsCi5stKE/maxresdefault.jpg",
    color: "#ec4899",
    views: "140M views",
  },
];

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "hero-1",
    title: "Kesariya Ishq Hai Piya",
    subtitle: "Arijit Singh & Pritam",
    description: "The timeless love anthem that defined a generation of Bollywood romance.",
    badge: "Trending #1 in India",
    color: "#ff4f8a",
    image: "https://i.ytimg.com/vi/BddP6PYo2gs/maxresdefault.jpg",
    song: FALLBACK_SONGS[0],
  },
  {
    id: "hero-2",
    title: "Chaleya - Groovy Romance",
    subtitle: "Arijit Singh, Shilpa Rao, Anirudh",
    description: "SRK & Nayanthara's electrifying chemistry with irresistible beats.",
    badge: "Top Chartbuster",
    color: "#9333ea",
    image: "https://i.ytimg.com/vi/VAdGW7QDJUI/maxresdefault.jpg",
    song: FALLBACK_SONGS[2],
  },
  {
    id: "hero-3",
    title: "Sajni - Laapataa Ladies",
    subtitle: "Arijit Singh & Ram Sampath",
    description: "Pure acoustic soul and nostalgic rural charm that conquered hearts.",
    badge: "Critic's Choice",
    color: "#f59e0b",
    image: "https://i.ytimg.com/vi/k3g_WjLCsXM/maxresdefault.jpg",
    song: FALLBACK_SONGS[5],
  },
  {
    id: "hero-4",
    title: "Pehle Bhi Main",
    subtitle: "Vishal Mishra & Harshavardhan",
    description: "Haunting melodies and intense devotion in Animal's soulful ballad.",
    badge: "Blockbuster Hit",
    color: "#ef4444",
    image: "https://i.ytimg.com/vi/c9RzZpV4WnE/maxresdefault.jpg",
    song: FALLBACK_SONGS[3],
  },
];

export const ARTIST_RADIOS: ArtistRadio[] = [
  {
    artist: "Arijit Singh",
    image: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
    songCount: 48,
    query: "Arijit Singh best hindi songs",
  },
  {
    artist: "Shreya Ghoshal",
    image: "https://i.ytimg.com/vi/sK7riqg2mr4/hqdefault.jpg",
    songCount: 36,
    query: "Shreya Ghoshal hits hindi",
  },
  {
    artist: "Diljit Dosanjh",
    image: "https://i.ytimg.com/vi/k4yXQkG2s1E/hqdefault.jpg",
    songCount: 29,
    query: "Diljit Dosanjh party hits",
  },
  {
    artist: "A.R. Rahman",
    image: "https://i.ytimg.com/vi/T94PHkuydcw/hqdefault.jpg",
    songCount: 42,
    query: "AR Rahman sufi hindi songs",
  },
  {
    artist: "Karan Aujla",
    image: "https://i.ytimg.com/vi/zcwq5s-dZ3w/hqdefault.jpg",
    songCount: 22,
    query: "Karan Aujla songs hindi punjabi",
  },
  {
    artist: "Vishal Mishra",
    image: "https://i.ytimg.com/vi/c9RzZpV4WnE/hqdefault.jpg",
    songCount: 20,
    query: "Vishal Mishra romantic songs",
  },
];

export const FALLBACK_LYRICS_MAP: Record<string, LyricLine[]> = {
  BddP6PYo2gs: [
    { time: 14, text: "Mujhko itna bataye koi" },
    { time: 19, text: "Kaise tujhse dil na lagaye koi" },
    { time: 24, text: "Rabba ne tujhko banane mein" },
    { time: 29, text: "Kardi hai husn ki khaali tijoriyan" },
    { time: 35, text: "Kaajal ki siyahi se likhi" },
    { time: 40, text: "Hai tune jaane kitno ki love storiyan" },
    { time: 47, text: "Kesariya tera ishq hai piya" },
    { time: 52, text: "Rang jaaun jo main haath lagaun" },
    { time: 58, text: "Din beete saara teri fikr mein" },
    { time: 63, text: "Rain saari teri khair manaun" },
    { time: 69, text: "Kesariya tera ishq hai piya" },
    { time: 75, text: "Rang jaaun jo main haath lagaun" },
    { time: 80, text: "Patjhad ke mausam mein bhi" },
    { time: 85, text: "Rangi chanar jaisi jhume" },
    { time: 91, text: "Gehri parchaayi teri" },
    { time: 96, text: "Kadam kadam ko chume" },
  ],
  VAdGW7QDJUI: [
    { time: 10, text: "Ishq jaisa kuch kuch hota hai" },
    { time: 15, text: "Tere bin ab chain na aata hai" },
    { time: 22, text: "Hai dil yeh bekarar mera" },
    { time: 28, text: "Chaleya teri ore chaleya" },
    { time: 33, text: "Mahiya main toh gaya maara" },
    { time: 39, text: "Ishq mein tere dil haara" },
    { time: 45, text: "Chaleya teri ore chaleya" },
    { time: 50, text: "Mahiya main toh gaya maara" },
  ],
  sK7riqg2mr4: [
    { time: 12, text: "Pal bhar thehar jaao" },
    { time: 18, text: "Dil ye sambhal jaaye" },
    { time: 24, text: "Kaise tumhe roka karun" },
    { time: 30, text: "Meri taraf aata har gham phisal jaaye" },
    { time: 36, text: "Aankhon mein tum ko bharun" },
    { time: 42, text: "Bin bole baatein tumse karun" },
    { time: 48, text: "Agar tum saath ho..." },
    { time: 55, text: "Dil ye sambhal jaaye" },
    { time: 62, text: "Agar tum saath ho..." },
  ],
  k3g_WjLCsXM: [
    { time: 8, text: "Sajni re kaise kate din raat" },
    { time: 15, text: "Kaha na jaye mann ki baat" },
    { time: 23, text: "Naina bahe jaise barse badal" },
    { time: 30, text: "Tori yaad mein hum hue pagal" },
    { time: 38, text: "Sajni re... O sajni re..." },
    { time: 46, text: "Kaise kate din raat" },
  ],
  c9RzZpV4WnE: [
    { time: 11, text: "Pehle bhi main tumse mila hoon" },
    { time: 18, text: "Pehli dafa hi milke laga" },
    { time: 25, text: "Tune chhua zakhmon ko mere" },
    { time: 32, text: "Marham sa koyi lagne laga" },
    { time: 40, text: "Pehle bhi main tumse mila hoon" },
    { time: 47, text: "Pehli dafa hi milke laga" },
  ],
};

export function getSeededHomeData(seed: number = 42, filter: string = "All"): HomeData {
  const prng = createMulberry32(seed);
  const offset = Math.floor(prng() * FALLBACK_SONGS.length);

  // Rotate and shuffle slices for diverse sections
  const rotated = [
    ...FALLBACK_SONGS.slice(offset),
    ...FALLBACK_SONGS.slice(0, offset),
  ];

  let filteredPool = rotated;
  if (filter && filter !== "All") {
    // Mood-based permutation
    const moodFilterSeed = seed + filter.length * 17;
    filteredPool = shuffleArrayWithSeed(rotated, moodFilterSeed);
  }

  const speedDial = filteredPool.slice(0, 6);
  const community = filteredPool.slice(4, 12);
  const dailyDiscover = filteredPool.slice(2, 10);
  const charts = filteredPool.slice(6, 16);
  const newReleases = filteredPool.slice(8, 18);
  const musicVideos = filteredPool.slice(1, 9);
  const danceGrid = filteredPool.slice(10, 18);
  const biggestHits = filteredPool.slice(3, 15);

  const heroIndex = Math.abs(seed) % HERO_SLIDES.length;
  const heroSlide = HERO_SLIDES[heroIndex] || HERO_SLIDES[0];

  return {
    hero: [
      heroSlide,
      ...HERO_SLIDES.filter((_, idx) => idx !== heroIndex),
    ],
    speedDial,
    community,
    dailyDiscover,
    artistRadios: ARTIST_RADIOS,
    charts,
    newReleases,
    musicVideos,
    danceGrid,
    biggestHits,
    seed,
    filter,
    source: "fallback",
  };
}
