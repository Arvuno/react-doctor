import React from "react";

// a11y-alt-text: img without alt
const MissingAlt = () => <img src="photo.jpg" />;

// a11y-anchor-is-valid: anchor without href
const BadAnchor = () => <a>click me</a>;

// a11y-anchor-is-valid: anchor with javascript: href
const ScriptAnchor = () => <a href="javascript:void(0)">click</a>;

// a11y-click-events-have-key-events: click without key event
const ClickNoKey = () => <div onClick={() => {}} />;

// a11y-no-static-element-interactions: static element with handler
const StaticHandler = () => <div onClick={() => {}} />;

// a11y-role-has-required-aria-props: checkbox role without aria-checked
const MissingAriaChecked = () => <span role="checkbox" />;

// a11y-no-autofocus: using autoFocus
const AutoFocused = () => <input autoFocus />;

// a11y-heading-has-content: empty heading
const EmptyHeading = () => <h1 />;

// a11y-html-has-lang: html without lang
const NoLang = () => <html />;

// a11y-no-redundant-roles: nav with redundant navigation role
const RedundantRole = () => <nav role="navigation" />;

// a11y-scope: scope on non-th element
const BadScope = () => <td scope="row" />;

// a11y-tabindex-no-positive: positive tabindex
const PositiveTabindex = () => <div tabIndex={5} />;

// a11y-label-has-associated-control: label without control
const OrphanLabel = () => <label>Name</label>;

// a11y-no-distracting-elements: marquee element
const Marquee = () => <marquee>scrolling text</marquee>;

// a11y-iframe-has-title: iframe without title
const NoTitleIframe = () => <iframe src="page.html" />;

export {
  MissingAlt,
  BadAnchor,
  ScriptAnchor,
  ClickNoKey,
  StaticHandler,
  MissingAriaChecked,
  AutoFocused,
  EmptyHeading,
  NoLang,
  RedundantRole,
  BadScope,
  PositiveTabindex,
  OrphanLabel,
  Marquee,
  NoTitleIframe,
};
