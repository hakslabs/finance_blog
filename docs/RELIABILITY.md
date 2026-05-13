# Reliability

## Reliability Concerns

Finance_lab depends on external market, macro, filing, and report data. Data freshness and ingestion visibility matter more than perfect real-time updates in the MVP.

## Scheduled Updates

Scheduled jobs should track:

- Source name.
- Job start and finish timestamps.
- Success or failure status.
- Imported row count.
- Error summary.
- Last successful refresh.

## Failure Handling

- Failed source updates should not break the dashboard.
- Show stale data with last-updated timestamps when fresh data is unavailable.
- Make import jobs idempotent where possible.
- Separate raw source records from normalized app records.

## Future Hosting

The project may move backend and database workloads to a personal NAS or self-hosted server. Keep external service assumptions documented, especially storage, cron, auth, and database-specific features.
