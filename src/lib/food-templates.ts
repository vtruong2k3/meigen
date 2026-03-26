/**
 * Food & Drink AI — Prompt Templates
 *
 * These templates are extracted from high-performing trending prompts
 * in the gallery. When a user uploads a food/product image, the AI
 * analyzes it, selects the best matching template, and fills in the
 * placeholders with the analyzed data.
 */

export interface FoodTemplate {
  id: string;
  name: string;
  /** Short Vietnamese label for UI */
  label: string;
  /** Which product categories this template works best for */
  categories: FoodCategory[];
  /** Preview image from gallery */
  imagePreview: string;
  /** The prompt template with placeholders */
  template: string;
}

export type FoodCategory =
  | "dish"       // món ăn (phở, bún, cơm...)
  | "beverage"   // đồ uống (cà phê, trà sữa, nước ép...)
  | "dessert"    // bánh, chè, kem...
  | "snack"      // snack, đồ ăn vặt
  | "packaged";  // sản phẩm đóng gói có brand

/**
 * Template 1: Food Infographic — Levitating Ingredients
 * Based on trending prompt #11 (Taaruk — Indonesian food infographic)
 * Best for: dishes with multiple visible ingredients
 */
const FOOD_INFOGRAPHIC_LEVITATING: FoodTemplate = {
  id: "food-infographic-levitating",
  name: "Food Infographic — Levitating",
  label: "Infographic bay",
  categories: ["dish"],
  imagePreview: "https://images.meigen.ai/tweets/2017865644365255078/0.jpg",
  template: `{
  "image_prompt": {
    "type": "Hyper-realistic food infographic",
    "subject": {
      "cuisine": "[CUISINE]",
      "dish_name": "[DISH_NAME]",
      "base_element": "Traditional bowl with steaming hot [DISH_NAME] at the bottom",
      "levitating_ingredients": [INGREDIENTS_ARRAY]
    },
    "composition": {
      "layout": "Clean vertical composition",
      "arrangement": "Realistic gravity-defying/floating elements",
      "background": "[BACKGROUND_SURFACE]",
      "visual_hierarchy": "Bowl anchored at bottom, ingredients rising vertically"
    },
    "graphic_design_elements": {
      "labels": "Clear text labels for each ingredient",
      "lines": "Thin white pointing lines connecting labels to ingredients",
      "style": "Editorial infographic layout, professional food magazine style"
    },
    "lighting_and_mood": {
      "lighting": "Cinematic studio lighting",
      "color_palette": "[COLOR_PALETTE]",
      "effects": "Dramatic steam, motion-frozen ingredients"
    },
    "technical_specs": {
      "camera_settings": "Shallow depth of field, sharp focus, DSLR look",
      "details": "Ultra-detailed textures on every ingredient",
      "resolution": "8K ultra-realistic"
    }
  }
}`,
};

/**
 * Template 2: Product Commercial — Splash Effect
 * Based on trending prompt #15 (Meem — protein drink / Nescafé)
 * Best for: bottled/canned beverages, packaged drinks
 */
const PRODUCT_COMMERCIAL_SPLASH: FoodTemplate = {
  id: "product-commercial-splash",
  name: "Product Commercial — Splash",
  label: "Quảng cáo splash",
  categories: ["beverage", "packaged"],
  imagePreview: "https://images.meigen.ai/tweets/2017420332458774791/0.jpg",
  template: `{
  "master_prompt": {
    "global_settings": {
      "resolution": "8K ultra-high-definition",
      "aspect_ratio": "3:4 vertical",
      "style": "hyper-realistic AI-edited commercial product photography",
      "sharpness": "extreme clarity, micro-detail visibility",
      "lighting_quality": "cinematic studio lighting with controlled highlights and shadows",
      "motion_freeze": "high-speed capture, frozen splashes and particles"
    },
    "product": {
      "type": "[PRODUCT_TYPE]",
      "color": "[PRODUCT_COLOR]",
      "surface_details": "[SURFACE_DETAILS]",
      "brand_name": "[BRAND_NAME]",
      "branding_text_visible": [BRANDING_TEXT_ARRAY]
    },
    "pose_and_orientation": {
      "position": "upright, centered",
      "angle": "front-facing hero product stance",
      "presence": "dynamic, leaning into splash"
    },
    "liquid_and_motion": {
      "liquid_color": "[LIQUID_COLOR]",
      "motion": "splash erupting from base",
      "droplet_behavior": "fine droplets scattered outward"
    },
    "floating_elements": [FLOATING_ELEMENTS_ARRAY],
    "background": {
      "color_palette": "[BG_COLOR_PALETTE]",
      "atmosphere": "warm, intense, premium feel",
      "bokeh": "soft circular light particles scattered throughout"
    },
    "surface_and_reflection": {
      "base": "wet surface with liquid splash crown",
      "reflection_quality": "subtle reflective highlights"
    }
  }
}`,
};

/**
 * Template 3: Recipe Infographic — Editorial Layout
 * Based on trending prompt #24 (briyani recipe infographic)
 * Best for: dishes where you want to show the recipe
 */
const RECIPE_INFOGRAPHIC: FoodTemplate = {
  id: "recipe-infographic",
  name: "Recipe Infographic",
  label: "Infographic công thức",
  categories: ["dish", "dessert"],
  imagePreview: "https://images.meigen.ai/tweets/2013186574390046844/0.jpg",
  template: `Ultra-clean modern recipe infographic. Showcase [DISH_NAME] in a visually appealing finished form—sliced, plated, or portioned—floating slightly in perspective or angled view.

Arrange ingredients, steps, and tips around the dish in a dynamic editorial layout.

Ingredients Section: Include icons or mini illustrations for each ingredient with quantities.
Ingredients: [INGREDIENTS_LIST]

Steps Section: Show preparation steps with numbered panels, arrows, or lines, forming a logical flow around the main dish.

Additional Info: Total calories, prep/cook time, servings, spice level—displayed as clean bubbles or badges near the dish.

Visual Style: Editorial infographic meets lifestyle food photography. Vibrant, natural food colors ([COLOR_PALETTE]), subtle drop shadows, clean vector icons, modern typography. Soft gradients for step panels.

Composition: [DISH_NAME] as hero visual (perspective or angled). Ingredients and steps flow dynamically around the dish. Clear visual hierarchy.

Lighting & Background: Soft, natural studio lighting, minimal textured or gradient background for premium editorial feel.
Output: 1080×1080, ultra-crisp, social-feed optimized, no watermark.`,
};

/**
 * Template 4: Dessert Photography — Commercial
 * Based on trending prompt #28 (Kaan — baklava dessert photography)
 * Best for: desserts, pastries, sweets
 */
const DESSERT_PHOTOGRAPHY: FoodTemplate = {
  id: "dessert-photography",
  name: "Dessert Photography — Commercial",
  label: "Ảnh dessert cao cấp",
  categories: ["dessert"],
  imagePreview: "https://images.meigen.ai/tweets/2009204329236828239/0.jpg",
  template: `{
  "resolution": "8K UHD",
  "aspect_ratio": "3:4",
  "image_style": "hyper-realistic commercial dessert photography",
  "global_settings": {
    "quality": "Ultra-high detail, razor-sharp focus, luxury dessert clarity",
    "lighting": "Controlled studio lighting emphasizing texture, layers, and highlights",
    "motion": "Frozen mid-air elements with subtle gravity realism",
    "background_style": "[BG_STYLE]",
    "camera": "High-speed photography look, shallow to medium depth of field"
  },
  "scene_description": "[SCENE_DESCRIPTION]",
  "dessert": {
    "type": "[DESSERT_TYPE]",
    "layers": "[LAYER_DESCRIPTION]",
    "position": "Stacked and floating mid-air"
  },
  "details": {
    "toppings": [TOPPINGS_ARRAY],
    "sauce": "[SAUCE_DESCRIPTION]"
  },
  "motion_effects": {
    "splashes": "Micro sauce splashes on impact points",
    "particles": "Floating crumbs and fragments",
    "steam": "Subtle steam if served warm"
  },
  "background": {
    "color": "[BG_COLOR]",
    "tone": "High contrast, luxury feel"
  }
}`,
};

/**
 * Template 5: Product Storyboard — 3×3 Grid
 * Based on trending prompt #2 (Daria — 3×3 storyboard grid)
 * Best for: packaged products with clear branding
 */
const PRODUCT_STORYBOARD: FoodTemplate = {
  id: "product-storyboard",
  name: "Product Storyboard — 3×3 Grid",
  label: "Storyboard 3×3",
  categories: ["packaged", "beverage"],
  imagePreview: "https://images.meigen.ai/tweets/2013268963266904438/0.jpg",
  template: `Create ONE final image.

A clean 3×3 storyboard grid with nine equal sized panels on 4:5 ratio.

Use the reference image as the base product reference. Keep the same product ([PRODUCT_NAME] by [BRAND_NAME]), packaging design, branding, materials, colors ([PRODUCT_COLORS]), proportions and overall identity across all nine panels exactly as the reference. The product must remain clearly recognizable in every frame. The label, logo and proportions must stay exactly the same.

This storyboard is a high-end designer mockup presentation for a branding portfolio. The focus is on form, composition, materiality and visual rhythm.

FRAME 1: Front-facing hero shot of the product in a clean studio setup. Neutral background, balanced composition.
FRAME 2: Close-up shot focusing on surface texture, materials and print details.
FRAME 3: Product placed in an environment that naturally fits [PRODUCT_CATEGORY]. Studio setting inspired by the product design elements and colours.
FRAME 4: Product shown in use or interaction on a neutral studio background.
FRAME 5: Isometric composition showing multiple products arranged in a precise geometric order from the top isometric angle.
FRAME 6: Product levitating slightly tilted on a neutral background matching [PRODUCT_COLORS] palette.
FRAME 7: Extreme close-up focusing on a specific detail of the label, edge, texture or material.
FRAME 8: Product in an unexpected yet aesthetically strong setting that feels bold and editorial.
FRAME 9: Wide composition showing the product in use within a refined designer setup.

CAMERA & STYLE: Ultra high-quality studio imagery. Different camera angles and framings across frames. Controlled depth of field, precise lighting, accurate materials and reflections.

OUTPUT: A clean 3×3 grid with no borders, no text, no captions and no watermarks.`,
};

/**
 * Template 6: Snack Technical Infographic
 * Based on trending prompt #39 (TechieSA — snack infographic)
 * Best for: packaged snacks with brand colors
 */
const SNACK_TECHNICAL: FoodTemplate = {
  id: "snack-technical",
  name: "Snack Technical Infographic",
  label: "Infographic kỹ thuật",
  categories: ["snack", "packaged"],
  imagePreview: "https://images.meigen.ai/tweets/2017669983916982605/0.jpg",
  template: `Create a branded technical infographic of [PRODUCT_NAME], combining a realistic photograph or photoreal render of the product with technical annotation overlays placed directly on top.

Use black ink–style line drawings with strategic [BRAND_COLOR] accents (architectural sketch look) on a pure white studio background, including:
• Key component labels
• Internal cross-section showing structure, layering, or internal design
• Measurements, dimensions, and specifications
• Material callouts with composition and quantities
• Arrows indicating function for primary features and structural integrity
• Sustainability callouts

Title placement: Inside a hand-drawn technical annotation box with accent border reading "[PRODUCT_NAME]" in bold font, positioned in upper corner.

Style & layout rules:
• The realistic product remains clearly visible
• Annotations feel sketched, technical, and architectural
• [BRAND_COLOR] accents used for highlight (20-30% of linework), black for primary technical lines (70-80%)
• Clean composition with balanced negative space
• Educational, food-engineering vibe with premium branding

Visual style: Minimal technical illustration aesthetic, black linework with [BRAND_COLOR] accents over realistic imagery, precise but slightly hand-drawn feel.
Output: 1080×1080, ultra-crisp, social-feed optimized, no watermark.`,
};

/**
 * Template 7: Cake & Dessert Infographic with Labels
 * Based on trending prompt #36 (ShaHid WaNii — cake infographic)
 * Best for: cakes, layered desserts, pastries
 */
const CAKE_INFOGRAPHIC: FoodTemplate = {
  id: "cake-infographic",
  name: "Cake & Dessert Infographic",
  label: "Infographic bánh ngọt",
  categories: ["dessert"],
  imagePreview: "https://images.meigen.ai/tweets/2011994819124752631/0.jpg",
  template: `{
  "global_settings": {
    "resolution": "8K ultra high definition",
    "aspect_ratio": "3:4",
    "camera_style": "studio food photography with cinematic lighting",
    "depth_of_field": "shallow depth of field, sharp subject, soft background",
    "lighting": "soft directional key light, subtle rim light, controlled highlights",
    "style": "hyper-realistic food illustration with editorial infographic overlays",
    "text_design": {
      "ingredient_name_color": "metallic gold",
      "ingredient_description_color": "pure white",
      "font_style": "elegant serif for titles, clean sans-serif for descriptions",
      "indicator_lines": "long, thin, smooth golden lines with rounded corners"
    }
  },
  "scene_description": "[SCENE_DESCRIPTION]",
  "background": {
    "color": "[BG_COLOR]",
    "texture": "smooth gradient",
    "lighting": "even, studio-lit, no harsh shadows"
  },
  "main_subjects": [MAIN_SUBJECTS_ARRAY],
  "visible_ingredients": [INGREDIENTS_ARRAY],
  "motion_elements": [
    "floating fruits or toppings",
    "crumbs suspended in air"
  ],
  "text_labels": [TEXT_LABELS_ARRAY]
}`,
};

/** All available food templates */
export const FOOD_TEMPLATES: FoodTemplate[] = [
  FOOD_INFOGRAPHIC_LEVITATING,
  PRODUCT_COMMERCIAL_SPLASH,
  RECIPE_INFOGRAPHIC,
  DESSERT_PHOTOGRAPHY,
  PRODUCT_STORYBOARD,
  SNACK_TECHNICAL,
  CAKE_INFOGRAPHIC,
];

/** Get templates that match a given food category */
export function getTemplatesForCategory(category: FoodCategory): FoodTemplate[] {
  return FOOD_TEMPLATES.filter((t) => t.categories.includes(category));
}

/** Get a template by ID */
export function getTemplateById(id: string): FoodTemplate | undefined {
  return FOOD_TEMPLATES.find((t) => t.id === id);
}
