export class GlobalCSSGenerator {
  generate(): string {
    return `
      #bili-header-container > div {
        display: none !important;
      }

      #i_cecream > div > div.search-entry-page.p_relative > div > div > div > div > div {
        display: none !important;
      }
    `;
  }
}
