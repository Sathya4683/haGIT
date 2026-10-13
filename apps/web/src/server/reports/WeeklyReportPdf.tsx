import path from "node:path";
import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { BASE_LIGHT, getPalette, rgbToHex } from "@/lib/palettes";
import type { WeeklyReportData } from "./weekly-data";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let fontsRegistered = false;

function registerFonts() {
    if (fontsRegistered) return;
    Font.register({
        family: "Inter",
        fonts: [
            { src: path.join(FONT_DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
            { src: path.join(FONT_DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
            { src: path.join(FONT_DIR, "inter-latin-900-normal.woff"), fontWeight: 900 },
        ],
    });
    Font.register({ family: "JetBrains Mono", src: path.join(FONT_DIR, "jetbrains-mono-latin-700-normal.woff") });
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
}

function theme(paletteId: string) {
    const p = getPalette(paletteId);
    const s = p.light ?? BASE_LIGHT;
    return {
        brand: rgbToHex(p.brand[500]),
        brandDark: rgbToHex(p.brand[700]),
        brandSoft: rgbToHex(p.brand[100]),
        brandScale: [p.brand[100], p.brand[300], p.brand[500], p.brand[700]].map(rgbToHex),
        paper: rgbToHex(s.paper),
        paperAlt: rgbToHex(s.paperAlt),
        ink: rgbToHex(s.ink),
        muted: rgbToHex(s.inkMuted),
        card: rgbToHex(s.card),
    };
}

type Theme = ReturnType<typeof theme>;

function makeStyles(t: Theme) {
    return StyleSheet.create({
        page: { backgroundColor: t.paper, color: t.ink, fontFamily: "Inter", fontSize: 9, padding: 36, paddingBottom: 48 },
        row: { flexDirection: "row" },
        label: { fontSize: 7, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase", color: t.muted },
        mono: { fontFamily: "JetBrains Mono" },
        card: { borderWidth: 2, borderColor: t.ink, backgroundColor: t.card, padding: 10 },
        shadow: { position: "absolute", top: 3, left: 3, right: -3, bottom: -3, backgroundColor: t.ink },
    });
}

/** A card with the hard offset shadow used across haGIT. */
function Box({ s, style, children }: { s: ReturnType<typeof makeStyles>; style?: Style; children: React.ReactNode }) {
    return (
        <View style={[{ position: "relative" }, style ?? {}]}>
            <View style={s.shadow} />
            <View style={[s.card, { flexGrow: 1 }]}>{children}</View>
        </View>
    );
}

function delta(commits: number, previous: number) {
    const d = commits - previous;
    if (d === 0) return "same as last week";
    return `${d > 0 ? "+" : "−"}${Math.abs(d)} vs last week`;
}

export function WeeklyReportPdf({ data }: { data: WeeklyReportData }) {
    registerFonts();
    const t = theme(data.palette);
    const s = makeStyles(t);
    const maxDay = Math.max(1, ...data.days.map((d) => d.count));
    const topStreak = [...data.habits].sort((a, b) => b.currentStreak - a.currentStreak)[0];
    const shade = (count: number) => (count === 0 ? t.paperAlt : t.brandScale[Math.min(3, count - 1)]);
    const weeks = Array.from({ length: data.heatmap.length / 7 }, (_, w) => data.heatmap.slice(w * 7, w * 7 + 7));

    const stats: { label: string; value: string; sub: string }[] = [
        { label: "Commits", value: String(data.totals.commits), sub: delta(data.totals.commits, data.totals.previous) },
        { label: "Active days", value: `${data.totals.activeDays}/7`, sub: data.totals.activeDays === 7 ? "every single day" : "days with a commit" },
        { label: "Best habit", value: data.bestHabit ?? "—", sub: data.bestHabit ? `${data.habits[0].commits} commits` : "no commits yet" },
        { label: "Top streak", value: topStreak ? `${topStreak.currentStreak}d` : "0d", sub: topStreak?.currentStreak ? topStreak.name : "start one today" },
    ];

    return (
        <Document title={`haGIT weekly report ${data.week.key}`} author="haGIT">
            <Page size="A4" style={s.page}>
                {/* Header */}
                <View style={[s.row, { alignItems: "center", marginBottom: 18 }]}>
                    <View style={{ width: 22, height: 22, backgroundColor: t.brand, borderWidth: 2, borderColor: t.ink, alignItems: "center", justifyContent: "center" }}>
                        <Text style={[s.mono, { color: "#ffffff", fontSize: 8 }]}>hG</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: 900, marginLeft: 7 }}>haGIT</Text>
                    <View style={{ flexGrow: 1 }} />
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={s.label}>Weekly report · {data.week.key}</Text>
                        <Text style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{data.week.label}</Text>
                    </View>
                </View>

                <Text style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>Your week in commits</Text>
                <View style={{ width: 44, height: 3, backgroundColor: t.brand, marginTop: 6, marginBottom: 14 }} />

                {/* Stat tiles */}
                <View style={[s.row, { marginBottom: 16 }]}>
                    {stats.map((st, i) => (
                        <Box key={st.label} s={s} style={{ flex: 1, marginRight: i < stats.length - 1 ? 10 : 3 }}>
                            <Text style={s.label}>{st.label}</Text>
                            <Text style={[st.label === "Best habit" ? {} : s.mono, { fontSize: st.value.length > 10 ? 13 : 20, fontWeight: 900, marginTop: 5 }]}>
                                {st.value}
                            </Text>
                            <Text style={{ fontSize: 7.5, color: t.muted, marginTop: 4 }}>{st.sub}</Text>
                        </Box>
                    ))}
                </View>

                {/* Week bars + heatmap */}
                <View style={[s.row, { marginBottom: 16 }]}>
                    <Box s={s} style={{ flex: 1.1, marginRight: 12 }}>
                        <Text style={s.label}>This week</Text>
                        <View style={[s.row, { alignItems: "flex-end", height: 84, marginTop: 8 }]}>
                            {data.days.map((d) => (
                                <View key={d.date} style={{ flex: 1, alignItems: "center" }}>
                                    <Text style={[s.mono, { fontSize: 7, marginBottom: 2 }]}>{d.count || ""}</Text>
                                    <View style={{ width: 18, height: Math.max(3, (d.count / maxDay) * 70), backgroundColor: d.count ? t.brand : t.paperAlt, borderWidth: d.count ? 1.5 : 0, borderColor: t.ink }} />
                                </View>
                            ))}
                        </View>
                        <View style={[s.row, { marginTop: 4 }]}>
                            {data.days.map((d) => (
                                <Text key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 7, fontWeight: 700, color: t.muted }}>{d.weekday.slice(0, 3)}</Text>
                            ))}
                        </View>
                    </Box>
                    <Box s={s} style={{ flex: 1, marginRight: 3 }}>
                        <Text style={s.label}>Last 12 weeks</Text>
                        <View style={[s.row, { marginTop: 10 }]}>
                            {weeks.map((week, wi) => (
                                <View key={wi} style={{ marginRight: 3 }}>
                                    {week.map((d) => (
                                        <View key={d.date} style={{ width: 11, height: 11, marginBottom: 3, backgroundColor: shade(d.count), borderWidth: d.count ? 0 : 0.75, borderColor: t.muted }} />
                                    ))}
                                </View>
                            ))}
                        </View>
                    </Box>
                </View>

                {/* Habits */}
                <Box s={s} style={{ marginBottom: 16, marginRight: 3 }}>
                    <Text style={[s.label, { marginBottom: 6 }]}>Habits</Text>
                    {data.habits.length === 0 && <Text style={{ color: t.muted }}>No habits yet.</Text>}
                    {data.habits.slice(0, 8).map((h, i) => {
                        const max = Math.max(1, data.habits[0]?.commits ?? 1);
                        return (
                            <View key={h.name} style={[s.row, { alignItems: "center", paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderTopColor: t.paperAlt, borderStyle: "dashed" }]}>
                                <Text style={[s.mono, { width: 16, fontSize: 7, color: t.muted }]}>{String(i + 1).padStart(2, "0")}</Text>
                                <Text style={{ width: 120, fontWeight: 700 }}>{h.name}</Text>
                                <View style={{ flexGrow: 1, height: 5, backgroundColor: t.paperAlt, marginRight: 10 }}>
                                    <View style={{ width: `${(h.commits / max) * 100}%`, height: 5, backgroundColor: t.brand }} />
                                </View>
                                <Text style={[s.mono, { width: 64, fontSize: 8, textAlign: "right" }]}>{h.commits} <Text style={{ color: t.muted }}>/ {h.previous}</Text></Text>
                                <Text style={[s.mono, { width: 70, fontSize: 8, textAlign: "right", color: t.muted }]}>streak {h.currentStreak}d</Text>
                            </View>
                        );
                    })}
                    <Text style={{ fontSize: 6.5, color: t.muted, marginTop: 4 }}>Commits this week / last week · current streak in days</Text>
                </Box>

                {/* Insight */}
                <View style={{ backgroundColor: t.brandSoft, borderLeftWidth: 4, borderLeftColor: t.brand, padding: 12, marginBottom: 16 }}>
                    <Text style={[s.label, { color: t.brandDark, marginBottom: 4 }]}>Coach&apos;s note</Text>
                    <Text style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.45 }}>{data.insight}</Text>
                </View>

                {/* Further reading */}
                {data.articles.length > 0 && (
                    <View>
                        <Text style={[s.label, { marginBottom: 8 }]}>Further reading from the habit library</Text>
                        {/* Keep the report to one page: fewer links when the habits table is long. */}
                        {data.articles.slice(0, data.habits.length > 6 ? 2 : 3).map((a) => (
                            <Link key={a.id} src={a.url} style={{ textDecoration: "none", color: t.ink, marginBottom: 8 }}>
                                <View style={[s.row, { alignItems: "flex-start" }]}>
                                    <Text style={[s.mono, { fontSize: 7, width: 32, textAlign: "center", borderWidth: 1.5, borderColor: t.ink, paddingVertical: 1, marginRight: 8 }]}>KB{a.id}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 900, fontSize: 10 }}>{a.title}</Text>
                                        <Text style={{ fontSize: 8, color: t.muted, marginTop: 2 }}>{a.summary}</Text>
                                    </View>
                                </View>
                            </Link>
                        ))}
                    </View>
                )}

                <Text
                    fixed
                    style={{ position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 7, color: t.muted, textAlign: "center" }}
                >
                    Generated by haGIT for {data.email} · Turn weekly reports off in Settings
                </Text>
            </Page>
        </Document>
    );
}
