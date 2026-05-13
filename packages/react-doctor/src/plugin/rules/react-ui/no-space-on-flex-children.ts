import { FLEX_OR_GRID_DISPLAY_TOKENS, SPACE_AXIS_PATTERN } from "../../constants.js";
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

const tokenizeClassName = (classNameValue: string): string[] =>
  classNameValue.split(/\s+/).filter(Boolean);

export const noSpaceOnFlexChildren = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (jsxAttribute.name?.type !== "JSXIdentifier" || jsxAttribute.name.name !== "className") {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      const tokens = tokenizeClassName(classNameLiteral);
      let hasFlexOrGridLayout = false;
      for (const token of tokens) {
        // Strip Tailwind variant prefixes (`md:flex`, `dark:hover:grid`).
        const lastSegment = token.includes(":") ? token.slice(token.lastIndexOf(":") + 1) : token;
        if (FLEX_OR_GRID_DISPLAY_TOKENS.has(lastSegment)) {
          hasFlexOrGridLayout = true;
          break;
        }
      }
      if (!hasFlexOrGridLayout) return;
      const spaceMatch = classNameLiteral.match(SPACE_AXIS_PATTERN);
      if (!spaceMatch) return;
      // HACK: preserve the axis in the suggestion — `space-x-4` maps
      // to `gap-x-4` (horizontal only). A bare `gap-4` would also add
      // vertical gap, silently changing layout for the developer who
      // followed the hint.
      const spaceAxis = spaceMatch[1];
      const spaceValue = spaceMatch[2];
      context.report({
        node: jsxAttribute,
        message: `space-${spaceAxis}-${spaceValue} on a flex/grid parent — use gap-${spaceAxis}-${spaceValue} instead. Per-sibling margins phantom-gap on conditional render and don't mirror in RTL`,
      });
    },
  }),
});
