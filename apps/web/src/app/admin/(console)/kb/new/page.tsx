import { can } from "@/lib/permissions";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { Forbidden, PageHeader } from "@/components/admin/ui";
import { adminBasePath, getAdminActor } from "@/server/admin/session";

export default async function NewArticlePage() {
    const actor = (await getAdminActor())!;
    if (!can(actor.role, "kb:write")) return <Forbidden />;
    return (
        <>
            <PageHeader title="New article" description="Write in Markdown or upload a .md file with frontmatter." />
            <ArticleEditor base={adminBasePath()} />
        </>
    );
}
