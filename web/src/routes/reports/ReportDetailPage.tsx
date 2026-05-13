import { useParams } from "react-router-dom";
import { RoutePlaceholder } from "../RoutePlaceholder";

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <RoutePlaceholder
      eyebrow="Report Detail"
      title={`리포트 ${id ?? "상세"}`}
      description="원문 출처, 핵심 요약, 관련 종목 정보를 표시할 상세 화면입니다."
    />
  );
}
