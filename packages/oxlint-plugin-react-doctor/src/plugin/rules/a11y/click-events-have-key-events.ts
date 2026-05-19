import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getElementType } from "../../utils/get-element-type.js";
import { getJsxPropStringValue } from "../../utils/get-jsx-prop-string-value.js";
import { hasJsxPropIgnoreCase } from "../../utils/has-jsx-prop-ignore-case.js";
import { isHiddenFromScreenReader } from "../../utils/is-hidden-from-screen-reader.js";
import { isInteractiveElement } from "../../utils/is-interactive-element.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import { isTestlikeFilename } from "../../utils/is-testlike-filename.js";
import type { Rule } from "../../utils/rule.js";
import { HTML_TAGS } from "../../constants/html-tags.js";

const PRESENTATION_ROLES: ReadonlySet<string> = new Set(["presentation", "none"]);

const MESSAGE =
  "Visible non-interactive elements with click handlers must have a corresponding keyboard listener (`onKeyUp`, `onKeyDown`, or `onKeyPress`).";

const KEY_HANDLERS = ["onKeyUp", "onKeyDown", "onKeyPress"] as const;

// `<div onClick={e => e.stopPropagation()}>` is the canonical event-
// bubble-blocker pattern. The div isn't a user-interaction target — it
// just stops a click from reaching the parent. Requiring a keyboard
// handler here would be wrong (there's no keyboard equivalent of
// "stop a hypothetical mouse-event bubble").
const BLOCKER_METHOD_NAMES: ReadonlySet<string> = new Set([
  "stopPropagation",
  "preventDefault",
  "stopImmediatePropagation",
]);

const isEventBlockerCall = (node: EsTreeNode | null | undefined): boolean => {
  if (!node) return false;
  if (!isNodeOfType(node, "CallExpression")) return false;
  const callee = node.callee;
  if (!isNodeOfType(callee, "MemberExpression")) return false;
  if (!isNodeOfType(callee.property, "Identifier")) return false;
  return BLOCKER_METHOD_NAMES.has(callee.property.name);
};

const isPureEventBlockerBody = (body: EsTreeNode | null | undefined): boolean => {
  if (!body) return false;
  if (isEventBlockerCall(body)) return true;
  if (isNodeOfType(body, "BlockStatement")) {
    const statements = body.body ?? [];
    if (statements.length === 0) return false;
    for (const statement of statements) {
      if (!isNodeOfType(statement, "ExpressionStatement")) return false;
      if (!isEventBlockerCall(statement.expression as EsTreeNode)) return false;
    }
    return true;
  }
  return false;
};

const isPureEventBlockerHandler = (
  attribute: EsTreeNodeOfType<"JSXAttribute">,
): boolean => {
  if (!attribute.value || !isNodeOfType(attribute.value, "JSXExpressionContainer")) {
    return false;
  }
  const expression = attribute.value.expression as EsTreeNode;
  if (
    isNodeOfType(expression, "ArrowFunctionExpression") ||
    isNodeOfType(expression, "FunctionExpression")
  ) {
    return isPureEventBlockerBody(expression.body as EsTreeNode);
  }
  return false;
};

// Port of `oxc_linter::rules::jsx_a11y::click_events_have_key_events`.
// Flags elements with `onClick` that lack a keyboard handler — only
// applies to non-interactive HTML elements (interactive ones already
// support keyboard activation).
export const clickEventsHaveKeyEvents = defineRule<Rule>({
  id: "click-events-have-key-events",
  severity: "warn",
  recommendation: "Pair `onClick` with `onKeyUp` / `onKeyDown` / `onKeyPress` for keyboard users.",
  category: "Accessibility",
  create: (context) => {
    const isTestlikeFile = isTestlikeFilename(context.getFilename?.());
    return {
      JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
        if (isTestlikeFile) return;
        const tag = getElementType(node, context.settings);
        // Skip non-DOM elements (custom components might handle keyboard
        // internally).
        if (!HTML_TAGS.has(tag)) return;
        // Skip interactive elements (button, a[href], etc.) — they
        // already handle keyboard activation.
        if (isInteractiveElement(tag, node)) return;
        // Skip elements with no children visible to users.
        const onClick = hasJsxPropIgnoreCase(node.attributes, "onClick");
        if (!onClick) return;
        if (isPureEventBlockerHandler(onClick)) return;

        if (isHiddenFromScreenReader(node, context.settings)) return;

        // Presentational role (presentation / none) → not perceivable
        // by AT, so skip.
        const roleAttribute = hasJsxPropIgnoreCase(node.attributes, "role");
        if (roleAttribute) {
          const roleValue = getJsxPropStringValue(roleAttribute);
          if (roleValue && PRESENTATION_ROLES.has(roleValue)) return;
        }
        // Has a key handler? OK.
        const hasKeyHandler = KEY_HANDLERS.some((handler) =>
          hasJsxPropIgnoreCase(node.attributes, handler),
        );
        if (hasKeyHandler) return;

        context.report({ node: node.name, message: MESSAGE });
      },
    };
  },
});
