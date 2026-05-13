import { TANSTACK_ROUTE_FILE_PATTERN } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const tanstackStartNoAnchorElement = defineRule<Rule>({
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      const isRouteFile = TANSTACK_ROUTE_FILE_PATTERN.test(filename);
      if (!isRouteFile) return;

      if (node.name?.type !== "JSXIdentifier" || node.name.name !== "a") return;

      const attributes = node.attributes ?? [];
      const hrefAttribute = attributes.find(
        (attribute: EsTreeNode) =>
          attribute.type === "JSXAttribute" &&
          attribute.name?.type === "JSXIdentifier" &&
          attribute.name.name === "href",
      );

      if (!hrefAttribute?.value) return;

      let hrefValue: string | null = null;
      if (hrefAttribute.value.type === "Literal") {
        hrefValue = hrefAttribute.value.value;
      } else if (
        hrefAttribute.value.type === "JSXExpressionContainer" &&
        hrefAttribute.value.expression?.type === "Literal"
      ) {
        hrefValue = hrefAttribute.value.expression.value;
      }

      if (typeof hrefValue === "string" && hrefValue.startsWith("/")) {
        context.report({
          node,
          message:
            "Use <Link> from @tanstack/react-router instead of <a> for internal navigation — enables type-safe routing and preloading",
        });
      }
    },
  }),
});
