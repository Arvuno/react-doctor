import { RENDER_FUNCTION_PATTERN } from "../../constants/react.js";
import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

// `renderAction("changeStrokeColor")`, `renderMetric("dau")` — the
// arguments are STRING LITERALS naming an entry in a registry. This
// is the "render by key" / "render by name" pattern: extracting it
// to `<RenderAction name="changeStrokeColor" />` would just rename
// the call site, leaving the registry lookup intact. Same logic for
// number / boolean literal arguments (`renderTab(0)`, `renderRow(2,
// true)`) — these are positional/configural calls, not render-props.
const isLiteralArgument = (argument: EsTreeNode): boolean => {
  if (isNodeOfType(argument, "Literal")) {
    const value = (argument as { value?: unknown }).value;
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    );
  }
  if (isNodeOfType(argument, "TemplateLiteral")) {
    // Pure-template (no expressions interpolated) — same as a string
    // literal.
    return ((argument as { expressions?: ReadonlyArray<unknown> }).expressions ?? []).length === 0;
  }
  if (isNodeOfType(argument, "UnaryExpression")) {
    return isLiteralArgument((argument as { argument: EsTreeNode }).argument);
  }
  return false;
};

const allArgumentsAreLiterals = (call: EsTreeNodeOfType<"CallExpression">): boolean => {
  const args = call.arguments ?? [];
  if (args.length === 0) return false;
  for (const argument of args) {
    if (!isLiteralArgument(argument as EsTreeNode)) return false;
  }
  return true;
};

export const noRenderInRender = defineRule<Rule>({
  id: "no-render-in-render",
  severity: "warn",
  tags: ["test-noise"],
  recommendation:
    "Extract to a named component: `const ListItem = ({ item }) => <div>{item.name}</div>`",
  create: (context: RuleContext) => ({
    JSXExpressionContainer(node: EsTreeNodeOfType<"JSXExpressionContainer">) {
      const expression = node.expression;
      if (!isNodeOfType(expression, "CallExpression")) return;

      let calleeName: string | null = null;
      if (isNodeOfType(expression.callee, "Identifier")) {
        calleeName = expression.callee.name;
      } else if (
        isNodeOfType(expression.callee, "MemberExpression") &&
        isNodeOfType(expression.callee.property, "Identifier")
      ) {
        calleeName = expression.callee.property.name;
      }

      if (!calleeName || !RENDER_FUNCTION_PATTERN.test(calleeName)) return;
      // Registry-style render call: `renderAction("changeStrokeColor")` —
      // the function is a key-driven dispatcher, not a render-prop that
      // can be cleanly extracted into a component.
      if (allArgumentsAreLiterals(expression)) return;

      context.report({
        node: expression,
        message: `Inline render function "${calleeName}()" — extract to a separate component for proper reconciliation`,
      });
    },
  }),
});
