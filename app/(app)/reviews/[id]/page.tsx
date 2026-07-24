import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { getPerformanceReview, getProviderReviewHistory } from "@/lib/reviewsData";
import { getRoleTargets } from "@/lib/clinicData";
import { ReviewDetailView } from "@/components/reviews/ReviewDetailView";
import { ROLE_LABELS } from "@/lib/providerSchema";
import { getEffectiveTargets } from "@/lib/defaultTargets";
import { reviewCadenceMonths } from "@/lib/performanceReview";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { review, provider } = await getPerformanceReview(id);
  if (!review || !provider) notFound();

  const [history, roleTargets] = await Promise.all([getProviderReviewHistory(provider.id, id), getRoleTargets()]);
  const targets = getEffectiveTargets(provider, roleTargets);

  return (
    <>
      <PageHeader
        title={`Performance Review — ${provider.name}`}
        subtitle={ROLE_LABELS[provider.role]}
        backTo="history"
        showWeekSelector={false}
      />
      <ReviewDetailView
        review={review}
        provider={provider}
        history={history}
        cadenceMonths={reviewCadenceMonths(provider)}
        targets={targets}
      />
    </>
  );
}
