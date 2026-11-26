export type Applicant = {
  initials: string;
  name: string;
  rating: string;
  matches: number;
  price: string;
  distance: string;
  best?: boolean;
};

export type MatchExample = {
  venue: string;
  format: string;
  kickoff: string;
  area: string;
  applicants: Applicant[];
};

export const MATCH_EXAMPLES: MatchExample[] = [
  {
    venue: "Hackney Marshes",
    format: "Sunday league, 7-a-side",
    kickoff: "Sun 19:30",
    area: "E9, London",
    applicants: [
      { initials: "DA", name: "Daniel A.", rating: "4.9", matches: 34, price: "£22", distance: "1.2 mi", best: true },
      { initials: "MO", name: "Marcus O.", rating: "4.7", matches: 19, price: "£20", distance: "2.4 mi" },
      { initials: "TR", name: "Tom R.", rating: "4.6", matches: 11, price: "£18", distance: "3.1 mi" },
    ],
  },
  {
    venue: "Clapham Common",
    format: "Women's league, 5-a-side",
    kickoff: "Sat 10:00",
    area: "SW4, London",
    applicants: [
      { initials: "SK", name: "Sophie K.", rating: "4.8", matches: 27, price: "£20", distance: "0.9 mi", best: true },
      { initials: "JB", name: "Jade B.", rating: "4.5", matches: 14, price: "£18", distance: "1.8 mi" },
      { initials: "LP", name: "Laura P.", rating: "4.4", matches: 8, price: "£15", distance: "2.7 mi" },
    ],
  },
  {
    venue: "Finsbury Park",
    format: "Midweek league, 11-a-side",
    kickoff: "Wed 20:00",
    area: "N4, London",
    applicants: [
      { initials: "RH", name: "Ryan H.", rating: "4.9", matches: 41, price: "£25", distance: "1.5 mi", best: true },
      { initials: "AD", name: "Aaron D.", rating: "4.6", matches: 22, price: "£22", distance: "2.2 mi" },
      { initials: "CF", name: "Chris F.", rating: "4.5", matches: 12, price: "£20", distance: "3.4 mi" },
    ],
  },
];
