/**
 * Seed menu — used by prisma/seed.ts to populate the database.
 * Every image URL below was checked to resolve (HTTP 200) and visually matched to its dish.
 */
import type { DietaryTag } from "@/lib/constants";

export const unsplash = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/photo-${photoId}?w=${width}&q=80&auto=format&fit=crop`;

/** Verified Unsplash photo ids, keyed by what they actually show. */
export const PHOTOS = {
  smashBurger: "1568901346375-23c9450c58cd",
  sliderBurgers: "1550547660-d9450f859349",
  brisketBurger: "1553979459-d2229ba7433b",
  mixedGrill: "1555939594-58d7cb561ad1",
  steakFrites: "1600891964092-4316c288032e",
  fries: "1573080496219-bb080dd4f877",
  pepperPizza: "1565299624946-b28f40a0ae38",
  rusticPizza: "1513104890138-7c749659a591",
  penne: "1621996346565-e3dbc646d9a9",
  farfalle: "1473093295043-cdd812d0e601",
  harvestBowl: "1512621776951-a57141f2eefd",
  salmonBowl: "1546069901-ba9599a7e63c",
  beefSalad: "1504674900247-0877df9cc836",
  tacos: "1565299585323-38d6b0865b47",
  pancakes: "1567620905732-2d1ec7ab7445",
  waffles: "1562376552-0d160a2f238d",
  benedict: "1608039829572-78524f79c4c7",
  eggToast: "1533089860892-a7c6f0a88666",
  donuts: "1551024601-bec78aea704b",
  chocolateCake: "1578985545062-69928b1d9587",
  cheesecake: "1533134242443-d4fd215305ad",
  tiramisu: "1571877227200-a0d98ea607e9",
  brownie: "1606313564200-e75d5e30476c",
  softServe: "1497034825429-c343d7c6a68f",
  oldFashioned: "1514362545857-3bc16c4c7d1b",
  mojito: "1551538827-9c037cb4f32a",
  lemonade: "1621263764928-df1444c5e859",
  milkshake: "1572490122747-3968b75cc699",
  flatWhite: "1509042239860-f550ce710b93",
  // Brand / atmosphere
  diningRoom: "1517248135467-4c7edcad34c4",
  warmInterior: "1552566626-52f8b828add9",
  chefPlating: "1577219491135-ce391730fb2c",
  openKitchen: "1556910103-1c02745aae4d",
  fineDiningTable: "1414235077428-338989a2e8c0",
  terrace: "1559339352-11d035aa65de",
  bar: "1514933651103-005eec06c04b",
} as const;

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
}

export interface SeedMenuItem {
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  priceCents: number;
  photo: keyof typeof PHOTOS;
  dietaryTags: DietaryTag[];
  calories?: number;
  isFeatured?: boolean;
  dineInOnly?: boolean;
}

export const seedCategories: SeedCategory[] = [
  { slug: "burgers-grill", name: "Burgers & Grill", description: "Smashed, seared and kissed by the wood fire." },
  { slug: "wood-fired", name: "Pizza & Pasta", description: "Blistered crusts from a 900°F oven and pasta rolled every morning." },
  { slug: "bowls-greens", name: "Bowls & Greens", description: "Bright, crunchy, and built to keep you going." },
  { slug: "brunch", name: "Weekend Brunch", description: "Saturday & Sunday, 10am – 3pm." },
  { slug: "desserts", name: "Desserts", description: "Baked in-house. Worth saving room for." },
  { slug: "drinks", name: "Drinks", description: "Smoked cocktails, fresh lemonade and proper coffee." },
];

export const seedMenuItems: SeedMenuItem[] = [
  // Burgers & Grill
  { slug: "smash-double-burger", categorySlug: "burgers-grill", name: "Smash Double Burger", description: "Two smashed dry-aged patties, American cheese, house pickles and ember sauce on a potato bun.", priceCents: 63000, photo: "smashBurger", dietaryTags: [], calories: 980, isFeatured: true },
  { slug: "brisket-stack", categorySlug: "burgers-grill", name: "Brisket Stack", description: "12-hour smoked brisket, aged cheddar, charred red onion and pickled cabbage.", priceCents: 74000, photo: "brisketBurger", dietaryTags: [], calories: 1120 },
  { slug: "slider-duo", categorySlug: "burgers-grill", name: "Slider Duo", description: "Two mini burgers with caramelised onion, gruyère and garlic aioli.", priceCents: 53000, photo: "sliderBurgers", dietaryTags: [], calories: 760 },
  { slug: "mixed-grill-skewers", categorySlug: "burgers-grill", name: "Mixed Grill Skewers", description: "Chicken thigh and lamb kofta over live fire, blistered peppers, garlic toum.", priceCents: 91000, photo: "mixedGrill", dietaryTags: ["gluten-free", "dairy-free"], calories: 840 },
  { slug: "steak-frites", categorySlug: "burgers-grill", name: "Steak Frites", description: "10oz hanger steak, smoked herb butter and hand-cut rosemary fries.", priceCents: 122000, photo: "steakFrites", dietaryTags: ["gluten-free"], calories: 1250, isFeatured: true },
  { slug: "truffle-parmesan-fries", categorySlug: "burgers-grill", name: "Truffle Parmesan Fries", description: "Twice-cooked fries, truffle salt, parmesan snow and parsley.", priceCents: 34000, photo: "fries", dietaryTags: ["vegetarian", "gluten-free"], calories: 540 },

  // Pizza & Pasta
  { slug: "ember-margherita", categorySlug: "wood-fired", name: "Ember Margherita", description: "San Marzano tomato, fior di latte, roasted cherry tomatoes and rosemary oil.", priceCents: 65000, photo: "rusticPizza", dietaryTags: ["vegetarian"], calories: 890, isFeatured: true },
  { slug: "roasted-pepper-pizza", categorySlug: "wood-fired", name: "Roasted Pepper Pizza", description: "Fire-roasted peppers, red onion, oregano and smoked mozzarella.", priceCents: 70000, photo: "pepperPizza", dietaryTags: ["vegetarian"], calories: 940 },
  { slug: "penne-arrabbiata", categorySlug: "wood-fired", name: "Penne Arrabbiata", description: "Fresh penne, Calabrian chilli, garlic and slow-cooked tomato.", priceCents: 68000, photo: "penne", dietaryTags: ["vegan", "spicy"], calories: 720 },
  { slug: "farfalle-garden-pasta", categorySlug: "wood-fired", name: "Farfalle Garden Pasta", description: "Bow-tie pasta, basil pesto, heirloom tomatoes and wild rocket.", priceCents: 61000, photo: "farfalle", dietaryTags: ["vegetarian", "contains-nuts"], calories: 680 },

  // Bowls & Greens
  { slug: "harvest-bowl", categorySlug: "bowls-greens", name: "Harvest Bowl", description: "Roasted sweet potato, chickpeas, avocado, pickled radish and tahini dressing.", priceCents: 59000, photo: "harvestBowl", dietaryTags: ["vegan", "gluten-free"], calories: 610, isFeatured: true },
  { slug: "salmon-power-bowl", categorySlug: "bowls-greens", name: "Salmon Power Bowl", description: "Charred salmon, soft egg, sweet corn, purple cabbage and citrus greens.", priceCents: 72000, photo: "salmonBowl", dietaryTags: ["gluten-free", "dairy-free"], calories: 650 },
  { slug: "charred-beef-salad", categorySlug: "bowls-greens", name: "Charred Beef Salad", description: "Sliced flank steak, chilli-lime dressing, herbs and toasted cashews.", priceCents: 70000, photo: "beefSalad", dietaryTags: ["gluten-free", "dairy-free", "spicy", "contains-nuts"], calories: 590 },
  { slug: "corn-chickpea-tacos", categorySlug: "bowls-greens", name: "Corn & Chickpea Tacos", description: "Three soft tortillas, charred corn, smoky chickpeas, lime crema and pico.", priceCents: 57000, photo: "tacos", dietaryTags: ["vegetarian", "spicy"], calories: 700 },

  // Weekend Brunch
  { slug: "buttermilk-pancakes", categorySlug: "brunch", name: "Buttermilk Pancakes", description: "A tall stack with maple syrup, whipped butter and fresh berries.", priceCents: 51000, photo: "pancakes", dietaryTags: ["vegetarian"], calories: 820, isFeatured: true },
  { slug: "belgian-waffles", categorySlug: "brunch", name: "Belgian Waffles", description: "Pearl-sugar waffles, blueberry compote and vanilla crème fraîche.", priceCents: 49000, photo: "waffles", dietaryTags: ["vegetarian"], calories: 760 },
  { slug: "smoked-salmon-benedict", categorySlug: "brunch", name: "Smoked Salmon Benedict", description: "Poached eggs, house-smoked salmon and brown-butter hollandaise on an English muffin.", priceCents: 63000, photo: "benedict", dietaryTags: [], calories: 780 },
  { slug: "sunny-sourdough", categorySlug: "brunch", name: "Sunny Sourdough", description: "Grilled sourdough, a crispy fried egg and blistered tomatoes.", priceCents: 46000, photo: "eggToast", dietaryTags: ["vegetarian"], calories: 540 },

  // Desserts
  { slug: "sprinkle-donut-stack", categorySlug: "desserts", name: "Sprinkle Donut Stack", description: "Three brioche donuts, chocolate glaze and rainbow sprinkles.", priceCents: 42000, photo: "donuts", dietaryTags: ["vegetarian"], calories: 910, isFeatured: true },
  { slug: "triple-chocolate-cake", categorySlug: "desserts", name: "Triple Chocolate Cake", description: "Dark chocolate sponge, ganache and whipped cocoa buttercream.", priceCents: 46000, photo: "chocolateCake", dietaryTags: ["vegetarian"], calories: 870 },
  { slug: "blueberry-cheesecake", categorySlug: "desserts", name: "Blueberry Cheesecake", description: "Classic baked cheesecake with a wild blueberry topping.", priceCents: 42000, photo: "cheesecake", dietaryTags: ["vegetarian"], calories: 690 },
  { slug: "classic-tiramisu", categorySlug: "desserts", name: "Classic Tiramisu", description: "Espresso-soaked savoiardi, mascarpone cream and cocoa.", priceCents: 44000, photo: "tiramisu", dietaryTags: ["vegetarian"], calories: 620 },
  { slug: "salted-fudge-brownie", categorySlug: "desserts", name: "Salted Fudge Brownie", description: "Warm fudge brownie, flaky sea salt and a chocolate drizzle.", priceCents: 34000, photo: "brownie", dietaryTags: ["vegetarian"], calories: 580 },
  { slug: "strawberry-soft-serve", categorySlug: "desserts", name: "Strawberry Soft Serve", description: "Fresh strawberry soft serve in a crisp waffle cone.", priceCents: 27000, photo: "softServe", dietaryTags: ["vegetarian"], calories: 340 },

  // Drinks
  { slug: "smoked-old-fashioned", categorySlug: "drinks", name: "Smoked Old Fashioned", description: "Bourbon, demerara, orange bitters, smoked over cherry wood.", priceCents: 61000, photo: "oldFashioned", dietaryTags: ["vegan", "gluten-free"], isFeatured: true, dineInOnly: true },
  { slug: "garden-mojito", categorySlug: "drinks", name: "Garden Mojito", description: "White rum, lime, mint and soda.", priceCents: 53000, photo: "mojito", dietaryTags: ["vegan", "gluten-free"], dineInOnly: true },
  { slug: "fresh-mint-lemonade", categorySlug: "drinks", name: "Fresh Mint Lemonade", description: "Squeezed to order with mint and a touch of cane sugar.", priceCents: 25000, photo: "lemonade", dietaryTags: ["vegan", "gluten-free"], calories: 180 },
  { slug: "cookies-cream-shake", categorySlug: "drinks", name: "Cookies & Cream Shake", description: "Vanilla bean ice cream, crushed chocolate cookies and whipped cream.", priceCents: 32000, photo: "milkshake", dietaryTags: ["vegetarian"], calories: 720 },
  { slug: "flat-white", categorySlug: "drinks", name: "Flat White", description: "Double ristretto with silky steamed milk.", priceCents: 19000, photo: "flatWhite", dietaryTags: ["vegetarian", "gluten-free"], calories: 120 },
];
