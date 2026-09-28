import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const adminPassword =
  (await readFile(".env.local", "utf8").catch(() => "")).match(
    /^ADMIN_PASSWORD=(.*)$/m,
  )?.[1]?.trim() ?? "";
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  acceptDownloads: true,
});
context.setDefaultTimeout(120000);
context.setDefaultNavigationTimeout(120000);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`${base}/student`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await page.getByRole("button", { name: /7º ano/ }).click();
  await page.getByRole("button", { name: "Turma A", exact: true }).click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Aluno de demonstração");
  const rotating = await page.locator(".inspiration-message").innerText();
  assert.ok(
    [
      "Organize sua rotina de estudos.",
      "Estude com lápis e papel na mão!",
      "Sempre faça registros dos seus estudos.",
    ].includes(rotating.trim()),
    `banner inesperado: ${rotating}`,
  );
  await page.screenshot({ path: ".local/student-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Definir horários", exact: true })
    .click();
  await page.getByText("Escolha pelo menos uma disciplina").waitFor();
  for (const name of [
    "GEO Geografia",
    "MAT Matemática",
    "CIE Ciências",
    "BIO Biologia",
    "FIS Física",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await page
    .getByRole("button", { name: "Definir horários", exact: true })
    .click();
  await page.getByRole("button", { name: "Gerar meu plano" }).click();
  await page.getByText("Escolha pelo menos um horário").waitFor();
  for (const day of ["Seg", "Ter", "Qua", "Qui", "Sex"])
    for (const time of [
      "15:00 às 15:30",
      "15:30 às 16:00",
      "16:00 às 16:30",
      "16:30 às 17:00",
    ])
      await page
        .getByRole("button", { name: `${day} ${time}`, exact: true })
        .click();
  await page.getByText("Personalizar período").click();
  assert.ok((await page.locator(".period-options-icon svg").count()) > 0);
  assert.equal(
    await page
      .locator(".period-options")
      .evaluate((el) => getComputedStyle(el).borderTopColor),
    "rgb(201, 168, 242)",
  );
  await page.getByLabel("Início", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Fim", { exact: true }).fill("2026-10-20");
  await page.getByRole("button", { name: "Gerar meu plano" }).click();
  await page.locator(".plan-transition").waitFor();
  await page.waitForURL(/\/plan\//, { timeout: 120000 });
  await page.getByRole("heading", { name: "Seu plano está pronto!" }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Seu plano está pronto!" }).waitFor();
  assert.ok((await page.locator(".session-card").count()) > 0);
  assert.equal(await page.locator(".week-tabs").count(), 0);
  assert.ok((await page.locator(".plan-week").count()) >= 4);
  assert.ok(
    await page
      .getByRole("heading", { name: "Como estudar para recuperação" })
      .count(),
  );
  assert.ok(
    await page
      .locator(".section-title")
      .getByRole("button", { name: "Baixar meu plano" })
      .count(),
  );
  assert.equal(
    await page
      .locator(".session-card .recipe-step > span")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(112, 64, 200)",
  );
  assert.ok(
    (
      await page
        .locator(".events-card")
        .evaluate((el) => getComputedStyle(el).backgroundImage)
    ).includes("gradient"),
  );
  await page.locator(".session-card summary").first().click();
  await page
    .getByText("Por que isso está aqui?", { exact: true })
    .first()
    .waitFor();
  const stepNumbers = await page
    .locator(".session-card")
    .first()
    .locator(".recipe-step > span")
    .allInnerTexts();
  assert.ok(stepNumbers.length > 0, "passo a passo vazio");
  assert.ok(
    stepNumbers.every((v) => /^\d+$/.test(v.trim())),
    `passos deveriam ser numéricos: ${stepNumbers.join(",")}`,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(".local/plano-demonstracao.pdf");
  const pdf = await readFile(".local/plano-demonstracao.pdf");
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 5000);
  assert.ok((await page.locator(".plan-week").count()) >= 4);
  await page.screenshot({ path: ".local/plan-desktop.png", fullPage: true });
  const planUrl = page.url();
  await page.reload({ waitUntil: "networkidle" });
  assert.ok((await page.locator(".session-card").count()) > 0);
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  if (adminPassword) {
    await page
      .getByLabel("Senha administrativa", { exact: true })
      .fill(adminPassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  assert.ok(
    (
      await page
        .locator(".admin-sidebar")
        .evaluate((el) => getComputedStyle(el).backgroundImage)
    ).includes("gradient"),
  );
  assert.equal(
    await page
      .locator(".admin-sidebar")
      .evaluate((el) => getComputedStyle(el).overflowY),
    "auto",
  );
  await page
    .getByText("Aluno de demonstração", { exact: true })
    .first()
    .waitFor();
  assert.ok((await page.locator(".registry-table tbody tr").count()) > 0);
  await page.getByRole("button", { name: "No seu radar", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Teste radar");
  await page.getByLabel("Data", { exact: true }).fill("2027-03-10");
  await page
    .getByRole("button", { name: "Adicionar compromisso" })
    .click();
  await page.getByText("Teste radar", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Excluir Teste radar", exact: true })
    .click();
  assert.equal(await page.getByText("Teste radar", { exact: true }).count(), 0);
  await page
    .getByRole("button", { name: "Anos e turmas", exact: true })
    .click();
  await page.getByRole("button", { name: "6º ano", exact: true }).click();
  assert.ok((await page.getByText("6D", { exact: true }).count()) > 0);
  assert.equal(await page.getByText("7A", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await page.getByRole("button", { name: "Regras", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Aula no mesmo dia", exact: true })
    .click();
  await page.getByLabel("Valor", { exact: true }).fill("31");
  await page.getByRole("button", { name: "Aplicar alteração" }).click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.getByRole("status").waitFor();
  let school = (await (await context.request.get(`${base}/api/school`)).json())
    .data;
  assert.equal(
    school.rules.find((r) => r.code === "same_day_subject_bonus").value,
    31,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Importar dados", exact: true })
    .click();
  await page
    .getByLabel("Arquivo para importar")
    .setInputFiles({
      name: "teste.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "date,event_type,title,grade,class,subject\n2027-03-20,assessment,Avaliação de teste,7,7A,MAT\n",
      ),
    });
  await page
    .getByRole("button", { name: "Aplicar importação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await page.getByRole("status").waitFor();
  school = (await (await context.request.get(`${base}/api/school`)).json())
    .data;
  assert.ok(
    school.events.some(
      (e) => e.title === "Avaliação de teste" && e.classId === "class-7a",
    ),
  );
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await page.getByRole("button", { name: "Mês", exact: true }).click();
  await page.screenshot({ path: ".local/admin-calendar.png", fullPage: true });
  // Restore the seeded rule and remove only the test event, keeping the demonstration plan.
  school.rules.find((r) => r.code === "same_day_subject_bonus").value = 25;
  school.events = school.events.filter((e) => e.title !== "Avaliação de teste");
  const restored = await context.request.put(`${base}/api/school`, {
    data: school,
  });
  assert.ok(restored.ok());
  await page.goto(`${planUrl}?debug=true`, { waitUntil: "networkidle" });
  await page.locator(".session-card summary").first().click();
  assert.equal((await page.locator(".debug-box").count()) > 0, true);
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.setDefaultTimeout(120000);
  await mobile.goto(`${base}/student`, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: /7º ano/ }).click();
  await mobile.getByRole("button", { name: "Turma A", exact: true }).click();
  await mobile
    .getByLabel("Nome completo", { exact: true })
    .fill("Aluno de demonstração");
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await mobile.screenshot({
    path: ".local/student-mobile.png",
    fullPage: true,
  });
  await mobile.getByRole("button", { name: "Continuar", exact: true }).click();
  await mobile
    .getByRole("button", { name: "MAT Matemática", exact: true })
    .click();
  await mobile
    .getByRole("button", { name: "Definir horários", exact: true })
    .click();
  await mobile
    .getByRole("button", { name: "Seg 15:00 às 15:30", exact: true })
    .tap();
  assert.equal(
    await mobile
      .getByRole("button", { name: "Seg 15:00 às 15:30", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await mobile.screenshot({
    path: ".local/availability-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    ".local/browser-result.json",
    JSON.stringify(
      {
        success: true,
        planUrl,
        pdfBytes: pdf.length,
        errors,
        checks: [
          "student flow",
          "full name",
          "rotating banner",
          "BIO/FIS subjects",
          "subject and slot validations",
          "availability",
          "purple period box",
          "3s transition screen",
          "persistent plan",
          "PDF download",
          "full plan view only",
          "numbered recovery steps",
          "black steps + purple badges",
          "top download button",
          "purple radar card",
          "recovery guidance card",
          "admin password login",
          "purple admin sidebar + scroll",
          "year filters",
          "radar commitments",
          "plan registry",
          "admin rule persistence",
          "CSV preview/import",
          "calendar",
          "debug authorized",
          "mobile layout",
          "touch availability",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ success: true, planUrl, pdfBytes: pdf.length, errors }),
  );
} finally {
  await browser.close();
}
