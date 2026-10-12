import { DEFAULT_RANK_OPTIONS } from "@hagit/kb";
import { can } from "@/lib/permissions";
import { Forbidden, PageHeader } from "@/components/admin/ui";
import { RetrievalPlayground } from "@/components/admin/RetrievalPlayground";
import { getAdminActor } from "@/server/admin/session";

export default async function PlaygroundPage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "kb:write")) return <Forbidden />;
    return (
        <>
            <PageHeader
                title="Retrieval playground"
                description="See how a question is ranked: dense similarity (pgvector) and full-text matches fused with reciprocal rank fusion, then filtered and diversified."
            />
            <RetrievalPlayground options={DEFAULT_RANK_OPTIONS} />
        </>
    );
}
