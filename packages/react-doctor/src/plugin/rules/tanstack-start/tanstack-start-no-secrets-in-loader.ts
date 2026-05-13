import { TANSTACK_ROUTE_CREATION_FUNCTIONS } from "../../constants.js";
import { defineRule, walkAst } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

const getRouteOptionsObject = (node: EsTreeNode): EsTreeNode | null => {
  if (node.type !== "CallExpression") return null;

  const callee = node.callee;

  if (callee?.type === "CallExpression" && callee.callee?.type === "Identifier") {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(callee.callee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (optionsArgument?.type === "ObjectExpression") return optionsArgument;
    return null;
  }

  if (callee?.type === "Identifier") {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(callee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (optionsArgument?.type === "ObjectExpression") return optionsArgument;
    return null;
  }

  return null;
};

const getPropertyKeyName = (property: EsTreeNode): string | null => {
  if (property.type !== "Property" && property.type !== "MethodDefinition") return null;
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal") return String(property.key.value);
  return null;
};

const SAFE_BUILD_ENV_VARS = new Set(["NODE_ENV", "MODE", "DEV", "PROD"]);

const SECRET_KEYWORD_PATTERN = /(?:secret|token|api[_]?key|password|private)/i;

// HACK: only flag env vars whose name matches a secret keyword. A loader
// reading process.env.DATABASE_URL or process.env.PORT is fine; what's not
// fine is process.env.STRIPE_SECRET or process.env.NEXT_PUBLIC_API_KEY (the
// latter being a misconfigured public-prefixed key).
const isLikelySecret = (envVarName: string): boolean => {
  if (SAFE_BUILD_ENV_VARS.has(envVarName)) return false;
  return SECRET_KEYWORD_PATTERN.test(envVarName);
};

export const tanstackStartNoSecretsInLoader = defineRule<Rule>({
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties = optionsObject.properties ?? [];
      for (const property of properties) {
        const keyName = getPropertyKeyName(property);
        if (keyName !== "loader" && keyName !== "beforeLoad") continue;

        const loaderValue = property.value ?? property;
        walkAst(loaderValue, (child: EsTreeNode) => {
          if (child.type !== "MemberExpression") return;
          const isProcessEnvAccess =
            child.object?.type === "MemberExpression" &&
            child.object.object?.type === "Identifier" &&
            child.object.object.name === "process" &&
            child.object.property?.type === "Identifier" &&
            child.object.property.name === "env";
          const isImportMetaEnvAccess =
            child.object?.type === "MemberExpression" &&
            child.object.object?.type === "MetaProperty" &&
            child.object.property?.type === "Identifier" &&
            child.object.property.name === "env";

          if (!isProcessEnvAccess && !isImportMetaEnvAccess) return;

          const envVarName = child.property?.type === "Identifier" ? child.property.name : null;
          if (envVarName && isLikelySecret(envVarName)) {
            const envSource = isImportMetaEnvAccess ? "import.meta.env" : "process.env";
            context.report({
              node: child,
              message: `${envSource}.${envVarName} in ${keyName} — loaders are isomorphic and may leak secrets to the client. Move to a createServerFn()`,
            });
          }
        });
      }
    },
  }),
});
