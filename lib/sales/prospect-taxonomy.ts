import { z } from "zod";

export const PROSPECT_CATEGORY_GROUPS = [
  "PROMOTERS_AND_EVENT_OPERATORS",
  "ATTRACTIONS_AND_LEISURE",
  "FESTIVALS_AND_PUBLIC_EVENTS",
  "VENUES_AND_DESTINATIONS",
  "AGENCIES_AND_PARTNERS",
  "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
  "RIGHTS_LICENSING_AND_SPONSORSHIP",
] as const;

export type ProspectCategoryGroup = (typeof PROSPECT_CATEGORY_GROUPS)[number];

export const PROSPECT_BUYER_MODELS = [
  "PROMOTER",
  "OWNER_OPERATOR",
  "PROGRAMMER",
  "PUBLIC_SECTOR",
  "AGENCY",
  "LICENSEE",
  "RIGHTS_HOLDER",
  "SPONSOR",
] as const;

export type ProspectBuyerModel = (typeof PROSPECT_BUYER_MODELS)[number];

export const PROSPECT_ACCOUNT_CATEGORIES = [
  "TICKETED_EVENT_PROMOTER",
  "TOURING_ATTRACTION_OPERATOR",
  "IMMERSIVE_EXPERIENCE_OPERATOR",
  "FAMILY_ATTRACTION_OPERATOR",
  "THEME_PARK_VISITOR_ATTRACTION_OPERATOR",
  "FESTIVAL_PRODUCER",
  "FAIR_CARNIVAL_PUBLIC_SHOW_OPERATOR",
  "MASS_PARTICIPATION_EVENT_OPERATOR",
  "CORPORATE_TEAM_BUILDING_OPERATOR",
  "MUNICIPAL_CITY_EVENTS_ORGANISATION",
  "DESTINATION_TOURISM_ORGANISATION",
  "PARKS_RECREATION_EVENT_OPERATOR",
  "BUSINESS_IMPROVEMENT_PLACE_MANAGER",
  "VENUE_PROGRAMMING_OPERATOR",
  "VENUE_MANAGEMENT_COMPANY",
  "EXHIBITION_CONSUMER_SHOW_ORGANISER",
  "RESORT_HOSPITALITY_OPERATOR",
  "HOLIDAY_PARK_OPERATOR",
  "SHOPPING_CENTRE_MIXED_USE_OPERATOR",
  "SPORTS_ENTERTAINMENT_OPERATOR",
  "MUSEUM_SCIENCE_CENTRE_OPERATOR",
  "ZOO_AQUARIUM_OPERATOR",
  "EXPERIENTIAL_EVENT_AGENCY",
  "BRAND_ACTIVATION_AGENCY",
  "LIVE_EVENT_PRODUCTION_COMPANY",
  "DESTINATION_MANAGEMENT_COMPANY",
  "REGIONAL_LICENSEE_OPERATING_PARTNER",
  "EVENT_IP_OWNER_LICENSOR",
  "LEISURE_ENTERTAINMENT_GROUP",
  "REAL_ESTATE_PLACEMAKING_DEVELOPER",
  "BRAND_SPONSORSHIP_BUYER",
  "PUBLIC_EVENT_CONTRACTOR",
] as const;

export type ProspectAccountCategory = (typeof PROSPECT_ACCOUNT_CATEGORIES)[number];

export const FEATURED_PROSPECT_ACCOUNT_CATEGORIES = [
  "TICKETED_EVENT_PROMOTER",
  "TOURING_ATTRACTION_OPERATOR",
  "FAMILY_ATTRACTION_OPERATOR",
  "FESTIVAL_PRODUCER",
  "VENUE_PROGRAMMING_OPERATOR",
  "MUNICIPAL_CITY_EVENTS_ORGANISATION",
  "REGIONAL_LICENSEE_OPERATING_PARTNER",
  "LEISURE_ENTERTAINMENT_GROUP",
] as const;

export type ProspectCategoryDefinition = {
  value: ProspectAccountCategory;
  label: string;
  group: ProspectCategoryGroup;
  description: string;
  defaultPriority: "P1" | "P2" | "P3";
  likelyProductFit: "THE_MONSTER" | "MEGA_BOUNCE_HOUSE" | "BOTH" | "UNDECIDED";
  suggestedBuyerModels: ProspectBuyerModel[];
  searchHints: string[];
};

function definition(definition: ProspectCategoryDefinition): ProspectCategoryDefinition {
  return definition;
}

export const PROSPECT_CATEGORY_DEFINITIONS = {
  TICKETED_EVENT_PROMOTER: definition({
    value: "TICKETED_EVENT_PROMOTER",
    label: "Ticketed event promoter",
    group: "PROMOTERS_AND_EVENT_OPERATORS",
    description: "Promotes live ticketed events, tours, or seasonal public attractions.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["PROMOTER", "AGENCY", "PROGRAMMER"],
    searchHints: ["ticketed event promoter", "live events promoter", "tour promoter", "promoter partnership"],
  }),
  TOURING_ATTRACTION_OPERATOR: definition({
    value: "TOURING_ATTRACTION_OPERATOR",
    label: "Touring attraction operator",
    group: "PROMOTERS_AND_EVENT_OPERATORS",
    description: "Operates touring attractions, pop-ups, and multi-city family experiences.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER", "PROMOTER"],
    searchHints: ["touring attraction operator", "touring attraction", "pop-up attraction", "multi-city attraction"],
  }),
  IMMERSIVE_EXPERIENCE_OPERATOR: definition({
    value: "IMMERSIVE_EXPERIENCE_OPERATOR",
    label: "Immersive experience operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Runs immersive, interactive, or experiential visitor experiences.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER", "AGENCY"],
    searchHints: ["immersive experience operator", "immersive attraction", "experiential experience", "interactive attraction"],
  }),
  FAMILY_ATTRACTION_OPERATOR: definition({
    value: "FAMILY_ATTRACTION_OPERATOR",
    label: "Family attraction operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Operates family-focused attractions, leisure venues, and paid play experiences.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER", "PROMOTER"],
    searchHints: ["family attraction operator", "family attraction", "leisure operator", "family experience"],
  }),
  THEME_PARK_VISITOR_ATTRACTION_OPERATOR: definition({
    value: "THEME_PARK_VISITOR_ATTRACTION_OPERATOR",
    label: "Theme park or visitor attraction operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Operates theme parks, visitor attractions, or paid-entry leisure destinations.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER"],
    searchHints: ["theme park operator", "visitor attraction operator", "paid attraction", "leisure destination"],
  }),
  FESTIVAL_PRODUCER: definition({
    value: "FESTIVAL_PRODUCER",
    label: "Festival producer",
    group: "FESTIVALS_AND_PUBLIC_EVENTS",
    description: "Produces festivals, seasonal programming, and public event series.",
    defaultPriority: "P1",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PROMOTER", "PROGRAMMER", "PUBLIC_SECTOR"],
    searchHints: ["festival producer", "festival production", "festival programming", "event series"],
  }),
  FAIR_CARNIVAL_PUBLIC_SHOW_OPERATOR: definition({
    value: "FAIR_CARNIVAL_PUBLIC_SHOW_OPERATOR",
    label: "Fair, carnival, or public show operator",
    group: "FESTIVALS_AND_PUBLIC_EVENTS",
    description: "Operates fairs, carnivals, and public showground-style events.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PROMOTER", "OWNER_OPERATOR"],
    searchHints: ["fair operator", "carnival operator", "public show operator", "showground event"],
  }),
  MASS_PARTICIPATION_EVENT_OPERATOR: definition({
    value: "MASS_PARTICIPATION_EVENT_OPERATOR",
    label: "Mass participation event operator",
    group: "FESTIVALS_AND_PUBLIC_EVENTS",
    description: "Runs race, challenge, and participation-led public events.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PROMOTER", "SPONSOR", "PUBLIC_SECTOR"],
    searchHints: ["mass participation event", "challenge event operator", "race organiser", "participation event"],
  }),
  CORPORATE_TEAM_BUILDING_OPERATOR: definition({
    value: "CORPORATE_TEAM_BUILDING_OPERATOR",
    label: "Corporate team-building operator",
    group: "AGENCIES_AND_PARTNERS",
    description: "Delivers corporate away days, incentive events, and team-building programmes.",
    defaultPriority: "P3",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["AGENCY", "PROMOTER"],
    searchHints: ["team building operator", "corporate away day", "incentive event", "corporate experiences"],
  }),
  MUNICIPAL_CITY_EVENTS_ORGANISATION: definition({
    value: "MUNICIPAL_CITY_EVENTS_ORGANISATION",
    label: "Municipal or city events organisation",
    group: "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
    description: "City teams and public bodies that commission events and place-based activation.",
    defaultPriority: "P1",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PUBLIC_SECTOR"],
    searchHints: ["city events organisation", "municipal events", "public events team", "city activation"],
  }),
  DESTINATION_TOURISM_ORGANISATION: definition({
    value: "DESTINATION_TOURISM_ORGANISATION",
    label: "Destination tourism organisation",
    group: "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
    description: "Destination marketing organisations and tourism teams with event programming influence.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["PUBLIC_SECTOR", "PROMOTER"],
    searchHints: ["destination tourism organisation", "destination marketing", "tourism board events", "visitor economy"],
  }),
  PARKS_RECREATION_EVENT_OPERATOR: definition({
    value: "PARKS_RECREATION_EVENT_OPERATOR",
    label: "Parks or recreation event operator",
    group: "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
    description: "Operates park-based recreation programmes, public leisure events, or seasonal activations.",
    defaultPriority: "P3",
    likelyProductFit: "MEGA_BOUNCE_HOUSE",
    suggestedBuyerModels: ["PUBLIC_SECTOR", "OWNER_OPERATOR"],
    searchHints: ["parks event operator", "recreation event operator", "park activation", "public leisure event"],
  }),
  BUSINESS_IMPROVEMENT_PLACE_MANAGER: definition({
    value: "BUSINESS_IMPROVEMENT_PLACE_MANAGER",
    label: "Business improvement or place manager",
    group: "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
    description: "Manages place-based activation, town-centre events, and destination improvement.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PUBLIC_SECTOR", "SPONSOR"],
    searchHints: ["place manager", "business improvement district", "town centre events", "destination improvement"],
  }),
  VENUE_PROGRAMMING_OPERATOR: definition({
    value: "VENUE_PROGRAMMING_OPERATOR",
    label: "Venue programming operator",
    group: "VENUES_AND_DESTINATIONS",
    description: "Programs shows, attractions, and ticketed experiences inside a venue or site.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["PROGRAMMER", "OWNER_OPERATOR"],
    searchHints: ["venue programming", "programme operator", "venue operator", "ticketed programming"],
  }),
  VENUE_MANAGEMENT_COMPANY: definition({
    value: "VENUE_MANAGEMENT_COMPANY",
    label: "Venue management company",
    group: "VENUES_AND_DESTINATIONS",
    description: "Manages venues or venue estates on behalf of owners or public clients.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["PROGRAMMER", "OWNER_OPERATOR", "PUBLIC_SECTOR"],
    searchHints: ["venue management company", "venue manager", "managed venue", "venue estate"],
  }),
  EXHIBITION_CONSUMER_SHOW_ORGANISER: definition({
    value: "EXHIBITION_CONSUMER_SHOW_ORGANISER",
    label: "Exhibition or consumer show organiser",
    group: "VENUES_AND_DESTINATIONS",
    description: "Organises consumer shows, exhibitions, and large indoor public events.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PROMOTER", "PROGRAMMER"],
    searchHints: ["consumer show organiser", "exhibition organiser", "show organiser", "public exhibition"],
  }),
  RESORT_HOSPITALITY_OPERATOR: definition({
    value: "RESORT_HOSPITALITY_OPERATOR",
    label: "Resort hospitality operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Operates resorts with guest activity programming and family leisure offers.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER"],
    searchHints: ["resort hospitality operator", "resort events", "family resort", "guest activity programme"],
  }),
  HOLIDAY_PARK_OPERATOR: definition({
    value: "HOLIDAY_PARK_OPERATOR",
    label: "Holiday park operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Runs holiday parks, lodges, or park-based family entertainment sites.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER"],
    searchHints: ["holiday park operator", "holiday park", "caravan park events", "family holiday park"],
  }),
  SHOPPING_CENTRE_MIXED_USE_OPERATOR: definition({
    value: "SHOPPING_CENTRE_MIXED_USE_OPERATOR",
    label: "Shopping-centre or mixed-use operator",
    group: "VENUES_AND_DESTINATIONS",
    description: "Operates shopping centres, retail destinations, or mixed-use public spaces.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PUBLIC_SECTOR", "SPONSOR", "PROGRAMMER"],
    searchHints: ["shopping centre operator", "mixed use destination", "retail destination events", "destination activation"],
  }),
  SPORTS_ENTERTAINMENT_OPERATOR: definition({
    value: "SPORTS_ENTERTAINMENT_OPERATOR",
    label: "Sports and entertainment operator",
    group: "VENUES_AND_DESTINATIONS",
    description: "Runs non-sport entertainment, fan-zone, or sports-adjacent public experiences.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["PROGRAMMER", "PROMOTER"],
    searchHints: ["sports entertainment operator", "fan zone", "arena entertainment", "sports venue programming"],
  }),
  MUSEUM_SCIENCE_CENTRE_OPERATOR: definition({
    value: "MUSEUM_SCIENCE_CENTRE_OPERATOR",
    label: "Museum or science-centre operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Operates museums, science centres, or educational visitor attractions.",
    defaultPriority: "P2",
    likelyProductFit: "MEGA_BOUNCE_HOUSE",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PUBLIC_SECTOR", "PROGRAMMER"],
    searchHints: ["museum operator", "science centre operator", "visitor attraction", "family learning attraction"],
  }),
  ZOO_AQUARIUM_OPERATOR: definition({
    value: "ZOO_AQUARIUM_OPERATOR",
    label: "Zoo or aquarium operator",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Operates zoos, aquariums, and animal-led visitor attractions.",
    defaultPriority: "P2",
    likelyProductFit: "MEGA_BOUNCE_HOUSE",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER"],
    searchHints: ["zoo operator", "aquarium operator", "visitor attraction operator", "animal attraction"],
  }),
  EXPERIENTIAL_EVENT_AGENCY: definition({
    value: "EXPERIENTIAL_EVENT_AGENCY",
    label: "Experiential event agency",
    group: "AGENCIES_AND_PARTNERS",
    description: "Designs and delivers branded or experiential live activations for clients.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["AGENCY", "SPONSOR"],
    searchHints: ["experiential event agency", "live experience agency", "brand activation", "experiential agency"],
  }),
  BRAND_ACTIVATION_AGENCY: definition({
    value: "BRAND_ACTIVATION_AGENCY",
    label: "Brand activation agency",
    group: "AGENCIES_AND_PARTNERS",
    description: "Plans brand activations, sponsorship moments, and experiential campaigns.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["AGENCY", "SPONSOR"],
    searchHints: ["brand activation agency", "activation agency", "brand experience", "sponsorship activation"],
  }),
  LIVE_EVENT_PRODUCTION_COMPANY: definition({
    value: "LIVE_EVENT_PRODUCTION_COMPANY",
    label: "Live event production company",
    group: "AGENCIES_AND_PARTNERS",
    description: "Produces live events, touring shows, and technical event delivery.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["AGENCY", "PROMOTER"],
    searchHints: ["live event production company", "event production", "show production", "touring production"],
  }),
  DESTINATION_MANAGEMENT_COMPANY: definition({
    value: "DESTINATION_MANAGEMENT_COMPANY",
    label: "Destination management company",
    group: "AGENCIES_AND_PARTNERS",
    description: "Delivers destination experiences, corporate travel, and packaged live events.",
    defaultPriority: "P3",
    likelyProductFit: "UNDECIDED",
    suggestedBuyerModels: ["AGENCY", "PUBLIC_SECTOR"],
    searchHints: ["destination management company", "DMC events", "destination experiences", "event agency"],
  }),
  REGIONAL_LICENSEE_OPERATING_PARTNER: definition({
    value: "REGIONAL_LICENSEE_OPERATING_PARTNER",
    label: "Regional licensee or operating partner",
    group: "RIGHTS_LICENSING_AND_SPONSORSHIP",
    description: "Holds regional operating rights or licence delivery responsibility.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["LICENSEE", "PROMOTER"],
    searchHints: ["regional licensee", "operating partner", "licensed attraction", "regional partner"],
  }),
  EVENT_IP_OWNER_LICENSOR: definition({
    value: "EVENT_IP_OWNER_LICENSOR",
    label: "Event IP owner or licensor",
    group: "RIGHTS_LICENSING_AND_SPONSORSHIP",
    description: "Owns event intellectual property, licensing rights, or touring formats.",
    defaultPriority: "P2",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["RIGHTS_HOLDER", "LICENSEE"],
    searchHints: ["event IP owner", "event licensor", "format rights", "touring IP"],
  }),
  LEISURE_ENTERTAINMENT_GROUP: definition({
    value: "LEISURE_ENTERTAINMENT_GROUP",
    label: "Leisure and entertainment group",
    group: "ATTRACTIONS_AND_LEISURE",
    description: "Owns or operates a portfolio of leisure, family, and entertainment assets.",
    defaultPriority: "P1",
    likelyProductFit: "BOTH",
    suggestedBuyerModels: ["OWNER_OPERATOR", "PROGRAMMER", "SPONSOR"],
    searchHints: ["leisure entertainment group", "family entertainment group", "attractions group", "portfolio operator"],
  }),
  REAL_ESTATE_PLACEMAKING_DEVELOPER: definition({
    value: "REAL_ESTATE_PLACEMAKING_DEVELOPER",
    label: "Real-estate placemaking developer",
    group: "PUBLIC_SECTOR_AND_PLACE_MANAGEMENT",
    description: "Uses events and attractions to support placemaking and development outcomes.",
    defaultPriority: "P3",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PUBLIC_SECTOR", "SPONSOR"],
    searchHints: ["placemaking developer", "destination development", "real estate events", "mixed-use development"],
  }),
  BRAND_SPONSORSHIP_BUYER: definition({
    value: "BRAND_SPONSORSHIP_BUYER",
    label: "Brand sponsorship buyer",
    group: "RIGHTS_LICENSING_AND_SPONSORSHIP",
    description: "Buys sponsorship, brand partnerships, or experiential media inventory.",
    defaultPriority: "P3",
    likelyProductFit: "UNDECIDED",
    suggestedBuyerModels: ["SPONSOR", "AGENCY"],
    searchHints: ["brand sponsorship buyer", "sponsorship buyer", "brand partnerships", "experiential sponsorship"],
  }),
  PUBLIC_EVENT_CONTRACTOR: definition({
    value: "PUBLIC_EVENT_CONTRACTOR",
    label: "Public event contractor",
    group: "PROMOTERS_AND_EVENT_OPERATORS",
    description: "Delivers public events or contracts live experience delivery for others.",
    defaultPriority: "P2",
    likelyProductFit: "THE_MONSTER",
    suggestedBuyerModels: ["PROMOTER", "PUBLIC_SECTOR", "AGENCY"],
    searchHints: ["public event contractor", "event contractor", "public event delivery", "event delivery contractor"],
  }),
} as const satisfies Record<ProspectAccountCategory, ProspectCategoryDefinition>;

export const PROSPECT_CATEGORY_DEFINITION_LIST = PROSPECT_ACCOUNT_CATEGORIES.map((value) => PROSPECT_CATEGORY_DEFINITIONS[value]);

export const ProspectAccountCategorySchema = z.enum(PROSPECT_ACCOUNT_CATEGORIES);
export const ProspectBuyerModelSchema = z.enum(PROSPECT_BUYER_MODELS);
export const ProspectCategoryGroupSchema = z.enum(PROSPECT_CATEGORY_GROUPS);

export const ProspectAccountClassificationSchema = z.object({
  primaryCategory: ProspectAccountCategorySchema,
  secondaryCategories: z.array(ProspectAccountCategorySchema).max(6).default(() => []),
  subtypes: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  buyerModel: ProspectBuyerModelSchema,
}).superRefine((value, ctx) => {
  const secondary = new Set(value.secondaryCategories);
  if (secondary.has(value.primaryCategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secondaryCategories"],
      message: "Secondary categories must not include the primary category.",
    });
  }
  if (secondary.size !== value.secondaryCategories.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secondaryCategories"],
      message: "Secondary categories must be unique.",
    });
  }
  if (value.subtypes && new Set(value.subtypes).size !== value.subtypes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subtypes"],
      message: "Subtypes must be unique.",
    });
  }
});

export type ProspectAccountClassification = z.infer<typeof ProspectAccountClassificationSchema>;

export const ProspectCategorySelectionSchema = z.array(ProspectAccountCategorySchema).min(1).max(6).superRefine((values, ctx) => {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selected categories must be unique.",
    });
  }
});

export type ProspectCategorySelection = z.infer<typeof ProspectCategorySelectionSchema>;

export function getProspectCategoryDefinition(value: ProspectAccountCategory): ProspectCategoryDefinition {
  return PROSPECT_CATEGORY_DEFINITIONS[value];
}

export function getProspectCategoryLabel(value: ProspectAccountCategory): string {
  return PROSPECT_CATEGORY_DEFINITIONS[value].label;
}

export function getProspectCategorySearchText(value: ProspectAccountCategory): string {
  const definition = PROSPECT_CATEGORY_DEFINITIONS[value];
  return [definition.label, definition.description, ...definition.searchHints].join(" ").toLowerCase();
}

export function getDefaultBuyerModelForCategory(value: ProspectAccountCategory): ProspectBuyerModel {
  return PROSPECT_CATEGORY_DEFINITIONS[value].suggestedBuyerModels[0] ?? "OWNER_OPERATOR";
}

export function coerceProspectAccountClassification(raw: unknown): ProspectAccountClassification {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = raw as Partial<ProspectAccountClassification> & { categories?: unknown };
    if ("primaryCategory" in value || "buyerModel" in value || "secondaryCategories" in value) {
      const primaryCategory = value.primaryCategory as ProspectAccountCategory | undefined;
      return ProspectAccountClassificationSchema.parse({
        primaryCategory,
        secondaryCategories: value.secondaryCategories,
        subtypes: value.subtypes,
        buyerModel: value.buyerModel ?? (primaryCategory ? getDefaultBuyerModelForCategory(primaryCategory) : undefined),
      });
    }
    if (Array.isArray(value.categories) && value.categories.length > 0) {
      const categories = value.categories.filter((item): item is ProspectAccountCategory =>
        typeof item === "string" && (PROSPECT_ACCOUNT_CATEGORIES as readonly string[]).includes(item),
      );
      if (categories.length > 0) {
        return ProspectAccountClassificationSchema.parse({
          primaryCategory: categories[0],
          secondaryCategories: categories.slice(1),
          buyerModel: getDefaultBuyerModelForCategory(categories[0]),
        });
      }
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const categories = raw.filter((item): item is ProspectAccountCategory =>
      typeof item === "string" && (PROSPECT_ACCOUNT_CATEGORIES as readonly string[]).includes(item),
    );
    if (categories.length > 0) {
      return ProspectAccountClassificationSchema.parse({
        primaryCategory: categories[0],
        secondaryCategories: categories.slice(1),
        buyerModel: getDefaultBuyerModelForCategory(categories[0]),
      });
    }
  }
  throw new Error("INVALID_PROSPECT_ACCOUNT_CLASSIFICATION");
}
