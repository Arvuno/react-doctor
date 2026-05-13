import { LONG_TRANSITION_DURATION_THRESHOLD_MS } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

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

export const noLongTransitionDuration = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        const value = getStylePropertyStringValue(property);
        if (!value) continue;

        let durationMs: number | null = null;

        if (key === "transitionDuration" || key === "animationDuration") {
          let longestDurationPropertyMs = 0;
          for (const segment of value.split(",")) {
            const trimmedSegment = segment.trim();
            const msMatch = trimmedSegment.match(/^([\d.]+)ms$/);
            const secondsMatch = trimmedSegment.match(/^([\d.]+)s$/);
            if (msMatch)
              longestDurationPropertyMs = Math.max(
                longestDurationPropertyMs,
                parseFloat(msMatch[1]),
              );
            else if (secondsMatch)
              longestDurationPropertyMs = Math.max(
                longestDurationPropertyMs,
                parseFloat(secondsMatch[1]) * 1000,
              );
          }
          if (longestDurationPropertyMs > 0) durationMs = longestDurationPropertyMs;
        }

        if (key === "transition" || key === "animation") {
          let longestDurationMs = 0;
          const segments = value.split(",");
          for (const segment of segments) {
            const firstTimeMatch = segment.match(/(?<![a-zA-Z\d])([\d.]+)(m?s)(?![a-zA-Z\d-])/);
            if (!firstTimeMatch) continue;
            const segmentDurationMs =
              firstTimeMatch[2] === "ms"
                ? parseFloat(firstTimeMatch[1])
                : parseFloat(firstTimeMatch[1]) * 1000;
            longestDurationMs = Math.max(longestDurationMs, segmentDurationMs);
          }
          if (longestDurationMs > 0) durationMs = longestDurationMs;
        }

        if (durationMs !== null && durationMs > LONG_TRANSITION_DURATION_THRESHOLD_MS) {
          context.report({
            node: property,
            message: `${durationMs}ms transition is too slow for UI feedback — keep transitions under ${LONG_TRANSITION_DURATION_THRESHOLD_MS}ms. Use longer durations only for page-load hero animations`,
          });
        }
      }
    },
  }),
});
