import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { getJsxElementName } from "../../utils/get-jsx-element-name.js";
import { findJsxAttributeIgnoreCase } from "../../utils/find-jsx-attribute-ignore-case.js";
import { getJsxAttributeStringValue, ELEMENT_IMPLICIT_ROLES } from "../../utils/jsx-a11y-helpers.js";

const MESSAGE = "Elements should not have redundant ARIA roles that match their implicit role. Remove the explicit `role` attribute.";

export const a11yNoRedundantRoles = defineRule<Rule>({
  id: "a11y-no-redundant-roles",
  severity: "warn",
  recommendation: MESSAGE,
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNodeOfType<"JSXOpeningElement">) {
      const tagName = getJsxElementName(node);
      const implicitRoles = ELEMENT_IMPLICIT_ROLES[tagName];
      if (!implicitRoles || implicitRoles.length === 0) return;
      const roleAttribute = findJsxAttributeIgnoreCase(node.attributes, "role");
      if (!roleAttribute) return;
      const roleValue = getJsxAttributeStringValue(roleAttribute);
      if (!roleValue) return;
      const roles = roleValue.split(/\s+/);
      for (const role of roles) {
        if (implicitRoles.includes(role)) {
          context.report({
            node: roleAttribute,
            message: `The \`${tagName}\` element has an implicit role of \`${role}\`. Defining this explicitly is redundant and should be avoided.`,
          });
        }
      }
    },
  }),
});
