import type { Rule } from "./rule.js";

export interface DefineRule {
  (rule: Rule): Rule;
  <RuleDefinition>(rule: RuleDefinition): RuleDefinition;
}

export const defineRule: DefineRule = <RuleDefinition>(rule: RuleDefinition): RuleDefinition =>
  rule;
