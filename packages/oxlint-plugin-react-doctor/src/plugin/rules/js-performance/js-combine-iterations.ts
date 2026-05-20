import {
  CHAINABLE_ITERATION_METHODS,
  ITERATOR_PRODUCING_METHOD_NAMES,
} from "../../constants/js.js";
import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import { isTestlikeFilename } from "../../utils/is-testlike-filename.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";
import { walkAst } from "../../utils/walk-ast.js";

const isIteratorProducingCall = (
  callExpression: EsTreeNodeOfType<"CallExpression">,
  generatorNamesInFile: ReadonlySet<string>,
): boolean => {
  const callee = callExpression.callee;
  if (
    isNodeOfType(callee, "MemberExpression") &&
    isNodeOfType(callee.object, "Identifier") &&
    callee.object.name === "Iterator" &&
    isNodeOfType(callee.property, "Identifier") &&
    callee.property.name === "from"
  ) {
    return true;
  }
  if (isNodeOfType(callee, "Identifier") && generatorNamesInFile.has(callee.name)) {
    return true;
  }
  if (
    isNodeOfType(callee, "MemberExpression") &&
    isNodeOfType(callee.property, "Identifier") &&
    ITERATOR_PRODUCING_METHOD_NAMES.has(callee.property.name)
  ) {
    const receiver = callee.object;
    if (isNodeOfType(receiver, "Identifier") && receiver.name === "Object") return false;
    return true;
  }
  return false;
};

const isChainPassThroughCall = (callExpression: EsTreeNodeOfType<"CallExpression">): boolean => {
  const callee = callExpression.callee;
  if (!isNodeOfType(callee, "MemberExpression")) return false;
  if (!isNodeOfType(callee.property, "Identifier")) return false;
  return CHAINABLE_ITERATION_METHODS.has(callee.property.name);
};

const isReceiverChainIteratorRooted = (
  receiverNode: EsTreeNode | null | undefined,
  generatorNamesInFile: ReadonlySet<string>,
): boolean => {
  let cursor: EsTreeNode | null | undefined = receiverNode;
  while (cursor) {
    if (isNodeOfType(cursor, "ChainExpression")) {
      cursor = cursor.expression;
      continue;
    }
    if (!isNodeOfType(cursor, "CallExpression")) return false;
    if (isIteratorProducingCall(cursor, generatorNamesInFile)) return true;
    if (!isChainPassThroughCall(cursor)) return false;
    const nextCallee = cursor.callee;
    if (!isNodeOfType(nextCallee, "MemberExpression")) return false;
    cursor = nextCallee.object;
  }
  return false;
};

// Walks `receiver.X(...).Y(...).Z(...)` chains looking for the
// ROOT-most receiver. Returns it if the root is a small literal
// array — iterating a 5-element literal twice is fully negligible
// cost and the rewrite to a single-pass reduce just hurts readability.
const SMALL_LITERAL_ARRAY_MAX_ELEMENTS = 8;

// Receivers whose result size is bounded by the source's KEY COUNT
// (objects rarely exceed a few dozen keys in app code). The chain
// `Object.entries(config).map(...).filter(...)` iterates the same
// fixed-size key set twice; converting to `for...of` is purely
// stylistic.
const KEY_BOUNDED_RECEIVER_METHODS: ReadonlySet<string> = new Set([
  "entries",
  "keys",
  "values",
  "fromEntries",
  "getOwnPropertyNames",
  "getOwnPropertyDescriptors",
  "getOwnPropertySymbols",
]);

const isKeyBoundedReceiver = (receiverNode: EsTreeNode | null | undefined): boolean => {
  if (!receiverNode) return false;
  if (!isNodeOfType(receiverNode, "CallExpression")) return false;
  const callee = receiverNode.callee;
  if (!isNodeOfType(callee, "MemberExpression")) return false;
  if (!isNodeOfType(callee.object, "Identifier")) return false;
  if (callee.object.name !== "Object") return false;
  if (!isNodeOfType(callee.property, "Identifier")) return false;
  return KEY_BOUNDED_RECEIVER_METHODS.has(callee.property.name);
};

// `.filter(x => x != null)` / `.filter(x => x !== undefined)` /
// `.filter((x): x is T => x !== null && x !== undefined)` — pure
// non-null narrowing predicate. Combined `.map().filter()` rewrites
// to `.reduce()` lose type narrowing here; users should keep the
// readable two-step form.
const isNullishComparison = (expression: EsTreeNode | null | undefined): boolean => {
  if (!expression) return false;
  if (isNodeOfType(expression, "BinaryExpression")) {
    const operator = expression.operator;
    if (operator !== "!=" && operator !== "!==" && operator !== "==" && operator !== "===") {
      return false;
    }
    const isNullLiteral = (n: EsTreeNode | null | undefined): boolean => {
      if (!n) return false;
      if (isNodeOfType(n, "Literal") && (n as { value?: unknown }).value === null) return true;
      if (isNodeOfType(n, "Identifier") && n.name === "undefined") return true;
      return false;
    };
    return (
      isNullLiteral(expression.left as EsTreeNode | null) ||
      isNullLiteral(expression.right as EsTreeNode | null)
    );
  }
  return false;
};

const isNullFilteringPredicateBody = (body: EsTreeNode): boolean => {
  // `x != null` / `x !== undefined` etc.
  if (isNullishComparison(body)) return true;
  // `x != null && x !== undefined` / `x !== null || x.foo` — both
  // branches are nullish comparisons (conservative — only accept when
  // EVERY clause is a nullish comparison so we don't accept arbitrary
  // logic).
  if (
    isNodeOfType(body, "LogicalExpression") &&
    (body.operator === "&&" || body.operator === "||")
  ) {
    return (
      isNullFilteringPredicateBody(body.left as EsTreeNode) &&
      isNullFilteringPredicateBody(body.right as EsTreeNode)
    );
  }
  return false;
};

// `.filter((x): x is T => …)` — TypeScript type predicate. The arrow
// has an explicit `is T` return annotation on its body, which only
// makes sense when chained with .map() to operate on the narrowed
// type. We detect by checking for a `returnType` field whose name
// contains "TSTypePredicate" — robust against AST shape variance.
const isTypePredicateArrow = (filterArgument: EsTreeNode | null | undefined): boolean => {
  if (!filterArgument) return false;
  if (!isNodeOfType(filterArgument, "ArrowFunctionExpression")) return false;
  const returnType = (filterArgument as { returnType?: unknown }).returnType;
  if (!returnType || typeof returnType !== "object") return false;
  const annotation = (returnType as { typeAnnotation?: unknown }).typeAnnotation;
  if (!annotation || typeof annotation !== "object") return false;
  const annotationType = (annotation as { type?: unknown }).type;
  return typeof annotationType === "string" && annotationType.includes("TypePredicate");
};

const isNullFilteringPredicate = (filterArgument: EsTreeNode | null | undefined): boolean => {
  if (!filterArgument) return false;
  if (!isNodeOfType(filterArgument, "ArrowFunctionExpression")) return false;
  if ((filterArgument.params?.length ?? 0) === 0) return false;
  const body = filterArgument.body as EsTreeNode;
  // Expression-body arrow.
  if (!isNodeOfType(body, "BlockStatement")) {
    return isNullFilteringPredicateBody(body);
  }
  // Block-body arrow with a single `return <nullish-cmp>` statement.
  const statements = body.body ?? [];
  if (statements.length !== 1) return false;
  const only = statements[0] as EsTreeNode;
  if (!isNodeOfType(only, "ReturnStatement") || !only.argument) return false;
  return isNullFilteringPredicateBody(only.argument as EsTreeNode);
};

// `str.split(',').map(...).filter(...)` — split returns a bounded
// array whose size is determined by the source string (typically
// small). Walks past chained pass-through calls (.map, .filter, etc.)
// to find the receiver root and checks for `.split(...)`.
const isStringSplitRootedChain = (receiverNode: EsTreeNode | null | undefined): boolean => {
  let cursor: EsTreeNode | null | undefined = receiverNode;
  let hops = 0;
  while (cursor && hops < 12) {
    hops += 1;
    if (isNodeOfType(cursor, "ChainExpression")) {
      cursor = cursor.expression;
      continue;
    }
    if (!isNodeOfType(cursor, "CallExpression")) return false;
    const callee = cursor.callee;
    if (!isNodeOfType(callee, "MemberExpression")) return false;
    if (!isNodeOfType(callee.property, "Identifier")) return false;
    if (callee.property.name === "split") return true;
    // Walk past .map / .filter / etc. — any chainable iteration method.
    if (!isChainPassThroughCall(cursor)) return false;
    cursor = callee.object;
  }
  return false;
};

const isSmallLiteralArrayRootedChain = (receiverNode: EsTreeNode | null | undefined): boolean => {
  let cursor: EsTreeNode | null | undefined = receiverNode;
  while (cursor) {
    if (isNodeOfType(cursor, "ChainExpression")) {
      cursor = cursor.expression;
      continue;
    }
    if (isNodeOfType(cursor, "ArrayExpression")) {
      const elements = cursor.elements ?? [];
      if (elements.length === 0 || elements.length > SMALL_LITERAL_ARRAY_MAX_ELEMENTS) {
        return false;
      }
      // No spread elements — those could expand to arbitrary length.
      for (const element of elements) {
        if (!element) continue;
        if (isNodeOfType(element, "SpreadElement")) return false;
      }
      return true;
    }
    // `Object.entries(obj).map(...).filter(...)` IS array-eager —
    // Object.values / Object.entries materialize a new array each
    // call, so iterating twice DOES allocate temporary arrays. Even
    // though config-key counts are usually small, downstream readers
    // legitimately want the .reduce()/for...of rewrite for clarity.
    // Don't skip here.
    if (!isNodeOfType(cursor, "CallExpression")) return false;
    if (!isChainPassThroughCall(cursor)) return false;
    const nextCallee = cursor.callee;
    if (!isNodeOfType(nextCallee, "MemberExpression")) return false;
    cursor = nextCallee.object;
  }
  return false;
};

const collectGeneratorNames = (programNode: EsTreeNode): Set<string> => {
  const generatorNames = new Set<string>();
  walkAst(programNode, (child: EsTreeNode) => {
    if (
      isNodeOfType(child, "FunctionDeclaration") &&
      child.generator === true &&
      isNodeOfType(child.id, "Identifier")
    ) {
      generatorNames.add(child.id.name);
      return;
    }
    if (
      isNodeOfType(child, "VariableDeclarator") &&
      isNodeOfType(child.id, "Identifier") &&
      isNodeOfType(child.init, "FunctionExpression") &&
      child.init.generator === true
    ) {
      generatorNames.add(child.id.name);
    }
  });
  return generatorNames;
};

export const jsCombineIterations = defineRule<Rule>({
  id: "js-combine-iterations",
  tags: ["test-noise"],
  severity: "warn",
  recommendation:
    "Combine `.map().filter()` (or similar chains) into a single pass with `.reduce()` or a `for...of` loop to avoid iterating the array twice",
  create: (context: RuleContext) => {
    let generatorNamesInFile: ReadonlySet<string> = new Set();
    const isTestlikeFile = isTestlikeFilename(context.getFilename?.());

    return {
      Program(programNode: EsTreeNodeOfType<"Program">) {
        generatorNamesInFile = collectGeneratorNames(programNode);
      },
      CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
        if (isTestlikeFile) return;
        if (
          !isNodeOfType(node.callee, "MemberExpression") ||
          !isNodeOfType(node.callee.property, "Identifier")
        )
          return;

        const outerMethod = node.callee.property.name;
        if (!CHAINABLE_ITERATION_METHODS.has(outerMethod)) return;

        const innerCall = node.callee.object;
        if (
          !isNodeOfType(innerCall, "CallExpression") ||
          !isNodeOfType(innerCall.callee, "MemberExpression") ||
          !isNodeOfType(innerCall.callee.property, "Identifier")
        )
          return;

        const innerMethod = innerCall.callee.property.name;
        if (!CHAINABLE_ITERATION_METHODS.has(innerMethod)) return;

        if (innerMethod === "map" && outerMethod === "filter") {
          const filterArgument = node.arguments?.[0];
          const isBooleanOrIdentityFilter =
            (isNodeOfType(filterArgument, "Identifier") && filterArgument.name === "Boolean") ||
            (isNodeOfType(filterArgument, "ArrowFunctionExpression") &&
              filterArgument.params?.length === 1 &&
              isNodeOfType(filterArgument.body, "Identifier") &&
              isNodeOfType(filterArgument.params[0], "Identifier") &&
              filterArgument.body.name === filterArgument.params[0].name);
          if (isBooleanOrIdentityFilter) return;
          // `.map(x => …).filter((x): x is T => x != null)` /
          // `.filter(x => x != null)` — TYPE-NARROWING filter. The
          // user's intent is "produce a typed non-null array from a
          // possibly-null transform". Rewriting to .reduce() loses
          // both the type narrowing AND readability. Bounded by N.
          if (isNullFilteringPredicate(filterArgument as EsTreeNode | null | undefined)) return;
        }
        // `.filter(typeNarrowingFn).map(...)` — the canonical
        // TypeScript "narrow then transform" pattern. The .filter is
        // a type predicate (`(x): x is T => x != null`) or null guard
        // and the .map receives the narrowed type. Rewriting to
        // .reduce() loses the type-narrowing benefit AND readability.
        if (innerMethod === "filter" && outerMethod === "map") {
          const innerCallArgs = (innerCall as EsTreeNodeOfType<"CallExpression">).arguments;
          const filterArgument = innerCallArgs?.[0];
          if (isNullFilteringPredicate(filterArgument as EsTreeNode | null | undefined)) {
            return;
          }
          // Type-predicate arrow (`(x): x is T => ...`) — even if the
          // body isn't a simple null check, the user is doing
          // narrow-then-transform. Skip.
          if (isTypePredicateArrow(filterArgument as EsTreeNode | null | undefined)) return;
        }

        if (isReceiverChainIteratorRooted(innerCall.callee.object, generatorNamesInFile)) return;
        if (isSmallLiteralArrayRootedChain(innerCall.callee.object)) return;
        // `str.split(',').map(...).filter(...)` — split returns a
        // bounded array whose size is determined by the input string
        // (typically small, 1-50 elements). Same trivial-cost
        // reasoning as Object.entries / literal-array roots.
        if (isStringSplitRootedChain(innerCall.callee.object)) return;

        context.report({
          node,
          message: `.${innerMethod}().${outerMethod}() iterates the array twice — combine into a single loop with .reduce() or for...of`,
        });
      },
    };
  },
});
