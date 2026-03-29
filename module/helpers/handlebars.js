export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);
}
