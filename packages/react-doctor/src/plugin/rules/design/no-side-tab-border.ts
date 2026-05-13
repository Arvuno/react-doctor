import {
  COLOR_CHROMA_THRESHOLD,
  SIDE_TAB_BORDER_WIDTH_WITHOUT_RADIUS_PX,
  SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX,
  SIDE_TAB_TAILWIND_WIDTH_WITHOUT_RADIUS,
} from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, ParsedRgb, Rule, RuleContext } from "../../utils/index.js";

const getStringFromClassNameAttr = (node: EsTreeNode): string | null => {
  const classAttr = findJsxAttribute(node.attributes ?? [], "className");
  if (!classAttr?.value) return null;
  if (classAttr.value.type === "Literal" && typeof classAttr.value.value === "string") {
    return classAttr.value.value;
  }
  if (
    classAttr.value.type === "JSXExpressionContainer" &&
    classAttr.value.expression?.type === "Literal" &&
    typeof classAttr.value.expression.value === "string"
  ) {
    return classAttr.value.expression.value;
  }
  if (
    classAttr.value.type === "JSXExpressionContainer" &&
    classAttr.value.expression?.type === "TemplateLiteral" &&
    classAttr.value.expression.quasis?.length === 1
  ) {
    return classAttr.value.expression.quasis[0].value?.raw ?? null;
  }
  return null;
};

const getInlineStyleExpression = (node: EsTreeNode): EsTreeNode | null => {
  if (node.name?.type !== "JSXIdentifier" || node.name.name !== "style") return null;
  if (node.value?.type !== "JSXExpressionContainer") return null;
  const expression = node.value.expression;
  if (expression?.type !== "ObjectExpression") return null;
  return expression;
};

const getStylePropertyStringValue = (property: EsTreeNode): string | null => {
  if (property.value?.type === "Literal" && typeof property.value.value === "string") {
    return property.value.value;
  }
  return null;
};

const getStylePropertyNumberValue = (property: EsTreeNode): number | null => {
  if (property.value?.type === "Literal" && typeof property.value.value === "number") {
    return property.value.value;
  }
  if (
    property.value?.type === "UnaryExpression" &&
    property.value.operator === "-" &&
    property.value.argument?.type === "Literal" &&
    typeof property.value.argument.value === "number"
  ) {
    return -property.value.argument.value;
  }
  return null;
};

const getStylePropertyKey = (property: EsTreeNode): string | null => {
  if (property.type !== "Property") return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal" && typeof property.key.value === "string")
    return property.key.value;
  return null;
};

const parseColorToRgb = (value: string): ParsedRgb | null => {
  const trimmed = value.trim().toLowerCase();

  const hex8Match = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})[0-9a-f]{2}$/);
  if (hex8Match) {
    return {
      red: parseInt(hex8Match[1], 16),
      green: parseInt(hex8Match[2], 16),
      blue: parseInt(hex8Match[3], 16),
    };
  }

  const hex6Match = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (hex6Match) {
    return {
      red: parseInt(hex6Match[1], 16),
      green: parseInt(hex6Match[2], 16),
      blue: parseInt(hex6Match[3], 16),
    };
  }

  const hex4Match = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]$/);
  if (hex4Match) {
    return {
      red: parseInt(hex4Match[1] + hex4Match[1], 16),
      green: parseInt(hex4Match[2] + hex4Match[2], 16),
      blue: parseInt(hex4Match[3] + hex4Match[3], 16),
    };
  }

  const hex3Match = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3Match) {
    return {
      red: parseInt(hex3Match[1] + hex3Match[1], 16),
      green: parseInt(hex3Match[2] + hex3Match[2], 16),
      blue: parseInt(hex3Match[3] + hex3Match[3], 16),
    };
  }

  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      red: parseInt(rgbMatch[1], 10),
      green: parseInt(rgbMatch[2], 10),
      blue: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
};

const hasColorChroma = (parsed: ParsedRgb): boolean =>
  Math.max(parsed.red, parsed.green, parsed.blue) -
    Math.min(parsed.red, parsed.green, parsed.blue) >=
  COLOR_CHROMA_THRESHOLD;

const isNeutralBorderColor = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (["gray", "grey", "silver", "white", "black", "transparent", "currentcolor"].includes(trimmed))
    return true;

  const parsed = parseColorToRgb(trimmed);
  if (parsed) return !hasColorChroma(parsed);

  return false;
};

const extractBorderColorFromShorthand = (shorthandValue: string): string | null => {
  const afterSolid = shorthandValue.match(/solid\s+(.+)$/i);
  if (!afterSolid) return null;
  return afterSolid[1].trim();
};

// HACK: Map (not plain object) so the `key in BORDER_SIDE_KEYS` guard
// below doesn't accept inherited Object.prototype names. Without this,
// any inline style object whose key happens to be `constructor` /
// `toString` / `hasOwnProperty` / `__proto__` would pass the membership
// check and fall through to a garbage report message that reads off
// `BORDER_SIDE_KEYS["constructor"]` (= the native Object function).
const BORDER_SIDE_KEYS = new Map<string, string>([
  ["borderLeft", "left"],
  ["borderRight", "right"],
  ["borderInlineStart", "left"],
  ["borderInlineEnd", "right"],
]);

const BORDER_SIDE_WIDTH_KEYS = new Set([
  "borderLeftWidth",
  "borderRightWidth",
  "borderInlineStartWidth",
  "borderInlineEndWidth",
]);

export const noSideTabBorder = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasBorderRadius = false;
      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key === "borderRadius") {
          const numValue = getStylePropertyNumberValue(property);
          const strValue = getStylePropertyStringValue(property);
          if (
            (numValue !== null && numValue > 0) ||
            (strValue !== null && parseFloat(strValue) > 0)
          ) {
            hasBorderRadius = true;
          }
        }
      }

      const threshold = hasBorderRadius
        ? SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX
        : SIDE_TAB_BORDER_WIDTH_WITHOUT_RADIUS_PX;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        const sideLabel = BORDER_SIDE_KEYS.get(key);
        if (sideLabel !== undefined) {
          const value = getStylePropertyStringValue(property);
          if (!value) continue;
          const widthMatch = value.match(/^(\d+)px\s+solid/);
          if (!widthMatch) continue;

          const borderColor = extractBorderColorFromShorthand(value);
          if (borderColor && isNeutralBorderColor(borderColor)) continue;

          const width = parseInt(widthMatch[1], 10);
          if (width >= threshold) {
            context.report({
              node: property,
              message: `Thick one-sided border (${sideLabel}: ${width}px) — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
            });
          }
        }

        if (BORDER_SIDE_WIDTH_KEYS.has(key)) {
          const numValue = getStylePropertyNumberValue(property);
          const strValue = getStylePropertyStringValue(property);
          const width = numValue ?? (strValue !== null ? parseFloat(strValue) : NaN);
          if (isNaN(width)) continue;

          const colorKey = key.replace("Width", "Color");
          const hasColoredBorder = expression.properties?.some((colorProperty: EsTreeNode) => {
            const colorPropertyKey = getStylePropertyKey(colorProperty);
            if (colorPropertyKey !== colorKey) return false;
            const colorValue = getStylePropertyStringValue(colorProperty);
            return colorValue !== null && !isNeutralBorderColor(colorValue);
          });
          if (!hasColoredBorder) continue;

          if (width >= threshold) {
            context.report({
              node: property,
              message: `Thick one-sided border (${width}px) — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
            });
          }
        }
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      const sideMatch = classStr.match(/\bborder-[lrse]-(\d+)\b/);
      if (!sideMatch) return;

      const hasNeutralBorderColor =
        /\bborder-(?:(?:gray|slate|zinc|neutral|stone)-\d+|white|black|transparent)\b/.test(
          classStr,
        );
      if (hasNeutralBorderColor) return;

      const width = parseInt(sideMatch[1], 10);
      const hasRounded =
        /\brounded(?:-(?!none\b)\w+)?\b/.test(classStr) && !/\brounded-none\b/.test(classStr);
      const tailwindThreshold = hasRounded
        ? SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX
        : SIDE_TAB_TAILWIND_WIDTH_WITHOUT_RADIUS;

      if (width >= tailwindThreshold) {
        context.report({
          node,
          message: `Thick one-sided border (${sideMatch[0]}) — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
        });
      }
    },
  }),
});
