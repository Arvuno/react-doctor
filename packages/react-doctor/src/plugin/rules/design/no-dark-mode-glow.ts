import {
  COLOR_CHROMA_THRESHOLD,
  DARK_BACKGROUND_CHANNEL_MAX,
  DARK_GLOW_BLUR_THRESHOLD_PX,
} from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, ParsedRgb, Rule, RuleContext } from "../../utils/index.js";

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

const isPureBlackColor = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "#000" || trimmed === "#000000") return true;
  if (/^rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(trimmed)) return true;
  return false;
};

const splitShadowLayers = (shadowValue: string): string[] => shadowValue.split(/,(?![^(]*\))/);

const extractColorFromShadowLayer = (layer: string): ParsedRgb | null => {
  const rgbMatch = layer.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      red: parseInt(rgbMatch[1], 10),
      green: parseInt(rgbMatch[2], 10),
      blue: parseInt(rgbMatch[3], 10),
    };
  }

  const hexMatch = layer.match(/#([0-9a-f]{3,6})\b/i);
  if (hexMatch) return parseColorToRgb(`#${hexMatch[1]}`);

  return null;
};

const parseShadowLayerBlur = (layer: string): number => {
  const withoutColors = layer.replace(/rgba?\([^)]*\)/g, "").replace(/#[0-9a-f]{3,8}\b/gi, "");
  const numericTokens = [...withoutColors.matchAll(/(\d+(?:\.\d+)?)(px)?/g)].map((match) =>
    parseFloat(match[1]),
  );
  return numericTokens.length >= 3 ? numericTokens[2] : 0;
};

const hasColoredGlowShadow = (shadowValue: string): boolean => {
  for (const layer of splitShadowLayers(shadowValue)) {
    const color = extractColorFromShadowLayer(layer);
    if (
      color &&
      hasColorChroma(color) &&
      parseShadowLayerBlur(layer) > DARK_GLOW_BLUR_THRESHOLD_PX
    ) {
      return true;
    }
  }
  return false;
};

const isBackgroundDark = (bgValue: string): boolean => {
  const trimmed = bgValue.trim().toLowerCase();
  if (isPureBlackColor(trimmed)) return true;

  const parsed = parseColorToRgb(trimmed);
  if (!parsed) return false;

  return (
    parsed.red <= DARK_BACKGROUND_CHANNEL_MAX &&
    parsed.green <= DARK_BACKGROUND_CHANNEL_MAX &&
    parsed.blue <= DARK_BACKGROUND_CHANNEL_MAX
  );
};

export const noDarkModeGlow = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasDarkBackground = false;
      let shadowProperty: EsTreeNode | null = null;
      let shadowValue: string | null = null;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        if (key === "backgroundColor" || key === "background") {
          const value = getStylePropertyStringValue(property);
          if (value && isBackgroundDark(value)) {
            hasDarkBackground = true;
          }
        }

        if (key === "boxShadow") {
          shadowProperty = property;
          shadowValue = getStylePropertyStringValue(property);
        }
      }

      if (!hasDarkBackground || !shadowValue || !shadowProperty) return;

      if (hasColoredGlowShadow(shadowValue)) {
        context.report({
          node: shadowProperty,
          message:
            "Colored glow on dark background — the default AI-generated 'cool' look. Use subtle, purposeful lighting instead",
        });
      }
    },
  }),
});
