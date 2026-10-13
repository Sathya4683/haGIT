"""Entity-relationship diagram of the Prisma schema (Graphviz), as used in the README.

    python3 scripts/prisma-erd.py prisma/schema.prisma /tmp/er.dot
    dot -Tpng -Gdpi=150 /tmp/er.dot -o er.png    # then: convert er.png -resize 1800x -quality 90 assets/readme/data-model.webp

Tables are grouped by area; User is the hub, with sign-in tables to its left and the rest to its right.
"""
import re
import sys

src, out = sys.argv[1], sys.argv[2]
schema = open(src).read()

models, enums = {}, set()
for kind, name, body in re.findall(r"^(model|enum)\s+(\w+)\s*\{(.*?)^\}", schema, re.S | re.M):
    if kind == "enum":
        enums.add(name)
        continue
    fields, block_attrs = [], []
    for raw in body.splitlines():
        line = raw.split("//")[0].strip()
        if not line:
            continue
        if line.startswith("@@"):
            block_attrs.append(line)
            continue
        m = re.match(r"(\w+)\s+([\w\[\]?]+(?:\([^)]*\))?)\s*(.*)", line)
        if m:
            fields.append({"name": m.group(1), "type": m.group(2), "attrs": m.group(3)})
    models[name] = {"fields": fields, "block": block_attrs}

# Relations: fields carrying @relation(fields: [...], references: [...]).
relations, fk_fields = [], {}
for name, m in models.items():
    for f in m["fields"]:
        rel = re.search(r"@relation\((?:[^)]*?)fields:\s*\[(\w+)\][^)]*references:\s*\[(\w+)\]", f["attrs"])
        if rel:
            target = f["type"].rstrip("?")
            relations.append((name, rel.group(1), target, rel.group(2), f["type"].endswith("?")))
            fk_fields.setdefault(name, set()).add(rel.group(1))

def unique_fields(m):
    out = set()
    for f in m["fields"]:
        if "@unique" in f["attrs"]:
            out.add(f["name"])
    return out

# One-to-one when the FK column itself is unique.
def is_one_to_one(model, fk):
    m = models[model]
    is_id = any(f["name"] == fk and "@id" in f["attrs"] for f in m["fields"])
    return is_id or fk in unique_fields(m)

GROUPS = [
    ("Accounts & access", "#e7f5ff", "#1c7ed6", ["User", "Account", "Session", "VerificationToken", "AuditLog"]),
    ("Habits", "#ebfbee", "#2f9e44", ["Habit", "Commit"]),
    ("Knowledge base", "#f3f0ff", "#7048e8", ["KbArticle", "KbChunk"]),
    ("Reminders & jobs", "#fff9db", "#e67700", ["UserPreference", "NotificationLog", "JobRun"]),
]
FONT = "JetBrains Mono, DejaVu Sans Mono, monospace"

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def table(name, header):
    m = models[name]
    fks = fk_fields.get(name, set())
    uniq = unique_fields(m)
    rows = []
    for f in m["fields"]:
        t = f["type"]
        base = t.rstrip("?").replace("[]", "")
        if base in models:  # relation field, not a column
            continue
        if t.startswith("Unsupported"):
            t = "vector(384)"
        is_pk = "@id" in f["attrs"]
        marks = []
        if is_pk:
            marks.append("PK")
        if f["name"] in fks:
            marks.append("FK")
        if f["name"] in uniq and not is_pk:
            marks.append("UQ")
        label = esc(f["name"])
        if is_pk:
            label = f"<B><U>{label}</U></B>"
        elif f["name"] in fks:
            label = f"<I>{label}</I>"
        color = "#1971c2" if base in enums else "#868e96"
        mark = f'<FONT POINT-SIZE="9" COLOR="{header}">{" ".join(marks)}</FONT>' if marks else ""
        rows.append(
            f'<TR><TD ALIGN="LEFT" BORDER="0" CELLPADDING="3">{label}</TD>'
            f'<TD ALIGN="LEFT" BORDER="0" CELLPADDING="3"><FONT COLOR="{color}">{esc(t)}</FONT></TD>'
            f'<TD ALIGN="RIGHT" BORDER="0" CELLPADDING="3">{mark}</TD></TR>'
        )
    return (
        f'"{name}" [label=<<TABLE BORDER="2" COLOR="#343a40" CELLBORDER="0" CELLSPACING="0" BGCOLOR="white">'
        f'<TR><TD COLSPAN="3" BGCOLOR="{header}" CELLPADDING="6"><FONT COLOR="white" POINT-SIZE="13"><B>{name}</B></FONT></TD></TR>'
        + "".join(rows)
        + "</TABLE>>];"
    )

lines = [
    "digraph haGIT {",
    f'  graph [rankdir=LR, splines=spline, nodesep=0.45, ranksep=0.9, newrank=true, pad=0.4, bgcolor="white", fontname="{FONT}"];',
    f'  node [shape=plain, fontname="{FONT}", fontsize=11];',
    f'  edge [color="#495057", penwidth=1.4, fontname="{FONT}", fontsize=9, arrowsize=0.8];',
]
for i, (title, bg, header, names) in enumerate(GROUPS):
    lines.append(f'  subgraph cluster_{i} {{ label=<<B>{esc(title)}</B>>; fontsize=14; fontcolor="{header}"; style="rounded,filled"; color="{header}"; fillcolor="{bg}"; penwidth=1.5; margin=16;')
    for n in names:
        lines.append("    " + table(n, header))
    lines.append("  }")
# User sits in the middle: sign-in and audit tables to its left, everything else to its right.
RIGHT = {"Habit", "Commit", "KbArticle", "KbChunk", "UserPreference", "NotificationLog"}
for child, fk, parent, ref, optional in relations:
    one = is_one_to_one(child, fk)
    parent_end = "teeodot" if optional else "teetee"   # exactly one / zero-or-one parent
    child_end = "teetee" if one else "crowodot"        # one / zero-or-many children
    tip = f"{child}.{fk} → {parent}.{ref}"
    if child in RIGHT:
        lines.append(f'  "{parent}":e -> "{child}":w [arrowtail={parent_end}, arrowhead={child_end}, dir=both, tooltip="{tip}"];')
    else:
        lines.append(f'  "{child}":e -> "{parent}":w [arrowhead={parent_end}, arrowtail={child_end}, dir=both, tooltip="{tip}"];')
lines.append("}")
open(out, "w").write("\n".join(lines))
print(f"{len(models)} models, {len(relations)} relations, {len(enums)} enums")
