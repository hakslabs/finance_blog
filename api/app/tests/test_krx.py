from datetime import date

from app.sources import krx


def test_etf_ohlcv_rows_keep_kodex_symbol() -> None:
    rows = [
        {
            "ISU_CD": "069500",
            "ISU_NM": "KODEX 200",
            "TDD_OPNPRC": "43,000",
            "TDD_HGPRC": "43,645",
            "TDD_LWPRC": "42,955",
            "TDD_CLSPRC": "43,025",
            "ACC_TRDVOL": "13,469,700",
        }
    ]

    parsed = krx._parse_ohlcv_rows(rows, date(2026, 7, 10))

    assert parsed == [
        {
            "symbol": "069500.KS",
            "name": "KODEX 200",
            "exchange": "KRX",
            "date": "2026-07-10",
            "o": 43000.0,
            "h": 43645.0,
            "l": 42955.0,
            "c": 43025.0,
            "v": 13469700,
            "market": None,
        }
    ]
