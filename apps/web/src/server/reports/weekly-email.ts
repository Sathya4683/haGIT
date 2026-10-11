import { BASE_LIGHT, getPalette, rgbToHex } from "@/lib/palettes";
import { appUrl } from "@/server/kb/service";
import type { WeeklyReportData } from "./weekly-data";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Email-client-safe HTML (tables, inline styles) plus a plain-text alternative. */
export function weeklyEmail(data: WeeklyReportData) {
    const p = getPalette(data.palette);
    const s = p.light ?? BASE_LIGHT;
    const brand = rgbToHex(p.brand[500]);
    const brandSoft = rgbToHex(p.brand[100]);
    const ink = rgbToHex(s.ink);
    const muted = rgbToHex(s.inkMuted);
    const paper = rgbToHex(s.paper);
    const card = rgbToHex(s.card);
    const dashboard = `${appUrl()}/dashboard`;
    const font = "font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";
    const mono = "font-family:'JetBrains Mono',SFMono-Regular,Menlo,Consolas,monospace;";
    const label = `${font}font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${muted};`;
    const diff = data.totals.commits - data.totals.previous;
    const deltaText = diff === 0 ? "same as last week" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs last week`;

    const stat = (name: string, value: string, sub: string) => `
        <td width="33%" style="padding:6px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${ink};background:${card};box-shadow:4px 4px 0 ${ink};">
            <tr><td style="padding:12px;">
              <div style="${label}">${esc(name)}</div>
              <div style="${mono}font-size:24px;font-weight:800;color:${ink};margin-top:4px;">${esc(value)}</div>
              <div style="${font}font-size:12px;color:${muted};margin-top:2px;">${esc(sub)}</div>
            </td></tr>
          </table>
        </td>`;

    const habitRows = data.habits.slice(0, 8).map((h) => `
        <tr>
          <td style="${font}font-size:14px;font-weight:700;color:${ink};padding:8px 0;border-top:1px dashed ${muted};">${esc(h.name)}</td>
          <td align="right" style="${mono}font-size:13px;color:${ink};padding:8px 0;border-top:1px dashed ${muted};">${h.commits} <span style="color:${muted};">/ ${h.previous}</span></td>
          <td align="right" style="${mono}font-size:12px;color:${muted};padding:8px 0 8px 12px;border-top:1px dashed ${muted};">${h.currentStreak}d streak</td>
        </tr>`).join("");

    const articles = data.articles.map((a) => `
        <tr><td style="padding:6px 0;">
          <a href="${esc(a.url)}" style="text-decoration:none;color:${ink};">
            <span style="${mono}font-size:11px;font-weight:800;border:2px solid ${ink};padding:1px 4px;">KB${a.id}</span>
            <span style="${font}font-size:14px;font-weight:800;margin-left:6px;">${esc(a.title)}</span>
          </a>
          <div style="${font}font-size:12px;color:${muted};margin-top:3px;">${esc(a.summary)}</div>
        </td></tr>`).join("");

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your haGIT week</title></head>
<body style="margin:0;padding:0;background:${paper};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${paper};"><tr><td align="center" style="padding:24px 12px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 6px 16px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:${brand};border:2px solid ${ink};width:26px;height:26px;text-align:center;${mono}font-size:10px;font-weight:800;color:#fff;">hG</td>
          <td style="${font}font-size:16px;font-weight:900;color:${ink};padding-left:8px;">haGIT</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 6px;">
        <div style="${label}">Weekly report · ${esc(data.week.label)}</div>
        <div style="${font}font-size:28px;font-weight:900;color:${ink};margin-top:6px;letter-spacing:-0.5px;">Your week in commits</div>
        <div style="width:44px;height:4px;background:${brand};margin:8px 0 14px;"></div>
      </td></tr>
      <tr><td><table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${stat("Commits", String(data.totals.commits), deltaText)}
        ${stat("Active days", `${data.totals.activeDays}/7`, data.totals.activeDays === 7 ? "every single day" : "days with a commit")}
        ${stat("Best habit", data.bestHabit ?? "—", data.bestHabit ? `${data.habits[0].commits} commits` : "no commits yet")}
      </tr></table></td></tr>
      <tr><td style="padding:16px 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${brandSoft};border-left:4px solid ${brand};">
          <tr><td style="padding:14px;">
            <div style="${label}">Coach's note</div>
            <div style="${font}font-size:15px;font-weight:700;color:${ink};line-height:1.5;margin-top:4px;">${esc(data.insight)}</div>
          </td></tr>
        </table>
      </td></tr>
      ${data.habits.length ? `<tr><td style="padding:0 6px 16px;">
        <div style="${label}margin-bottom:4px;">Habits (this week / last week)</div>
        <table width="100%" cellpadding="0" cellspacing="0">${habitRows}</table>
      </td></tr>` : ""}
      ${data.articles.length ? `<tr><td style="padding:0 6px 16px;">
        <div style="${label}margin-bottom:4px;">Further reading</div>
        <table width="100%" cellpadding="0" cellspacing="0">${articles}</table>
      </td></tr>` : ""}
      <tr><td style="padding:8px 6px 24px;">
        <a href="${dashboard}" style="display:inline-block;background:${brand};color:#fff;${font}font-size:14px;font-weight:800;text-decoration:none;padding:12px 20px;border:2px solid ${ink};box-shadow:4px 4px 0 ${ink};">Open your dashboard →</a>
      </td></tr>
      <tr><td style="padding:0 6px;${font}font-size:11px;color:${muted};">
        The full report is attached as a PDF. You're receiving this because weekly reports are on in your haGIT settings.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    const text = [
        `haGIT weekly report · ${data.week.label}`,
        "",
        `Commits: ${data.totals.commits} (${deltaText})`,
        `Active days: ${data.totals.activeDays}/7`,
        `Best habit: ${data.bestHabit ?? "—"}`,
        "",
        data.insight,
        "",
        ...data.habits.slice(0, 8).map((h) => `- ${h.name}: ${h.commits} this week, ${h.previous} last week, ${h.currentStreak}d streak`),
        ...(data.articles.length ? ["", "Further reading:", ...data.articles.map((a) => `- KB${a.id} ${a.title}: ${a.url}`)] : []),
        "",
        `Dashboard: ${dashboard}`,
        "Turn weekly reports off in Settings.",
    ].join("\n");

    return { subject: `Your haGIT week: ${data.totals.commits} commit${data.totals.commits === 1 ? "" : "s"} · ${data.week.label}`, html, text };
}
