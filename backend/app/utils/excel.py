import openpyxl
from typing import List, Dict, Any

def read_xlsx(file_path: str) -> List[Dict[str, Any]]:
    """
    Reads an Excel .xlsx file and returns a list of rows as dictionaries.
    Each dictionary maps column names to cell values.
    """
    wb = openpyxl.load_workbook(file_path, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h) for h in rows[0]]
    result = []
    for row in rows[1:]:
        result.append({headers[i]: row[i] for i in range(len(headers))})
    wb.close()
    return result
