import { PADDING_HORIZONTAL_AXIS_PATTERN, PADDING_VERTICAL_AXIS_PATTERN } from "../../constants.js";
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

export const noRedundantPaddingAxes = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (jsxAttribute.name?.type !== "JSXIdentifier" || jsxAttribute.name.name !== "className") {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      // Per-breakpoint variation is a legit reason to keep the axes split.
      if (
        hasResponsivePrefix(classNameLiteral, "px") ||
        hasResponsivePrefix(classNameLiteral, "py")
      ) {
        return;
      }
      const matchedPairs = collectAxisShorthandPairs(
        classNameLiteral,
        PADDING_HORIZONTAL_AXIS_PATTERN,
        PADDING_VERTICAL_AXIS_PATTERN,
      );
      if (matchedPairs.length === 0) return;

      for (const matchedPair of matchedPairs) {
        context.report({
          node: jsxAttribute,
          message: `px-${matchedPair.value} py-${matchedPair.value} → use the shorthand p-${matchedPair.value}`,
        });
      }
    },
  }),
});
