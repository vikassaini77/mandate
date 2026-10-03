export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <title>MANDATE — Service unavailable</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap" rel="stylesheet">
    <style>
      :root {
        --background: oklch(.105 .018 265);
        --foreground: oklch(.94 .008 260);
        --primary: oklch(.67 .2 270);
        --primary-foreground: oklch(.99 0 0);
        --brand-gradient: linear-gradient(115deg, oklch(.56 .24 278), oklch(.72 .15 220));
      }
      body { 
        font: 15px/1.5 system-ui, -apple-system, sans-serif; 
        background: var(--background); 
        color: var(--foreground); 
        display: grid; 
        place-items: center; 
        min-height: 100vh; 
        margin: 0; 
        padding: 1.5rem; 
      }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      .brand { 
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 600;
        letter-spacing: 0.16em;
        margin-bottom: 2rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .brand-icon {
        width: 32px;
        height: 32px;
        background: var(--brand-gradient);
        border-radius: 6px;
      }
      h1 { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { color: oklch(.64 .02 260); margin: 0 0 2rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { 
        padding: 0.625rem 1.25rem; 
        border-radius: 0.375rem; 
        font: inherit; 
        font-weight: 500;
        cursor: pointer; 
        text-decoration: none; 
        border: 1px solid transparent; 
        transition: all 0.2s;
      }
      .primary { 
        background: var(--brand-gradient); 
        color: var(--primary-foreground); 
        box-shadow: 0 8px 28px color-mix(in oklab, var(--primary) 25%, transparent);
      }
      .primary:hover { brightness: 1.1; transform: translateY(-1px); }
      .secondary { 
        background: oklch(.19 .02 265); 
        color: var(--foreground); 
        border-color: oklch(.25 .02 265); 
      }
      .secondary:hover { background: oklch(.21 .025 265); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">
        <div class="brand-icon"></div>
        MANDATE
      </div>
      <h1>System unavailable</h1>
      <p>We're experiencing a critical service disruption. Our team has been notified and we're working to restore access.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
