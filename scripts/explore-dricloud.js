// scripts/explore-dricloud.js
// Entra a DriCloud, navega a la agenda y toma screenshots para entender la UI.
// Uso: node scripts/explore-dricloud.js

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_URL = "https://latam.dricloud.net/Dricloud_santiago_20737385";
const USUARIO = "ficcadenti";
const PASSWORD = "bestem2026";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshot(page, nombre) {
  const file = path.join(SCREENSHOTS_DIR, `${nombre}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  📸 Screenshot guardado: scripts/screenshots/${nombre}.png`);
}

(async () => {
  console.log("\n=== Explorador DriCloud ===\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // 1. Login
    console.log("1. Abriendo login...");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await screenshot(page, "01-pagina-inicial");
    console.log(`   URL actual: ${page.url()}`);

    // Buscar campos de usuario y contraseña
    const inputs = await page.locator("input").all();
    console.log(`   Inputs encontrados: ${inputs.length}`);
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute("type");
      const name = await inputs[i].getAttribute("name");
      const id = await inputs[i].getAttribute("id");
      const placeholder = await inputs[i].getAttribute("placeholder");
      console.log(`   Input[${i}]: type=${type} name=${name} id=${id} placeholder=${placeholder}`);
    }

    // Intentar login con los campos más comunes
    const userSelectors = [
      'input[name="UserName"]', 'input[name="username"]', 'input[name="user"]',
      'input[id="UserName"]', 'input[id="username"]', 'input[type="text"]',
      'input[type="email"]'
    ];
    const passSelectors = [
      'input[name="Password"]', 'input[name="password"]',
      'input[id="Password"]', 'input[type="password"]'
    ];

    let userField = null;
    for (const sel of userSelectors) {
      try {
        userField = page.locator(sel).first();
        await userField.waitFor({ state: "visible", timeout: 2000 });
        console.log(`   Campo usuario encontrado: ${sel}`);
        break;
      } catch { userField = null; }
    }

    let passField = null;
    for (const sel of passSelectors) {
      try {
        passField = page.locator(sel).first();
        await passField.waitFor({ state: "visible", timeout: 2000 });
        console.log(`   Campo contraseña encontrado: ${sel}`);
        break;
      } catch { passField = null; }
    }

    if (!userField || !passField) {
      console.log("   ⚠️  No se encontraron campos de login con selectores conocidos.");
      await screenshot(page, "02-login-no-encontrado");
      await browser.close();
      return;
    }

    await userField.fill(USUARIO);
    await passField.fill(PASSWORD);
    await screenshot(page, "02-login-lleno");

    // Submit
    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Entrar")', 'button:has-text("Login")',
      'button:has-text("Iniciar")', 'button:has-text("Acceder")'
    ];
    let submitted = false;
    for (const sel of submitSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: "visible", timeout: 1000 });
        await btn.click();
        submitted = true;
        console.log(`   Submit con: ${sel}`);
        break;
      } catch {}
    }
    if (!submitted) {
      await passField.press("Enter");
      console.log("   Submit con Enter");
    }

    await page.waitForLoadState("networkidle").catch(() => {});
    await sleep(2000);
    await screenshot(page, "03-post-login");
    console.log(`   URL post-login: ${page.url()}`);

    // 2. Explorar navegación principal
    console.log("\n2. Explorando menú principal...");
    const links = await page.locator("a, nav a, .menu a, .sidebar a").all();
    console.log(`   Links encontrados: ${links.length}`);
    const linkTexts = [];
    for (const link of links.slice(0, 30)) {
      const text = (await link.textContent())?.trim();
      const href = await link.getAttribute("href");
      if (text && text.length > 1) linkTexts.push({ text, href });
    }
    console.log("   Links del menú:");
    linkTexts.forEach((l) => console.log(`     - "${l.text}" → ${l.href}`));

    // 3. Buscar la agenda
    console.log("\n3. Buscando sección de agenda...");
    const agendaKeywords = ["agenda", "citas", "calendario", "turnos", "schedule"];
    let agendaFound = false;

    for (const kw of agendaKeywords) {
      try {
        const agendaLink = page.locator(`a:has-text("${kw}"), a[href*="${kw}"]`).first();
        await agendaLink.waitFor({ state: "visible", timeout: 2000 });
        console.log(`   Encontré link de agenda con keyword "${kw}"`);
        await agendaLink.click();
        await page.waitForLoadState("networkidle").catch(() => {});
        await sleep(2000);
        await screenshot(page, "04-agenda");
        console.log(`   URL agenda: ${page.url()}`);
        agendaFound = true;
        break;
      } catch {}
    }

    if (!agendaFound) {
      console.log("   No encontré link de agenda con keywords conocidos.");
      // Capturar el HTML para análisis
      const html = await page.content();
      fs.writeFileSync(path.join(SCREENSHOTS_DIR, "pagina-post-login.html"), html);
      console.log("   HTML guardado en scripts/screenshots/pagina-post-login.html");
    }

    // 4. Inspeccionar la página de agenda
    if (agendaFound) {
      console.log("\n4. Inspeccionando agenda...");
      const tables = await page.locator("table").count();
      const rows = await page.locator("tr").count();
      console.log(`   Tablas: ${tables}, Filas: ${rows}`);

      const html = await page.content();
      fs.writeFileSync(path.join(SCREENSHOTS_DIR, "agenda.html"), html);
      console.log("   HTML de agenda guardado en scripts/screenshots/agenda.html");
    }

    console.log("\n✅ Exploración completa. Revisá las screenshots en scripts/screenshots/\n");

  } catch (err) {
    console.error("Error:", err.message);
    await screenshot(page, "error").catch(() => {});
  } finally {
    await browser.close();
  }
})();
