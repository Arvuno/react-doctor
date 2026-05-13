import { INTERNAL_PAGE_PATH_PATTERN, PAGE_FILE_PATTERN } from "../../constants.js";
import { defineRule } from "../../utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "../../utils/index.js";

export const nextjsMissingMetadata = defineRule<Rule>({
  create: (context: RuleContext) => ({
    Program(programNode: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      if (!PAGE_FILE_PATTERN.test(filename)) return;
      if (INTERNAL_PAGE_PATH_PATTERN.test(filename)) return;

      const hasMetadataExport = programNode.body?.some((statement: EsTreeNode) => {
        if (statement.type !== "ExportNamedDeclaration") return false;
        const declaration = statement.declaration;
        if (declaration?.type === "VariableDeclaration") {
          return declaration.declarations?.some(
            (declarator: EsTreeNode) =>
              declarator.id?.type === "Identifier" &&
              (declarator.id.name === "metadata" || declarator.id.name === "generateMetadata"),
          );
        }
        if (declaration?.type === "FunctionDeclaration") {
          return declaration.id?.name === "generateMetadata";
        }
        return false;
      });

      if (!hasMetadataExport) {
        context.report({
          node: programNode,
          message: "Page without metadata or generateMetadata export — hurts SEO",
        });
      }
    },
  }),
});
