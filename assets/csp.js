// Only trusted site-generated presentation declarations enter this helper.
// Keep dynamic declarations in a same-origin stylesheet rather than HTML style
// attributes, which browsers correctly reject under style-src-attr 'none'.
(() => {
  const rules = new Map();
  const sheet = [...document.styleSheets].find(s => s.href && new URL(s.href).pathname === '/assets/runtime.css');
  if (!sheet) throw new Error('Missing same-origin runtime stylesheet');
  window.cspHTML = html => html.replace(/<([a-z][^<>]*?)\sstyle="([^"]*)"([^<>]*?)>/gi, (_, before, declarations, after) => {
    let name = rules.get(declarations);
    if (!name) {
      let hash = 0xcbf29ce484222325n;
      for (const character of declarations) hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n);
      name = `presentation-${hash.toString(36)}`;
      // These declarations originate in our JS templates, never remote markup.
      // CSSStyleSheet validates their syntax; CSS still obeys resource CSP.
      sheet.insertRule(`.${name} { ${declarations} }`, sheet.cssRules.length);
      rules.set(declarations, name);
    }
    let tag = before + after;
    const closed = /\/\s*$/.test(tag);
    if (closed) tag = tag.replace(/\/\s*$/, '');
    if (/\bclass="[^"]*"/.test(tag)) tag = tag.replace(/\bclass="([^"]*)"/, (_, existing) => `class="${existing} ${name}"`);
    else tag += ` class="${name}"`;
    return `<${tag}${closed ? '/' : ''}>`;
  });
})();
