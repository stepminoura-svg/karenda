"""Convert workbook cached values to catalog JSON; never execute VBA.
Usage: python3 scripts/import_excel.py source.xlsm [--output data/catalog.json]
Requires openpyxl==3.1.5. Does not import student names/plans from the source.
"""
import argparse
import datetime
import json
from pathlib import Path
import openpyxl

SCHEMAS = {
    'exams': ('全部', 3, 2, dict(kana=1, university=2, faculty=3, department=4, method=5, exam=6, application=7, result=8, enrollment=9, eiken=10, note=11)),
    'rankings': ('ランキング表', 4, 3, dict(track=0, field=1, rank=2, university=3, label=4, ratio26=5, ratio25=6, ratio24=7, faculty=8, department=9)),
    'campuses': ('立地情報', 3, 1, dict(university=1, kana=2, campus=3, address=4, station=5, line=6, faculties=7)),
    'eiken': ('英検利用入試', 6, 1, dict(university=1, faculty=2, method=3, type=4, english=5, points=6, grade=7, passed=8, total=9, R=10, L=11, W=12, S=13, since=14)),
}

def convert(source):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    year = workbook['コンパネ']['B1'].value
    if not isinstance(year, int) or not 2000 <= year <= 2100:
        raise ValueError('入試年度が不正です')
    result = dict(year=year, source=Path(source).name)
    for key, (sheet, start, check, fields) in SCHEMAS.items():
        values = []
        for number, row in enumerate(workbook[sheet].iter_rows(min_row=start, values_only=True), start):
            if not row[check]:
                continue
            item = {key: row[col] if row[col] is not None else '' for key, col in fields.items()}
            item['id'] = f'{sheet}-{number}'
            values.append(item)
        if not values:
            raise ValueError(f'{sheet} にデータがありません')
        result[key] = values
    workbook.close()
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('--output', default='data/catalog.json')
    args = parser.parse_args()
    catalog = convert(args.source)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(catalog, ensure_ascii=False, default=lambda v: v.isoformat() if isinstance(v, datetime.datetime) else str(v)), encoding='utf8')
    print({key: len(value) for key, value in catalog.items() if isinstance(value, list)})
