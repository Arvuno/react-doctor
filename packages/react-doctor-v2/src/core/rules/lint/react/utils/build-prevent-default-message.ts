export const buildPreventDefaultMessage = (elementName: string): string => {
  if (elementName === "form") {
    return "preventDefault() on <form> onSubmit - form won't work without JavaScript. Consider using a server action for progressive enhancement";
  }
  return "preventDefault() on <a> onClick - use a <button> or routing component instead";
};
