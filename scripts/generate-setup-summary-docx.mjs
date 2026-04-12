/**
 * Generates docs/UrduPal-Setup-Summary.docx — run: node scripts/generate-setup-summary-docx.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document, Packer, Paragraph, TextRun } from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs");
const outFile = path.join(outDir, "UrduPal-Setup-Summary.docx");

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120 },
    children: [new TextRun({ text, ...opts.run })],
  });
}

function boldLine(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  });
}

const children = [
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "UrduPal — Setup & Workflow Summary",
        bold: true,
        size: 32,
      }),
    ],
  }),
  p("Use this document to remember how Cursor, GitHub, Vercel, and Supabase fit together.", {
    after: 200,
  }),

  boldLine("One-time setup"),
  p("1. Supabase (database)", { run: { bold: true } }),
  p("• Create a project at supabase.com."),
  p("• Open SQL Editor and run the migration file from your repo: supabase/migrations/20260408100000_urdupal_local_accounts.sql (creates username/password storage and links lesson progress)."),
  p("• From Settings → API, copy: Project URL (for NEXT_PUBLIC_SUPABASE_URL) and the service_role key (for SUPABASE_SERVICE_ROLE_KEY). Keep the service_role key private."),

  p("2. Your computer (Cursor / project folder)", { run: { bold: true } }),
  p("• Open the urdupal-app folder in Cursor."),
  p("• Create .env.local in the project root (same folder as package.json) with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and AUTH_SECRET."),
  p("• AUTH_SECRET is not from Supabase — generate a long random string (e.g. Terminal: openssl rand -base64 32)."),
  p("• Run: npm install then npm run dev — open http://localhost:3000 and test sign-up."),

  p("3. GitHub", { run: { bold: true } }),
  p("• Your code lives in a repo (e.g. haleemkahloon/UrduPal)."),
  p("• Push changes from Cursor with git. GitHub does not store .env.local (secrets stay local and on Vercel)."),

  p("4. Vercel (live website)", { run: { bold: true } }),
  p("• Connect the GitHub repo at vercel.com."),
  p("• Project → Settings → Environment Variables: add the same three names as .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET."),
  p("• Redeploy after changing env vars (Deployments → … → Redeploy)."),

  boldLine("Normal workflow when you change the app"),
  p("1. Edit code in Cursor and test with npm run dev."),
  p("2. Commit and push to GitHub (main)."),
  p("3. Vercel usually deploys automatically — wait until Ready, then test your *.vercel.app URL."),

  boldLine("When you change the database"),
  p("1. Add or change SQL in supabase/migrations/ in the repo."),
  p("2. In Supabase → SQL Editor, run that SQL on your project."),
  p("3. If you add new environment variables, update .env.local and Vercel, then redeploy."),

  boldLine("Where things live"),
  p("• Code: Cursor → GitHub"),
  p("• Secrets (.env.local on your PC + Vercel env for production): never commit .env.local"),
  p("• Database: Supabase"),
  p("• Live site URL: Vercel"),

  boldLine("If something breaks"),
  p("• Local works but the live site does not: check Vercel environment variables and Redeploy."),
  p("• “Not configured” errors: missing or wrong AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY in that environment."),
  p("• Database errors: migration not run or wrong Supabase project."),

  p("Generated for UrduPal. Regenerate with: node scripts/generate-setup-summary-docx.mjs", {
    after: 0,
    run: { italics: true, size: 20 },
  }),
];

const doc = new Document({
  sections: [{ children }],
});

const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, buffer);
console.log("Wrote", outFile);
