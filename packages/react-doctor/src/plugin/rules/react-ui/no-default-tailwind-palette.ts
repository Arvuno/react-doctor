import {
  TAILWIND_DEFAULT_PALETTE_NAMES,
  TAILWIND_DEFAULT_PALETTE_STOPS,
  TAILWIND_PALETTE_UTILITY_PREFIXES,
} from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getClassNameLiteral = (classAttribute: EsTreeNode): string | null => {
  if (!classAttribute.value) return null;
  if (classAttribute.value.type === "Literal" && typeof classAttribute.value.value === "string") {
    return classAttribute.value.value;
  }
  if (classAttribute.value.type === "JSXExpressionContainer") {
    const expression = classAttribute.value.expression;
    if (expression?.type === "Literal" && typeof expression.value === "string") {
      return expression.value;
    }
    if (expression?.type === "TemplateLiteral" && expression.quasis?.length === 1) {
      return expression.quasis[0].value?.raw ?? null;
    }
  }
  return null;
};

const buildDefaultPaletteRegex = (): RegExp => {
  const utilityPrefixGroup = TAILWIND_PALETTE_UTILITY_PREFIXES.join("|");
  const paletteNameGroup = TAILWIND_DEFAULT_PALETTE_NAMES.join("|");
  // HACK: anchor the numeric group to the actual Tailwind palette stops
  // rather than `\d{2,3}`. Custom Tailwind themes that re-purpose the
  // utility prefix for a non-Tailwind scale (e.g. Radix Colors uses
  // `gray.1` … `gray.12`) would otherwise false-positive on `text-gray-11`,
  // `fill-gray-12`, etc. — those aren't the Tailwind template default.
  const paletteStopGroup = TAILWIND_DEFAULT_PALETTE_STOPS.join("|");
  // HACK: /g so we can iterate every default-palette token in one
  // className. Without /g the user fixes one token, re-runs, sees the
  // next, fixes that, re-runs… N round-trips for N tokens in a single
  // attribute.
  return new RegExp(
    `(?:^|\\s|:)(${utilityPrefixGroup})-(${paletteNameGroup})-(${paletteStopGroup})(?=$|[\\s:/])`,
    "g",
  );
};

const DEFAULT_PALETTE_REGEX = buildDefaultPaletteRegex();

export const noDefaultTailwindPalette = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (jsxAttribute.name?.type !== "JSXIdentifier" || jsxAttribute.name.name !== "className") {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      const reportedTokens = new Set<string>();
      for (const paletteMatch of classNameLiteral.matchAll(DEFAULT_PALETTE_REGEX)) {
        const matchedToken = `${paletteMatch[1]}-${paletteMatch[2]}-${paletteMatch[3]}`;
        if (reportedTokens.has(matchedToken)) continue;
        reportedTokens.add(matchedToken);
        const replacementSuggestion =
          paletteMatch[2] === "indigo"
            ? "use your project's brand color or zinc/neutral/stone"
            : "use zinc (true neutral), neutral (warmer), or stone (warmest)";
        context.report({
          node: jsxAttribute,
          message: `${matchedToken} reads as the Tailwind template default — ${replacementSuggestion}`,
        });
      }
    },
  }),
});
