import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-8xl font-bold font-mono-num text-muted-foreground/20">
        404
      </div>
      <div>
        <h1 className="text-2xl font-bold font-['Outfit']">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-muted-foreground mt-2">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
      </div>
      <Link href="/">
        <Button className="gap-2">
          <Home size={16} />
          홈으로 돌아가기
        </Button>
      </Link>
    </div>
  );
}
