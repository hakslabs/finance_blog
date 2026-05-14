from fastapi import APIRouter

from app.models.dashboard import DashboardExampleResponse, build_dashboard_example


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/example", response_model=DashboardExampleResponse)
def dashboard_example() -> DashboardExampleResponse:
    return build_dashboard_example()
