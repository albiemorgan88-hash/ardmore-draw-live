#!/usr/bin/env node

const BASE = process.env.ARDMORE_BASE_URL || "https://ardmorecricket.com";
const ONEILLS_URL = "https://www.oneills.com/shop-by-team/cricket/ardmore-cricket-club.html";

const checks = [
  {
    name: "homepage",
    url: `${BASE}/`,
    status: 200,
    mustInclude: ["Ardmore Cricket Club", "Ardmore Kit Shop", "Fixtures", "/shop"],
  },
  {
    name: "fixtures page",
    url: `${BASE}/fixtures`,
    status: 200,
    mustInclude: ["Fixtures"],
  },
  {
    name: "draw page",
    url: `${BASE}/draw`,
    status: 200,
    mustInclude: ["Weekly Draw"],
  },
  {
    name: "sponsors page / match ball component",
    url: `${BASE}/sponsors`,
    status: 200,
    mustInclude: ["Match Ball", "Sponsor"],
  },
];

async function checkHtml({ name, url, status, mustInclude }) {
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  const failures = [];
  if (res.status !== status) failures.push(`expected ${status}, got ${res.status}`);
  for (const marker of mustInclude) {
    if (!body.includes(marker)) failures.push(`missing marker: ${marker}`);
  }
  return { name, url, ok: failures.length === 0, failures };
}

async function checkFixturesApi() {
  const url = `${BASE}/api/fixtures`;
  const res = await fetch(url);
  const failures = [];
  if (res.status !== 200) failures.push(`expected 200, got ${res.status}`);
  let json = null;
  try {
    json = await res.json();
  } catch {
    failures.push("response is not JSON");
  }
  if (!Array.isArray(json?.matches)) failures.push("missing matches array");
  return { name: "fixtures api", url, ok: failures.length === 0, failures };
}

async function checkShopRedirect() {
  const url = `${BASE}/shop`;
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  const failures = [];
  if (![301, 302, 307, 308].includes(res.status)) failures.push(`expected redirect, got ${res.status}`);
  if (location !== ONEILLS_URL) failures.push(`expected O'Neills location, got ${location || "<empty>"}`);
  return { name: "kit shop redirect", url, ok: failures.length === 0, failures };
}

const results = [];
for (const check of checks) results.push(await checkHtml(check));
results.push(await checkFixturesApi());
results.push(await checkShopRedirect());

for (const result of results) {
  const icon = result.ok ? "✅" : "❌";
  console.log(`${icon} ${result.name}: ${result.url}`);
  for (const failure of result.failures) console.log(`   - ${failure}`);
}

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(`\n${failed.length} production smoke check(s) failed.`);
  process.exit(1);
}

console.log("\nArdmore production smoke checks passed.");
