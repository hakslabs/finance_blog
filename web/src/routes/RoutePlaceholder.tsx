import { Card } from "../components/primitives/Card";
import { EmptyState } from "../components/primitives/EmptyState";
import { PageContainer } from "../components/layout/PageContainer";

type RoutePlaceholderProps = {
  title: string;
  eyebrow: string;
  description: string;
};

export function RoutePlaceholder({
  title,
  eyebrow,
  description,
}: RoutePlaceholderProps) {
  return (
    <PageContainer eyebrow={eyebrow} title={title} description={description}>
      <Card>
        <EmptyState
          title="화면 구성 대기 중"
          description="PR-03부터 각 와이어프레임에 맞춰 실제 섹션을 채웁니다."
        />
      </Card>
    </PageContainer>
  );
}
