import { defineRule, findJsxAttribute } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

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

export const noGrayOnColoredBackground = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      const grayTextMatch = classStr.match(/\btext-(?:gray|slate|zinc|neutral|stone)-\d+\b/);
      const coloredBgMatch = classStr.match(
        /\bbg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/,
      );

      if (grayTextMatch && coloredBgMatch) {
        context.report({
          node,
          message: `Gray text (${grayTextMatch[0]}) on colored background (${coloredBgMatch[0]}) looks washed out — use a darker shade of the background color or white`,
        });
      }
    },
  }),
});
