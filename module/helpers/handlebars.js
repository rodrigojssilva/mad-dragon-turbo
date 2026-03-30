export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Repete um bloco N vezes
  Handlebars.registerHelper("times", function (n, block) {
    let result = "";
    for (let i = 0; i < n; i++) result += block.fn(i);
    return result;
  });
}
