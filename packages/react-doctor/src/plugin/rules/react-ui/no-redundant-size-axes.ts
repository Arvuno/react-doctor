import { SIZE_HEIGHT_AXIS_PATTERN, SIZE_WIDTH_AXIS_PATTERN } from "../../constants.js";
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

const collectAxisShorthandPairs = (
  classNameValue: string,
  horizontalPattern: RegExp,
  verticalPattern: RegExp,
): Array<{ value: string }> => {
  const horizontalValues = new Set<string>();
  for (const horizontalMatch of classNameValue.matchAll(horizontalPattern)) {
    horizontalValues.add(`${horizontalMatch[1]}${horizontalMatch[2]}`);
  }
  const matchedPairs: Array<{ value: string }> = [];
  for (const verticalMatch of classNameValue.matchAll(verticalPattern)) {
    const verticalValue = `${verticalMatch[1]}${verticalMatch[2]}`;
    if (horizontalValues.has(verticalValue)) {
      matchedPairs.push({ value: verticalValue });
    }
  }
  return matchedPairs;
};

const hasResponsivePrefix = (classNameValue: string, axisPrefix: string): boolean =>
  new RegExp(`(?:^|\\s)\\w+:${axisPrefix}-`).test(classNameValue);

export const noRedundantSizeAxes = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (jsxAttribute.name?.type !== "JSXIdentifier" || jsxAttribute.name.name !== "className") {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      if (
        hasResponsivePrefix(classNameLiteral, "w") ||
        hasResponsivePrefix(classNameLiteral, "h")
      ) {
        return;
      }
      // Skip percent / fraction widths (`w-1/2 h-1/2`) — those have no `size-*` shorthand.
      const matchedPairs = collectAxisShorthandPairs(
        classNameLiteral,
        SIZE_WIDTH_AXIS_PATTERN,
        SIZE_HEIGHT_AXIS_PATTERN,
      );
      if (matchedPairs.length === 0) return;

      for (const matchedPair of matchedPairs) {
        context.report({
          node: jsxAttribute,
          message: `w-${matchedPair.value} h-${matchedPair.value} → use the shorthand size-${matchedPair.value} (Tailwind v3.4+)`,
        });
      }
    },
  }),
});
