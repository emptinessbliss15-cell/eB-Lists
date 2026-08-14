// Shared eBliss Theme loader. Theme repo is the source of truth.
const THEME_BASE = 'https://raw.githubusercontent.com/emptinessbliss15-cell/eBliss-Theme/main/';

export async function loadEBlissTheme() {
  const cssFiles = ['theme.css', 'shell.css', 'navigation.css'];
  await Promise.all(cssFiles.map(async (file) => {
    const response = await fetch(THEME_BASE + file);
    if (!response.ok) throw new Error(`Unable to load eBliss Theme: ${file}`);
    const style = document.createElement('style');
    style.dataset.eblissTheme = file;
    style.textContent = await response.text();
    document.head.appendChild(style);
  }));
}
