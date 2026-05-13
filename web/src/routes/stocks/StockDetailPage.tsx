import { useParams } from "react-router-dom";
import { RoutePlaceholder } from "../RoutePlaceholder";

export function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const displaySymbol = symbol?.toUpperCase() ?? "UNKNOWN";

  return (
    <RoutePlaceholder
      eyebrow="Stock Detail"
      title={`${displaySymbol} 종목 상세`}
      description="가격 블록, 차트, 재무/리포트 탭을 와이어프레임 기준으로 구현할 화면입니다."
    />
  );
}
