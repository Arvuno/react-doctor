import {
  HEADING_TAG_NAMES,
  HEAVY_HEADING_FONT_WEIGHT_MIN,
  HEAVY_HEADING_TAILWIND_WEIGHTS,
} from "../../constants.js";
import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getOpeningElementTagName = (openingElement: EsTreeNode | null | undefined): string | null => {
  if (!openingElement) return null;
  if (openingElement.name?.type === "JSXIdentifier") return openingElement.name.name;
  if (openingElement.name?.type === "JSXMemberExpression") {
    let cursor = openingElement.name;
    while (cursor.type === "JSXMemberExpression") {
      cursor = cursor.property;
    }
    if (cursor?.type === "JSXIdentifier") return cursor.name;
  }
  return null;
};

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

const getInlineStyleObjectExpression = (jsxAttribute: EsTreeNode): EsTreeNode | null => {
  if (jsxAttribute.name?.type !== "JSXIdentifier" || jsxAttribute.name.name !== "style") {
    return null;
  }
  if (jsxAttribute.value?.type !== "JSXExpressionContainer") return null;
  const expression = jsxAttribute.value.expression;
  if (expression?.type !== "ObjectExpression") return null;
  return expression;
};

const getStylePropertyKeyName = (objectProperty: EsTreeNode): string | null => {
  if (objectProperty.type !== "Property") return null;
  if (objectProperty.key?.type === "Identifier") return objectProperty.key.name;
  if (objectProperty.key?.type === "Literal" && typeof objectProperty.key.value === "string") {
    return objectProperty.key.value;
  }
  return null;
};

const getStylePropertyNumericValue = (objectProperty: EsTreeNode): number | null => {
  const valueNode = objectProperty.value;
  if (!valueNode) return null;
  if (valueNode.type === "Literal" && typeof valueNode.value === "number") return valueNode.value;
  if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
    const parsed = parseFloat(valueNode.value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const noBoldHeading = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(openingNode: EsTreeNode) {
      const tagName = getOpeningElementTagName(openingNode);
      if (!tagName || !HEADING_TAG_NAMES.has(tagName)) return;

      const classAttribute = findJsxAttribute(openingNode.attributes ?? [], "className");
      if (classAttribute) {
        const classNameLiteral = getClassNameLiteral(classAttribute);
        if (classNameLiteral) {
          for (const tailwindWeightToken of HEAVY_HEADING_TAILWIND_WEIGHTS) {
            const tokenPattern = new RegExp(`(?:^|\\s)${tailwindWeightToken}(?:$|\\s|:)`);
            if (tokenPattern.test(classNameLiteral)) {
              context.report({
                node: classAttribute,
                message: `${tailwindWeightToken} on <${tagName}> crushes counter shapes at display sizes — use font-semibold (600) or font-medium (500)`,
              });
              return;
            }
          }
        }
      }

      const styleAttribute = findJsxAttribute(openingNode.attributes ?? [], "style");
      if (!styleAttribute) return;
      const styleObject = getInlineStyleObjectExpression(styleAttribute);
      if (!styleObject) return;

      for (const objectProperty of styleObject.properties ?? []) {
        const stylePropertyName = getStylePropertyKeyName(objectProperty);
        if (stylePropertyName !== "fontWeight") continue;
        const numericWeight = getStylePropertyNumericValue(objectProperty);
        if (numericWeight !== null && numericWeight >= HEAVY_HEADING_FONT_WEIGHT_MIN) {
          context.report({
            node: objectProperty,
            message: `fontWeight: ${numericWeight} on <${tagName}> crushes counter shapes at display sizes — use 500 or 600`,
          });
          return;
        }
      }
    },
  }),
});
