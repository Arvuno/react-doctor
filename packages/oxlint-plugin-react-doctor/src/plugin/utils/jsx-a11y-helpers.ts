import type { EsTreeNodeOfType } from "./es-tree-node-of-type.js";
import { isNodeOfType } from "./is-node-of-type.js";
import { findJsxAttributeIgnoreCase } from "./find-jsx-attribute-ignore-case.js";
import type { EsTreeNode } from "./es-tree-node.js";

export const getJsxAttributeStringValue = (
  attribute: EsTreeNodeOfType<"JSXAttribute">,
): string | undefined => {
  const value = attribute.value;
  if (!value) return undefined;
  if (isNodeOfType(value, "Literal") && typeof value.value === "string") return value.value;
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Literal") && typeof expression.value === "string") return expression.value;
    if (isNodeOfType(expression, "TemplateLiteral") && expression.quasis?.length === 1 && expression.expressions?.length === 0) {
      return expression.quasis[0].value?.cooked ?? expression.quasis[0].value?.raw ?? undefined;
    }
  }
  return undefined;
};

export const isJsxAttributeValueTruthy = (
  attribute: EsTreeNodeOfType<"JSXAttribute">,
): boolean => {
  const value = attribute.value;
  if (!value) return true;
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") return false;
    if (isNodeOfType(expression, "Literal")) {
      if (expression.value === null || expression.value === false || expression.value === "") return false;
    }
    if (isNodeOfType(expression, "TemplateLiteral") && expression.expressions?.length === 0) {
      const allEmpty = expression.quasis?.every((quasi: EsTreeNode) =>
        isNodeOfType(quasi, "TemplateElement") && (quasi.value?.raw === "" || !quasi.value?.raw)
      );
      if (allEmpty) return false;
    }
    return true;
  }
  if (isNodeOfType(value, "Literal")) {
    if (typeof value.value === "string") return value.value !== "";
    return Boolean(value.value);
  }
  return true;
};

export const isJsxAttributeValueNullOrUndefined = (
  attribute: EsTreeNodeOfType<"JSXAttribute">,
): boolean => {
  const value = attribute.value;
  if (!value) return false;
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") return true;
    if (isNodeOfType(expression, "Literal") && expression.value === null) return true;
  }
  return false;
};

export const hasSpreadAttribute = (attributes: EsTreeNode[]): boolean =>
  attributes?.some((attribute) => isNodeOfType(attribute, "JSXSpreadAttribute"));

export const isPresentationRole = (attributes: EsTreeNode[]): boolean => {
  const roleAttribute = findJsxAttributeIgnoreCase(attributes, "role");
  if (!roleAttribute) return false;
  const value = getJsxAttributeStringValue(roleAttribute);
  return value === "presentation" || value === "none";
};

export const isHiddenFromScreenReader = (attributes: EsTreeNode[]): boolean => {
  const ariaHidden = findJsxAttributeIgnoreCase(attributes, "aria-hidden");
  if (!ariaHidden) return false;
  if (!ariaHidden.value) return true;
  if (isNodeOfType(ariaHidden.value, "JSXExpressionContainer")) {
    const expression = ariaHidden.value.expression;
    if (isNodeOfType(expression, "Literal") && expression.value === false) return false;
    if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") return false;
  }
  if (isNodeOfType(ariaHidden.value, "Literal") && ariaHidden.value.value === "false") return false;
  return true;
};

export const HTML_TAGS = new Set([
  "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo",
  "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd",
  "label", "legend", "li", "link", "main", "map", "mark", "marquee", "menu", "menuitem", "meta",
  "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param",
  "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section",
  "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table",
  "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr",
  "track", "u", "ul", "var", "video", "wbr", "blink",
]);

export const INTERACTIVE_ELEMENTS = new Set([
  "a", "button", "datalist", "input", "menuitem", "option", "select", "textarea",
]);

export const NON_INTERACTIVE_ELEMENTS = new Set([
  "address", "article", "aside", "blockquote", "br", "canvas", "caption", "code", "dd", "del",
  "details", "dfn", "dir", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure",
  "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "html", "iframe", "img", "ins",
  "label", "legend", "li", "main", "mark", "marquee", "menu", "meter", "nav", "ol", "optgroup",
  "output", "p", "pre", "progress", "ruby", "section", "strong", "sub", "summary", "sup",
  "table", "tbody", "tfoot", "th", "thead", "time", "tr", "ul", "video", "audio",
]);

export const INTERACTIVE_ROLES = new Set([
  "button", "checkbox", "columnheader", "combobox", "form", "gridcell", "link", "menuitem",
  "menuitemcheckbox", "menuitemradio", "option", "radio", "rowheader", "searchbox", "slider",
  "spinbutton", "switch", "tab", "textbox", "treeitem",
]);

export const NON_INTERACTIVE_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "cell", "complementary",
  "contentinfo", "definition", "dialog", "directory", "document", "feed", "figure", "grid",
  "group", "heading", "img", "list", "listbox", "listitem", "log", "main", "marquee", "math",
  "menu", "menubar", "navigation", "none", "note", "paragraph", "presentation", "progressbar",
  "region", "row", "rowgroup", "scrollbar", "search", "separator", "status", "table", "tablist",
  "tabpanel", "term", "timer", "toolbar", "tooltip", "tree", "treegrid",
]);

export const ABSTRACT_ROLES = new Set([
  "command", "composite", "input", "landmark", "range", "roletype", "sectionhead", "select",
  "structure", "widget", "window",
]);

export const ELEMENT_IMPLICIT_ROLES: Record<string, string[]> = {
  a: ["link"],
  area: ["link"],
  article: ["article"],
  aside: ["complementary"],
  button: ["button"],
  datalist: ["listbox"],
  details: ["group"],
  dialog: ["dialog"],
  fieldset: ["group"],
  figure: ["figure"],
  footer: ["contentinfo"],
  form: ["form"],
  h1: ["heading"],
  h2: ["heading"],
  h3: ["heading"],
  h4: ["heading"],
  h5: ["heading"],
  h6: ["heading"],
  header: ["banner"],
  hr: ["separator"],
  img: ["img"],
  input: ["textbox"],
  li: ["listitem"],
  main: ["main"],
  menu: ["list"],
  meter: ["meter"],
  nav: ["navigation"],
  ol: ["list"],
  option: ["option"],
  output: ["status"],
  p: ["paragraph"],
  progress: ["progressbar"],
  section: ["region"],
  select: ["combobox", "listbox"],
  summary: ["button"],
  table: ["table"],
  tbody: ["rowgroup"],
  td: ["cell"],
  textarea: ["textbox"],
  tfoot: ["rowgroup"],
  thead: ["rowgroup"],
  tr: ["row"],
  ul: ["list"],
};

export const hasAccessibleChild = (children: EsTreeNode[]): boolean => {
  if (!children) return false;
  for (const child of children) {
    if (isNodeOfType(child, "JSXText") && child.value?.trim()) return true;
    if (isNodeOfType(child, "JSXExpressionContainer")) {
      const expression = child.expression;
      if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") continue;
      if (isNodeOfType(expression, "Literal") && !expression.value) continue;
      if (isNodeOfType(expression, "JSXEmptyExpression")) continue;
      return true;
    }
    if (isNodeOfType(child, "JSXElement")) {
      const openingElement = child.openingElement;
      if (!openingElement) continue;
      if (isHiddenFromScreenReader(openingElement.attributes ?? [])) continue;
      if (isNodeOfType(openingElement.name, "JSXIdentifier")) {
        const tagName = openingElement.name.name;
        if (tagName === "input" || tagName === "Input") {
          const typeAttribute = findJsxAttributeIgnoreCase(openingElement.attributes ?? [], "type");
          if (typeAttribute) {
            const typeValue = getJsxAttributeStringValue(typeAttribute);
            if (typeValue === "hidden") continue;
          }
        }
      }
      const dangerouslySetInnerHTML = findJsxAttributeIgnoreCase(openingElement.attributes ?? [], "dangerouslySetInnerHTML");
      if (dangerouslySetInnerHTML) return true;
      const childrenProp = findJsxAttributeIgnoreCase(openingElement.attributes ?? [], "children");
      if (childrenProp) return true;
      if (hasSpreadAttribute(openingElement.attributes ?? [])) return true;
      const isComponent = isNodeOfType(openingElement.name, "JSXIdentifier") &&
        /^[A-Z]/.test(openingElement.name.name);
      if (isComponent) return true;
      if (child.children && hasAccessibleChild(child.children)) return true;
    }
    if (isNodeOfType(child, "JSXFragment") && child.children && hasAccessibleChild(child.children)) {
      return true;
    }
  }
  return false;
};

export const isInteractiveElement = (
  tagName: string,
  attributes: EsTreeNode[],
): boolean => {
  if (tagName === "a") {
    return Boolean(findJsxAttributeIgnoreCase(attributes, "href"));
  }
  if (tagName === "input") {
    const typeAttribute = findJsxAttributeIgnoreCase(attributes, "type");
    if (typeAttribute) {
      const typeValue = getJsxAttributeStringValue(typeAttribute);
      if (typeValue === "hidden") return false;
    }
    return true;
  }
  return INTERACTIVE_ELEMENTS.has(tagName);
};
