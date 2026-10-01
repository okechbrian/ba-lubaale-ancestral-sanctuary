export const channel = {
  label: "Nalubaale The Divine",
  url: "https://www.youtube.com/@nalubaalethedivine7639",
} as const;

export type TeachingFilm = {
  readonly id: string;
  readonly title: string;
  readonly en: string;
};

export const films: readonly TeachingFilm[] = [
  {
    id: "0Soh_8nwBZc",
    title: "Okwezuula, part 1",
    en: "Unveiling. Who you are, and what has been blocking the life.",
  },
  {
    id: "ycERgjuSUNs",
    title: "Master the art of balance",
    en: "Silence, conduct, and the thirty quiet minutes with no phone.",
  },
  {
    id: "4bTrmRtg_WU",
    title: "FFUNA OBUGAGGA MU NAMBULA BIZINGA BYE SSESE",
    en: "The Ssese gathering. The annual coming-together, not a resort advert.",
  },
];
